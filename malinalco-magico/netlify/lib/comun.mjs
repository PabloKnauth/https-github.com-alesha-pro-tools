// Núcleo compartido de las funciones de Malinalco Mágico.
// Datos en Netlify Blobs (almacén "malinalco-magico"), un JSON por colección.
import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { getStore } from "@netlify/blobs";

export const COLECCIONES = ["reservas", "casas", "evaluaciones", "atractivos", "lugares", "config"];
const VACIO = { reservas: [], casas: {}, evaluaciones: [], atractivos: [], lugares: [], config: { mostrarDisponibilidad: false } };

// Permite inyectar un almacén en memoria para pruebas locales.
function almacen() {
  if (globalThis.__MM_ALMACEN__) return globalThis.__MM_ALMACEN__;
  return getStore({ name: "malinalco-magico", consistency: "strong" });
}
export async function leer(col) {
  const v = await almacen().get(col, { type: "json" });
  return v ?? structuredClone(VACIO[col]);
}
export async function escribir(col, valor) { await almacen().setJSON(col, valor); }
export async function leerTodo() {
  const o = {}; for (const c of COLECCIONES) o[c] = await leer(c); return o;
}

export function json(datos, estado = 200, extra = {}) {
  return new Response(JSON.stringify(datos), {
    status: estado,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra },
  });
}
export const nuevoId = () => randomUUID().slice(0, 8);

/* ---------- Validación de texto ---------- */
export function txt(v, max = 500) { return String(v ?? "").replace(/[\u0000-\u0008\u000B-\u001F]/g, "").trim().slice(0, max); }
export function num(v, min, max) { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null; }
export function fecha(v) { return /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? String(v) : null; }
export function url(v) { const s = txt(v, 500); return /^https:\/\//i.test(s) ? s : ""; }

/* ---------- Sesión de administrador (token firmado HMAC, 12 h) ---------- */
const secreto = () => process.env.MM_TOKEN_SECRET || process.env.ADMIN_PASSWORD || "";
const b64 = (s) => Buffer.from(s).toString("base64url");
export function crearToken() {
  const carga = b64(JSON.stringify({ exp: Date.now() + 12 * 3600e3 }));
  return carga + "." + createHmac("sha256", secreto()).update(carga).digest("base64url");
}
export function tokenValido(token) {
  if (!secreto() || !token || !token.includes(".")) return false;
  const [carga, firma] = token.split(".");
  const esperada = createHmac("sha256", secreto()).update(carga).digest("base64url");
  const a = Buffer.from(firma), b = Buffer.from(esperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try { return JSON.parse(Buffer.from(carga, "base64url").toString()).exp > Date.now(); } catch { return false; }
}
export function claveCorrecta(intento) {
  const real = process.env.ADMIN_PASSWORD || "";
  if (real.length < 8) return false;
  const a = createHmac("sha256", "k").update(String(intento)).digest(), b = createHmac("sha256", "k").update(real).digest();
  return timingSafeEqual(a, b);
}

/* ---------- Límite de intentos por IP ---------- */
export async function limitar(ip, clave, max, minutos) {
  const k = "limite:" + clave + ":" + (ip || "x");
  const ahora = Date.now(), reg = (await almacen().get(k, { type: "json" })) || { n: 0, desde: ahora };
  if (ahora - reg.desde > minutos * 60e3) { reg.n = 0; reg.desde = ahora; }
  reg.n++; await almacen().setJSON(k, reg);
  return reg.n <= max;
}
export async function reiniciarLimite(ip, clave) { await almacen().delete("limite:" + clave + ":" + (ip || "x")); }

/* ---------- Datos públicos ---------- */
const CATS = ["limpieza", "comodidad", "alberca", "ubicacion", "atencion"];
export function resumenes(evaluaciones) {
  // El promedio y el número de evaluaciones usan TODAS las publicadas (también las de 1–2 ★)
  // para que la calificación sea honesta; solo los textos de 3 ★ o más se muestran.
  const r = {};
  for (const e of evaluaciones.filter((x) => x.estado === "publicada")) {
    const s = (r[e.casa] ??= { suma: 0, n: 0, cats: {} });
    s.suma += e.estrellas; s.n++;
    for (const c of CATS) if (e.categorias?.[c]) { (s.cats[c] ??= [0, 0]); s.cats[c][0] += e.categorias[c]; s.cats[c][1]++; }
  }
  const out = {};
  for (const [casa, s] of Object.entries(r)) {
    const cats = {}; for (const [c, [a, n]] of Object.entries(s.cats)) cats[c] = a / n;
    out[casa] = { media: s.suma / s.n, n: s.n, cats };
  }
  return out;
}
export function datosPublicos(d) {
  const ocupada = {};
  for (const r of d.reservas) if (r.estado !== "cancelada") (ocupada[r.casa] ??= []).push([r.llegada, r.salida]);
  const evaluaciones = {};
  for (const e of d.evaluaciones) {
    if (e.estado !== "publicada" || e.estrellas < 3) continue;
    (evaluaciones[e.casa] ??= []).push({ nombre: e.nombre, ciudad: e.ciudad, fecha: e.fecha, estrellas: e.estrellas, categorias: e.categorias, texto: e.texto });
  }
  return {
    casas: d.casas, ocupada, evaluaciones, resumenes: resumenes(d.evaluaciones),
    atractivos: d.atractivos.filter((a) => a.visible !== false),
    lugares: d.lugares.filter((a) => a.visible !== false),
    config: { mostrarDisponibilidad: !!d.config.mostrarDisponibilidad },
  };
}
