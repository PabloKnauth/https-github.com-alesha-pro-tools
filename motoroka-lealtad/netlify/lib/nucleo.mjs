// Núcleo compartido: almacén, respuestas, sesiones del panel, reglas del programa.
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SELLOS_META = 5; // 5 sellos = el 6.º Servicio Express gratis
export const RECOMPENSA = "Servicio Express gratis";
export const NEGOCIO = "Moto Roka Fix & Shop";

export const env = (k) => (globalThis.Netlify?.env?.get?.(k) ?? process.env[k] ?? "").trim();

export async function almacen() {
  if (globalThis.__LEALTAD_ALMACEN__) return globalThis.__LEALTAD_ALMACEN__;
  const { getStore } = await import("@netlify/blobs");
  return getStore({ name: "lealtad", consistency: "strong" });
}

export function json(datos, estado = 200, extra = {}) {
  return new Response(JSON.stringify(datos), {
    status: estado,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra },
  });
}

export const nuevoId = (n = 18) => randomBytes(n).toString("base64url");
// Código corto legible para buscar en mostrador (sin 0/O/1/I).
export function nuevoCodigo() {
  const abc = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ", b = randomBytes(6);
  return "MR-" + Array.from(b, (x) => abc[x % abc.length]).join("");
}
export const idValido = (id) => typeof id === "string" && /^[A-Za-z0-9_-]{20,40}$/.test(id);
export const telNormal = (t) => String(t || "").replace(/\D/g, "").slice(-10);

export function sitio(req) {
  return env("SITIO_URL").replace(/\/$/, "") || new URL(req.url).origin;
}

// ---- Tarjetas ----
export async function leerTarjeta(id) {
  if (!idValido(id)) return null;
  return (await almacen()).get("tarjetas/" + id, { type: "json" });
}
export async function guardarTarjeta(t) {
  t.act = Date.now();
  await (await almacen()).setJSON("tarjetas/" + t.id, t);
  return t;
}
export const puntos = (n) => "●".repeat(n) + "○".repeat(Math.max(0, SELLOS_META - n));
export function resumen(t) {
  const listo = t.sellos >= SELLOS_META;
  return {
    sellos: t.sellos, meta: SELLOS_META, puntos: puntos(Math.min(t.sellos, SELLOS_META)),
    estado: listo ? `¡Tu próximo ${RECOMPENSA.replace(" gratis", "")} es GRATIS!` : `${t.sellos} de ${SELLOS_META} servicios`,
    faltan: Math.max(0, SELLOS_META - t.sellos), listo,
  };
}
export async function promoActual() {
  return (await (await almacen()).get("config/promo", { type: "json" })) || null;
}

// ---- Ubicación del taller (avisos por cercanía) ----
export function ubicacion() {
  const lat = parseFloat(env("TALLER_LAT")), lng = parseFloat(env("TALLER_LNG"));
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

// ---- Sesión del panel (cookie HttpOnly firmada) ----
const COOKIE = "mr_panel", HORAS = 12;
const firmar = (s) => createHmac("sha256", env("LEALTAD_SECRETO") || "falta-secreto").update(s).digest("base64url");
export function cookieSesion() {
  const cuerpo = Buffer.from(JSON.stringify({ v: Date.now() + HORAS * 3600e3 })).toString("base64url");
  return `${COOKIE}=${cuerpo}.${firmar(cuerpo)}; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=${HORAS * 3600}`;
}
export const cookieBorrar = () => `${COOKIE}=; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
export function sesionValida(req) {
  if (!env("LEALTAD_SECRETO")) return false;
  const m = (req.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m) return false;
  const [cuerpo, firma] = m[1].split(".");
  if (!cuerpo || !firma || !iguales(firma, firmar(cuerpo))) return false;
  try { return JSON.parse(Buffer.from(cuerpo, "base64url").toString()).v > Date.now(); } catch { return false; }
}
export function iguales(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

// Límite simple por IP (ventana fija) guardado en Blobs.
export async function limitar(clave, max, minutos) {
  const s = await almacen(), k = "limite/" + clave.replace(/[^\w.:-]/g, "_");
  const ahora = Date.now(), r = (await s.get(k, { type: "json" })) || { n: 0, desde: ahora };
  if (ahora - r.desde > minutos * 60e3) { r.n = 0; r.desde = ahora; }
  r.n++;
  await s.setJSON(k, r);
  return r.n <= max;
}
