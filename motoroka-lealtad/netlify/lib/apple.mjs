// Apple Wallet: construcción y firma del .pkpass, y avisos push (APNs) a los pases instalados.
import { createHash } from "node:crypto";
import { deflateRawSync, crc32 } from "node:zlib";
import http2 from "node:http2";
import forge from "node-forge";
import { IMAGENES } from "./imagenes.mjs";
import { env, almacen, resumen, promoActual, ubicacion, NEGOCIO, RECOMPENSA, SELLOS_META } from "./nucleo.mjs";

export const appleListo = () => !!(env("APPLE_PASS_TYPE_ID") && env("APPLE_TEAM_ID") && env("APPLE_PASS_CERT_P12") && env("APPLE_WWDR_PEM"));

let credCache;
function credenciales() {
  if (credCache) return credCache;
  const p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(forge.util.decode64(env("APPLE_PASS_CERT_P12"))), env("APPLE_PASS_CERT_PASS"));
  const cert = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag][0].cert;
  const llave = (p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]
    || p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag][0]).key;
  const wwdr = forge.pki.certificateFromPem(env("APPLE_WWDR_PEM").replace(/\\n/g, "\n"));
  return (credCache = { cert, llave, wwdr, certPem: forge.pki.certificateToPem(cert), llavePem: forge.pki.privateKeyToPem(llave) });
}

export function passJson(t, promo, base) {
  const r = resumen(t), u = ubicacion();
  const pase = {
    formatVersion: 1,
    passTypeIdentifier: env("APPLE_PASS_TYPE_ID"),
    teamIdentifier: env("APPLE_TEAM_ID"),
    serialNumber: t.id,
    authenticationToken: t.tokenApple,
    webServiceURL: base + "/api/apple",
    organizationName: NEGOCIO,
    description: `Tarjeta de lealtad ${NEGOCIO}`,
    logoText: "Lealtad",
    backgroundColor: "rgb(11,13,18)",
    foregroundColor: "rgb(255,255,255)",
    labelColor: "rgb(138,151,255)",
    barcodes: [{ format: "PKBarcodeFormatQR", message: `${base}/panel.html#${t.id}`, messageEncoding: "iso-8859-1", altText: t.codigo }],
    storeCard: {
      headerFields: [{ key: "codigo", label: "TARJETA", value: t.codigo }],
      primaryFields: [{ key: "sellos", label: "SELLOS", value: r.puntos, changeMessage: "Tu tarjeta Moto Roka ahora tiene %@" }],
      secondaryFields: [
        { key: "nombre", label: "CLIENTE", value: t.nombre },
        { key: "estado", label: "PROGRESO", value: r.estado, changeMessage: "%@" },
      ],
      backFields: [
        { key: "promo", label: "PROMOCIÓN", value: promo ? `${promo.titulo}\n${promo.texto}` : "Pronto tendremos promociones para ti.", changeMessage: "%@" },
        { key: "regla", label: "CÓMO FUNCIONA", value: `Cada servicio suma un sello. Al juntar ${SELLOS_META} sellos, tu siguiente servicio es un ${RECOMPENSA}. Muestra esta tarjeta en el mostrador.` },
        { key: "contacto", label: "WHATSAPP", value: "722 666 5997" },
        { key: "web", label: "SITIO", value: base + "/tarjeta.html#" + t.id },
      ],
    },
  };
  if (u) pase.locations = [{ latitude: u.lat, longitude: u.lng, relevantText: "Estás cerca de Moto Roka. ¿Toca servicio? Muestra tu tarjeta." }];
  return pase;
}

