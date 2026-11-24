// Tarjeta de lealtad Moto Roka (Cloudflare Pages Functions + KV). Núcleo compartido.
// KV "LEALTAD": t/<id> tarjeta · tel/<10 dígitos> · cod/<MR-XXXXXX> · cumple/<MMDD>/<id> · apple/… · config/promo · lim/…

export const SELLOS_META = 5; // 5 sellos = el 6.º Servicio Express gratis
export const RECOMPENSA = "Servicio Express gratis";
export const NEGOCIO = "Moto Roka Fix & Shop";
export const BASE_RUTA = "/lealtad";
export const DIAS_REGALO = 30; // el regalo de cumpleaños vale 30 días desde el cumpleaños
const UBICACION = { lat: 18.9496043, lng: -99.4935796 }; // pin de Google Maps del taller
const ZONA_MX = -6 * 3600e3; // Centro de México, sin horario de verano desde 2022

export const cfg = (env, k) => String(env?.[k] ?? "").trim();
export const regaloTexto = (env) => cfg(env, "REGALO_CUMPLE") || "20% de descuento en accesorios";

export function json(datos, estado = 200, extra = {}) {
  return new Response(JSON.stringify(datos), {
    status: estado,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra },
  });
}
export const vacio = (estado) => new Response(null, { status: estado });

const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export const aleatorio = (n) => b64url(crypto.getRandomValues(new Uint8Array(n)));
export const nuevoId = () => aleatorio(18);
export function nuevoCodigo() {
  const abc = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  return "MR-" + Array.from(crypto.getRandomValues(new Uint8Array(6)), (x) => abc[x % abc.length]).join("");
}
export const idValido = (id) => typeof id === "string" && /^[A-Za-z0-9_-]{20,40}$/.test(id);
export const telNormal = (t) => String(t || "").replace(/\D/g, "").slice(-10);
export const ip = (req) => req.headers.get("cf-connecting-ip") || "x";
export const sitio = (env, req) => (cfg(env, "SITIO_URL").replace(/\/$/, "") || new URL(req.url).origin) + BASE_RUTA;

