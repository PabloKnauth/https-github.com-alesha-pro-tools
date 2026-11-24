// Apple Wallet: .pkpass firmado y avisos push (APNs) a los iPhone que tienen el pase.
import forgeMod from "./forge.min.js";
import { IMAGENES } from "./imagenes.js";
import { cfg, kv, resumen, promoActual, ubicacion, NEGOCIO, RECOMPENSA, SELLOS_META } from "./nucleo.js";

const forge = forgeMod.default || forgeMod;
export const appleListo = (env) => ["APPLE_PASS_TYPE_ID", "APPLE_TEAM_ID", "APPLE_PASS_CERT_P12", "APPLE_WWDR_PEM"].every((k) => cfg(env, k));

let cache;
function credenciales(env) {
  if (cache) return cache;
  const p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(forge.util.decode64(cfg(env, "APPLE_PASS_CERT_P12"))), cfg(env, "APPLE_PASS_CERT_PASS"));
  const cert = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag][0].cert;
  const bolsa = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]
    || p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag][0];
  const wwdr = forge.pki.certificateFromPem(cfg(env, "APPLE_WWDR_PEM").replace(/\\n/g, "\n"));
  return (cache = { cert, llave: bolsa.key, wwdr });
}

export async function passJson(env, t, base) {
  const r = resumen(t, env), u = ubicacion(env), promo = await promoActual(env);
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
    backgroundColor: "rgb(11,13,18)", foregroundColor: "rgb(255,255,255)", labelColor: "rgb(138,151,255)",
    barcodes: [{ format: "PKBarcodeFormatQR", message: `${base}/panel.html#${t.id}`, messageEncoding: "iso-8859-1", altText: t.codigo }],
    locations: [{ latitude: u.lat, longitude: u.lng, relevantText: "Estás cerca de Moto Roka. ¿Toca servicio? Muestra tu tarjeta." }],
    maxDistance: 300,
    storeCard: {
      headerFields: [{ key: "codigo", label: "TARJETA", value: t.codigo }],
      primaryFields: [{ key: "sellos", label: "SELLOS", value: r.puntos, changeMessage: "Tu tarjeta Moto Roka ahora tiene %@" }],
      secondaryFields: [
        { key: "nombre", label: "CLIENTE", value: t.nombre },
        { key: "estado", label: "PROGRESO", value: r.estado, changeMessage: "%@" },
      ],
      auxiliaryFields: [{ key: "cumple", label: "CUMPLEAÑOS", value: r.textoCumple, changeMessage: "%@" }],
      backFields: [
        { key: "promo", label: "PROMOCIÓN", value: promo ? `${promo.titulo}\n${promo.texto}` : "Pronto tendremos promociones para ti.", changeMessage: "%@" },
        { key: "regla", label: "CÓMO FUNCIONA", value: `Cada servicio suma un sello. Al juntar ${SELLOS_META} sellos, tu siguiente servicio es un ${RECOMPENSA}. En tu cumpleaños tienes 20% de descuento en accesorios (30 días). Muestra esta tarjeta en el mostrador.` },
        { key: "contacto", label: "WHATSAPP", value: "722 666 5997" },
        { key: "web", label: "MI TARJETA", value: `${base}/tarjeta.html#${t.id}` },
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

const binario = (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode(...u8.subarray(i, i + 8192)); return s; };
const deBinario = (s) => Uint8Array.from(s, (c) => c.charCodeAt(0));
const deB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const hex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");

function firma(env, manifiesto) {
  const { cert, llave, wwdr } = credenciales(env), p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(binario(manifiesto));
  p7.addCertificate(cert); p7.addCertificate(wwdr);
  p7.addSigner({ key: llave, certificate: cert, digestAlgorithm: forge.pki.oids.sha256, authenticatedAttributes: [
    { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
    { type: forge.pki.oids.messageDigest },
    { type: forge.pki.oids.signingTime, value: new Date() },
  ] });
  p7.sign({ detached: true });
  return deBinario(forge.asn1.toDer(p7.toAsn1()).getBytes());
}

export async function crearPase(env, t, base) {
  const archivos = { "pass.json": new TextEncoder().encode(JSON.stringify(await passJson(env, t, base))) };
  for (const [k, v] of Object.entries(IMAGENES)) archivos[k] = deB64(v);
  const hashes = {};
  for (const [k, v] of Object.entries(archivos)) hashes[k] = hex(await crypto.subtle.digest("SHA-1", v));
  archivos["manifest.json"] = new TextEncoder().encode(JSON.stringify(hashes));
  archivos["signature"] = firma(env, archivos["manifest.json"]);
  return zip(archivos);
}

// ---- Registro de iPhones ----
export const dispositivosDe = async (env, serial) => (await kv(env).get("apple/pase/" + serial, "json")) || {};
export const guardarDispositivos = (env, serial, d) => kv(env).put("apple/pase/" + serial, JSON.stringify(d));

// Push vacío: Wallet descarga el pase nuevo y muestra el changeMessage.
// APNs exige el certificado del Pass Type ID como certificado de cliente: en Cloudflare se sube con
// `wrangler mtls-certificate upload` y se enlaza al proyecto como APNS_CERT. Sin ese enlace no se envía push.
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