// ZIP sin dependencias (deflate). Apple solo exige un ZIP estándar.
function zip(archivos) {
  const partes = [], centrales = [];
  let pos = 0;
  for (const [nombre, datos] of Object.entries(archivos)) {
    const n = Buffer.from(nombre), d = deflateRawSync(datos), c = crc32(datos);
    const loc = Buffer.alloc(30);
    loc.writeUInt32LE(0x04034b50, 0); loc.writeUInt16LE(20, 4); loc.writeUInt16LE(8, 8);
    loc.writeUInt32LE(c, 14); loc.writeUInt32LE(d.length, 18); loc.writeUInt32LE(datos.length, 22); loc.writeUInt16LE(n.length, 26);
    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0); cen.writeUInt16LE(20, 4); cen.writeUInt16LE(20, 6); cen.writeUInt16LE(8, 10);
    cen.writeUInt32LE(c, 16); cen.writeUInt32LE(d.length, 20); cen.writeUInt32LE(datos.length, 24); cen.writeUInt16LE(n.length, 28);
    cen.writeUInt32LE(pos, 42);
    partes.push(loc, n, d); centrales.push(cen, n);
    pos += 30 + n.length + d.length;
  }
  const dir = Buffer.concat(centrales), fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0); fin.writeUInt16LE(centrales.length / 2, 8); fin.writeUInt16LE(centrales.length / 2, 10);
  fin.writeUInt32LE(dir.length, 12); fin.writeUInt32LE(pos, 16);
  return Buffer.concat([...partes, dir, fin]);
}

function firma(manifiesto) {
  const { cert, llave, wwdr } = credenciales();
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(manifiesto.toString("binary"));
  p7.addCertificate(cert); p7.addCertificate(wwdr);
  p7.addSigner({
    key: llave, certificate: cert, digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() },
    ],
  });
  p7.sign({ detached: true });
  return Buffer.from(forge.asn1.toDer(p7.toAsn1()).getBytes(), "binary");
}

export async function crearPase(t, base) {
  const archivos = { "pass.json": Buffer.from(JSON.stringify(passJson(t, await promoActual(), base))) };
  for (const [k, v] of Object.entries(IMAGENES)) archivos[k] = Buffer.from(v, "base64");
  const manifiesto = Buffer.from(JSON.stringify(Object.fromEntries(
    Object.entries(archivos).map(([k, v]) => [k, createHash("sha1").update(v).digest("hex")]))));
  archivos["manifest.json"] = manifiesto;
  archivos["signature"] = firma(manifiesto);
  return zip(archivos);
}

// ---- Registro de dispositivos (PassKit web service) ----
export async function dispositivosDe(serial) {
  return (await (await almacen()).get("apple/pase/" + serial, { type: "json" })) || {};
}
export async function guardarDispositivos(serial, d) {
  await (await almacen()).setJSON("apple/pase/" + serial, d);
}

// Avisa a cada iPhone con el pase: Wallet descarga la versión nueva y muestra el changeMessage.
export async function avisarApple(seriales) {
  if (!appleListo() || !seriales.length) return { enviados: 0 };
  const { certPem, llavePem } = credenciales();
  const tokens = [];
  for (const s of seriales) for (const tk of Object.values(await dispositivosDe(s))) tokens.push(tk);
  if (!tokens.length) return { enviados: 0 };
  const cliente = http2.connect("https://api.push.apple.com", { cert: certPem, key: llavePem });
  let enviados = 0, fallo = null;
  cliente.on("error", (e) => { fallo = e; });
  cliente.setTimeout(10000, () => cliente.destroy());
  try {
    await Promise.all([...new Set(tokens)].map((tk) => new Promise((ok) => {
      const r = cliente.request({ ":method": "POST", ":path": "/3/device/" + tk, "apns-topic": env("APPLE_PASS_TYPE_ID"), "apns-push-type": "background", "apns-priority": "5" });
      r.on("response", (h) => { if (h[":status"] === 200) enviados++; });
      r.on("close", ok); r.on("error", ok);
      r.end("{}");
    })));
  } finally { cliente.close(); }
  if (fallo) console.error("APNs", fallo.code || fallo.message);
  return { enviados, intentos: tokens.length };
}