// "MM-DD" válido o null. Acepta "dd/mm".
export function cumpleNormal(v) {
  const m = String(v || "").trim().match(/^(\d{1,2})[/-](\d{1,2})$/);
  if (!m) return null;
  const [d, mes] = [Number(m[1]), Number(m[2])];
  const dias = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return mes >= 1 && mes <= 12 && d >= 1 && d <= dias[mes - 1] ? `${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}` : null;
}
export const cumpleBonito = (c) => (c ? `${c.slice(3)}/${c.slice(0, 2)}` : "");
export const hoyMX = (ahora = Date.now()) => new Date(ahora + ZONA_MX); // usar getUTC*
const fecha = (d) => `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

// Regalo de cumpleaños: vale DIAS_REGALO días desde el cumpleaños, una vez por año.
export function regaloCumple(t, ahora = Date.now()) {
  if (!t.cumple) return { activo: false };
  const hoy = hoyMX(ahora), [mes, dia] = t.cumple.split("-").map(Number);
  for (const anio of [hoy.getUTCFullYear(), hoy.getUTCFullYear() - 1]) {
    const bisiesto = (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
    const inicio = Date.UTC(anio, mes - 1, mes === 2 && dia === 29 && !bisiesto ? 28 : dia);
    const fin = inicio + DIAS_REGALO * 864e5;
    if (hoy.getTime() >= inicio && hoy.getTime() < fin) {
      return t.cumpleCanje === anio ? { activo: false, entregado: true, anio } : { activo: true, anio, vence: fecha(new Date(fin - 864e5)) };
    }
  }
  return { activo: false };
}

export const puntos = (n) => "●".repeat(n) + "○".repeat(Math.max(0, SELLOS_META - n));
export function resumen(t, env) {
  const listo = t.sellos >= SELLOS_META, r = regaloCumple(t);
  return {
    sellos: t.sellos, meta: SELLOS_META, puntos: puntos(Math.min(t.sellos, SELLOS_META)), listo,
    estado: listo ? "¡Tu próximo Servicio Express es GRATIS!" : `${t.sellos} de ${SELLOS_META} servicios`,
    cumple: cumpleBonito(t.cumple), regalo: r.activo ? { texto: regaloTexto(env), vence: r.vence } : null,
    textoCumple: r.activo ? `¡Feliz cumpleaños! ${regaloTexto(env)} · válido hasta el ${r.vence}`
      : r.entregado ? "Regalo de cumpleaños entregado. ¡Felicidades!"
      : t.cumple ? `Tu regalo de cumpleaños llega el ${cumpleBonito(t.cumple)}` : "Registra tu cumpleaños en el taller y recibe un regalo",
  };
}

export const ubicacion = (env) => {
  const lat = parseFloat(cfg(env, "TALLER_LAT")), lng = parseFloat(cfg(env, "TALLER_LNG"));
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : UBICACION;
};

// ---- KV ----
export const kv = (env) => {
  if (!env.LEALTAD) throw new Error("Falta el enlace KV 'LEALTAD' en el proyecto de Pages.");
  return env.LEALTAD;
};
export async function leerTarjeta(env, id) {
  return idValido(id) ? kv(env).get("t/" + id, "json") : null;
}
export async function guardarTarjeta(env, t) {
  t.act = Date.now();
  await kv(env).put("t/" + t.id, JSON.stringify(t));
  return t;
}
export const promoActual = (env) => kv(env).get("config/promo", "json");
export async function listarClaves(env, prefix) {
  const claves = []; let cursor;
  do {
    const r = await kv(env).list({ prefix, cursor });
    claves.push(...r.keys.map((k) => k.name)); cursor = r.list_complete ? null : r.cursor;
  } while (cursor);
  return claves;
}

// Límite por ventana (KV expira solo la clave).
export async function limitar(env, clave, max, minutos) {
  const k = "lim/" + clave.replace(/[^\w.:-]/g, "_"), n = Number(await kv(env).get(k)) || 0;
  if (n >= max) return false;
  await kv(env).put(k, String(n + 1), { expirationTtl: Math.max(60, minutos * 60) });
  return true;
}

// ---- Firma HMAC y sesión del panel ----
const enc = new TextEncoder();
async function hmac(env, texto) {
  const llave = await crypto.subtle.importKey("raw", enc.encode(cfg(env, "LEALTAD_SECRETO")), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", llave, enc.encode(texto))));
}
export function iguales(a, b) {
  const x = enc.encode(String(a)), y = enc.encode(String(b));
  if (x.length !== y.length) return false;
  let d = 0; for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}
const COOKIE = "mr_panel", HORAS = 12;
export async function cookieSesion(env) {
  const cuerpo = b64url(enc.encode(JSON.stringify({ v: Date.now() + HORAS * 3600e3 })));
  return `${COOKIE}=${cuerpo}.${await hmac(env, cuerpo)}; Path=${BASE_RUTA}/api; HttpOnly; Secure; SameSite=Strict; Max-Age=${HORAS * 3600}`;
}
export const cookieBorrar = () => `${COOKIE}=; Path=${BASE_RUTA}/api; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
export async function sesionValida(env, req) {
  if (cfg(env, "LEALTAD_SECRETO").length < 16) return false;
  const m = (req.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  const [cuerpo, firma] = m ? m[1].split(".") : [];
  if (!cuerpo || !firma || !iguales(firma, await hmac(env, cuerpo))) return false;
  try { return JSON.parse(atob(cuerpo.replace(/-/g, "+").replace(/_/g, "/"))).v > Date.now(); } catch { return false; }
}

// Envuelve un manejador: errores genéricos hacia fuera, detalle en el registro.
export const seguro = (fn) => async (ctx) => {
  try { return await fn(ctx); } catch (e) { console.error(e?.stack || e); return json({ error: "Error del servidor." }, 500); }
};
