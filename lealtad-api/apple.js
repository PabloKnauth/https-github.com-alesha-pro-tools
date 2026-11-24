// Apple Wallet: .pkpass firmado y avisos push (APNs) a los iPhone que tienen el pase.
// La firma RSA se hace con WebCrypto (nativa y rápida); node-forge solo arma la estructura PKCS#7.
import forgeMod from "./forge.min.js";
import { IMAGENES } from "./imagenes.js";
import { TEMAS, rgbTexto, temaDe } from "./temas.js";
import { cfg, kv, resumen, promoActual, ubicacion, franjaRuta, BASE_RUTA, NEGOCIO, SELLOS_META } from "./nucleo.js";

const forge = forgeMod.default || forgeMod;
const pemCert = (env) => cfg(env, "APPLE_PASS_CERT_PEM"), pemLlave = (env) => cfg(env, "APPLE_PASS_KEY_PEM");
export const appleListo = (env) => !!(cfg(env, "APPLE_PASS_TYPE_ID") && cfg(env, "APPLE_TEAM_ID") && cfg(env, "APPLE_WWDR_PEM")
  && ((pemCert(env) && pemLlave(env)) || cfg(env, "APPLE_PASS_CERT_P12")));

const nl = (s) => s.replace(/\\n/g, "\n");
const binario = (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode(...u8.subarray(i, i + 8192)); return s; };
const deBinario = (s) => Uint8Array.from(s, (c) => c.charCodeAt(0));
const deB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const hex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");

let cache;
async function credenciales(env) {
  if (cache) return cache;
  let cert, llaveForge, pkcs8;
  if (pemCert(env) && pemLlave(env)) { // recomendado: certificado y llave en PEM (sin descifrar un .p12 en cada arranque)
    cert = forge.pki.certificateFromPem(nl(pemCert(env)));
    const pem = nl(pemLlave(env));
    if (/BEGIN PRIVATE KEY/.test(pem)) pkcs8 = deB64(pem.replace(/-----[^-]+-----|\s/g, ""));
    else llaveForge = forge.pki.privateKeyFromPem(pem);
  } else {
    const p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(forge.util.decode64(cfg(env, "APPLE_PASS_CERT_P12"))), cfg(env, "APPLE_PASS_CERT_PASS"));
    cert = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag][0].cert;
    llaveForge = (p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]
      || p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag][0]).key;
  }
  if (!pkcs8) pkcs8 = deBinario(forge.asn1.toDer(forge.pki.wrapRsaPrivateKey(forge.pki.privateKeyToAsn1(llaveForge))).getBytes());
  const llave = await crypto.subtle.importKey("pkcs8", pkcs8, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const wwdr = forge.pki.certificateFromPem(nl(cfg(env, "APPLE_WWDR_PEM")));
  return (cache = { cert, llave, wwdr, bytesFirma: Math.ceil(cert.publicKey.n.bitLength() / 8) });
}

export async function passJson(env, t, base) {
  const r = resumen(t, env), u = ubicacion(env), promo = await promoActual(env), T = TEMAS[temaDe(t)];
  return {
    formatVersion: 1,
    passTypeIdentifier: cfg(env, "APPLE_PASS_TYPE_ID"),
    teamIdentifier: cfg(env, "APPLE_TEAM_ID"),
    serialNumber: t.id,
    authenticationToken: t.tokenApple,
    webServiceURL: base + "/api/apple",
    organizationName: NEGOCIO,
    description: `Tarjeta de lealtad ${NEGOCIO}`,
    logoText: "Lealtad",
    backgroundColor: rgbTexto(T.fondo), foregroundColor: rgbTexto(T.texto), labelColor: rgbTexto(T.etiqueta),
    barcodes: [{ format: "PKBarcodeFormatQR", message: `${base}/panel.html#${t.id}`, messageEncoding: "iso-8859-1", altText: t.codigo }],
    locations: [{ latitude: u.lat, longitude: u.lng, relevantText: "Estás cerca de Moto Roka. ¿Toca servicio? Muestra tu tarjeta." }],
    maxDistance: 300,
    storeCard: {
      headerFields: [{ key: "sellos", label: "SELLOS", value: r.progreso, changeMessage: "Tu tarjeta Moto Roka: %@ sellos" }],
      secondaryFields: [
        { key: "nombre", label: "CLIENTE", value: t.nombre },
        { key: "estado", label: "SERVICIO GRATIS", value: r.listo ? "¡Listo para usar!" : `En ${SELLOS_META - r.sellos} ${SELLOS_META - r.sellos === 1 ? "servicio" : "servicios"}`, changeMessage: "%@" },
      ],
      auxiliaryFields: [{ key: "cumple", label: "CUMPLEAÑOS", value: r.textoCumple, changeMessage: "%@" }],
      backFields: [
        { key: "promo", label: "PROMOCIÓN", value: promo ? `${promo.titulo}\n${promo.texto}` : "Pronto tendremos promociones para ti.", changeMessage: "%@" },
        { key: "regla", label: "CÓMO FUNCIONA", value: `Cada servicio suma un sello. Al juntar ${SELLOS_META} sellos, tu 5.º Servicio Express es gratis. En tu cumpleaños tienes 20% de descuento en accesorios (30 días). Muestra esta tarjeta en el mostrador.` },
        { key: "codigo", label: "TARJETA", value: t.codigo },
        { key: "contacto", label: "WHATSAPP", value: "722 666 5997" },
        { key: "web", label: "MI TARJETA (personalízala aquí)", value: `${base}/tarjeta.html#${t.id}` },
      ],
    },
  };
}

// ZIP sin compresión (método 0): Apple solo exige un ZIP estándar.
const TABLA = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (b) => { let c = 0xffffffff; for (const x of b) c = TABLA[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function zip(archivos) {
  const partes = [], centrales = [], enc = new TextEncoder();
  let pos = 0, n = 0;
  for (const [nombre, datos] of Object.entries(archivos)) {
    const nb = enc.encode(nombre), c = crc32(datos), loc = new DataView(new ArrayBuffer(30)), cen = new DataView(new ArrayBuffer(46));
    loc.setUint32(0, 0x04034b50, true); loc.setUint16(4, 10, true); loc.setUint32(14, c, true);
    loc.setUint32(18, datos.length, true); loc.setUint32(22, datos.length, true); loc.setUint16(26, nb.length, true);
    cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 10, true); cen.setUint32(16, c, true);
    cen.setUint32(20, datos.length, true); cen.setUint32(24, datos.length, true); cen.setUint16(28, nb.length, true); cen.setUint32(42, pos, true);
    partes.push(new Uint8Array(loc.buffer), nb, datos); centrales.push(new Uint8Array(cen.buffer), nb);
    pos += 30 + nb.length + datos.length; n++;
  }
  const tam = centrales.reduce((s, b) => s + b.length, 0), fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, n, true); fin.setUint16(10, n, true); fin.setUint32(12, tam, true); fin.setUint32(16, pos, true);
  const todo = [...partes, ...centrales, new Uint8Array(fin.buffer)], out = new Uint8Array(todo.reduce((s, b) => s + b.length, 0));
  let o = 0; for (const b of todo) { out.set(b, o); o += b.length; }
  return out;
}

// PKCS#7 desprendido: forge arma la estructura con una firma de relleno y WebCrypto firma los atributos.
async function firma(env, manifiesto) {
  const { cert, llave, wwdr, bytesFirma } = await credenciales(env);
  const relleno = String.fromCharCode(0xa5).repeat(bytesFirma);
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(binario(manifiesto));
  p7.addCertificate(cert); p7.addCertificate(wwdr);
  p7.addSigner({ key: { sign: () => relleno }, certificate: cert, digestAlgorithm: forge.pki.oids.sha256, authenticatedAttributes: [
    { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
    { type: forge.pki.oids.messageDigest },
    { type: forge.pki.oids.signingTime, value: new Date() },
  ] });
  // forge crea los digestores dentro de sign(): se envuelven para guardar lo último que se digiere (el SET de atributos).
  const crear = forge.md.sha256.create;
  let atributos = null;
  forge.md.sha256.create = function () { const m = crear(), u = m.update; m.update = function (b) { atributos = b; return u.call(this, b); }; return m; };
  try { p7.sign({ detached: true }); } finally { forge.md.sha256.create = crear; }
  const der = forge.asn1.toDer(p7.toAsn1()).getBytes(), i = der.indexOf(relleno);
  if (i < 0 || der.indexOf(relleno, i + 1) >= 0) throw new Error("PKCS#7: no se pudo ubicar la firma");
  const sig = binario(new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", llave, deBinario(atributos))));
  return deBinario(der.slice(0, i) + sig + der.slice(i + bytesFirma));
}

async function franjaPng(env, t, base) {
  const ruta = BASE_RUTA + franjaRuta(t, "a");
  const r = env.ASSETS ? await env.ASSETS.fetch(new URL(ruta, base)) : await fetch(new URL(ruta, base));
  if (!r.ok) throw new Error("franja " + r.status);
  return new Uint8Array(await r.arrayBuffer());
}

export async function crearPase(env, t, base) {
  const archivos = { "pass.json": new TextEncoder().encode(JSON.stringify(await passJson(env, t, base))) };
  for (const [k, v] of Object.entries(IMAGENES)) archivos[k] = deB64(v);
  archivos["strip@2x.png"] = await franjaPng(env, t, base);
  const hashes = {};
  for (const [k, v] of Object.entries(archivos)) hashes[k] = hex(await crypto.subtle.digest("SHA-1", v));
  archivos["manifest.json"] = new TextEncoder().encode(JSON.stringify(hashes));
  archivos["signature"] = await firma(env, archivos["manifest.json"]);
  return zip(archivos);
}

// ---- Registro de iPhones ----
export const dispositivosDe = async (env, serial) => (await kv(env).get("apple/pase/" + serial, "json")) || {};
export const guardarDispositivos = (env, serial, d) => kv(env).put("apple/pase/" + serial, JSON.stringify(d));

// Push vacío: Wallet descarga el pase nuevo y muestra el changeMessage.
// APNs exige el certificado del Pass Type ID como certificado de cliente: en Cloudflare se sube con
// `wrangler mtls-certificate upload` y se enlaza como APNS_CERT. Sin ese enlace no se envía push (pendiente de verificar).
export async function avisarApple(env, seriales) {
  if (!appleListo(env) || !env.APNS_CERT || !seriales.length) return { enviados: 0, motivo: env.APNS_CERT ? undefined : "sin APNS_CERT" };
  const tokens = new Set();
  for (const s of seriales) for (const tk of Object.values(await dispositivosDe(env, s))) tokens.add(tk);
  let enviados = 0;
  await Promise.all([...tokens].map(async (tk) => {
    try {
      const r = await env.APNS_CERT.fetch("https://api.push.apple.com/3/device/" + tk, { method: "POST", body: "{}",
        headers: { "apns-topic": cfg(env, "APPLE_PASS_TYPE_ID"), "apns-push-type": "background", "apns-priority": "5" } });
      if (r.ok) enviados++; else console.warn("APNs", r.status, await r.text());
    } catch (e) { console.error("APNs", e?.message || e); }
  }));
  return { enviados, intentos: tokens.size };
}
