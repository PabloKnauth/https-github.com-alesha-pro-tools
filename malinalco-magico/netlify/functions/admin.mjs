// POST /api/admin — acceso de administrador.
// { accion: "entrar", clave }            → { token }
// { accion: "leer" }  (con token)         → todas las colecciones
// { accion: "guardar", coleccion, valor } → guarda una colección validada
import { leer, escribir, leerTodo, json, txt, num, fecha, url, nuevoId, crearToken, tokenValido, claveCorrecta, limitar, reiniciarLimite } from "../lib/comun.mjs";

const ESTADOS_RES = ["apartada", "confirmada", "pagada", "cancelada"];
const ESTADOS_EV = ["pendiente", "publicada", "rechazada"];
const CATS = ["limpieza", "comodidad", "alberca", "ubicacion", "atencion"];

const limpiar = {
  reservas: (v) => (Array.isArray(v) ? v : []).slice(0, 5000).map((r) => {
    const o = {
      id: txt(r.id, 12) || nuevoId(), casa: txt(r.casa, 60), llegada: fecha(r.llegada), salida: fecha(r.salida),
      huesped: txt(r.huesped, 80), telefono: txt(r.telefono, 25), personas: num(r.personas, 0, 99) ?? 0,
      monto: num(r.monto, 0, 1e7) ?? 0, anticipo: num(r.anticipo, 0, 1e7) ?? 0,
      estado: ESTADOS_RES.includes(r.estado) ? r.estado : "apartada", canal: txt(r.canal, 30), notas: txt(r.notas, 800),
      creada: txt(r.creada, 30) || new Date().toISOString(),
    };
    if (!o.casa || !o.llegada || !o.salida || o.salida <= o.llegada) throw new Error("Reserva inválida: revisa casa y fechas");
    return o;
  }),
  casas: (v) => {
    const out = {};
    for (const [id, c] of Object.entries(v && typeof v === "object" ? v : {}).slice(0, 200)) {
      const o = {};
      if ("oculta" in c) o.oculta = !!c.oculta;
      for (const k of ["nombre", "etiqueta", "destino"]) if (k in c) o[k] = txt(c[k], 80);
      for (const k of ["resumen", "camas"]) if (k in c) o[k] = txt(c[k], 600);
      if ("maps" in c) o.maps = url(c.maps);
      if ("personas" in c) o.personas = c.personas ? [num(c.personas[0], 1, 99) ?? 1, num(c.personas[1], 1, 99) ?? 1] : null;
      for (const k of ["recamaras", "banos"]) if (k in c) o[k] = c[k] === null || c[k] === "" ? null : (num(c[k], 0, 50) ?? txt(c[k], 10));
      for (const k of ["amenidades", "reglas"]) if (k in c) o[k] = (Array.isArray(c[k]) ? c[k] : []).map((x) => txt(x, 120)).filter(Boolean).slice(0, 40);
      if ("habitaciones" in c) o.habitaciones = (Array.isArray(c.habitaciones) ? c.habitaciones : []).slice(0, 20)
        .map((h) => ({ nombre: txt(h.nombre, 60), camas: txt(h.camas, 120), foto: h.foto === "" || h.foto == null ? null : num(h.foto, 0, 99) }));
      out[txt(id, 60)] = o;
    }
    return out;
  },
  evaluaciones: (v) => (Array.isArray(v) ? v : []).slice(0, 5000).map((e) => {
    const cats = {}; for (const c of CATS) { const n = num(e.categorias?.[c], 1, 5); if (n) cats[c] = Math.round(n); }
    return {
      id: txt(e.id, 12) || nuevoId(), recibida: txt(e.recibida, 30) || new Date().toISOString(),
      estado: ESTADOS_EV.includes(e.estado) ? e.estado : "pendiente", casa: txt(e.casa, 60), nombre: txt(e.nombre, 60),
      ciudad: txt(e.ciudad, 60), fecha: /^\d{4}-\d{2}$/.test(e.fecha) ? e.fecha : "", telefono: txt(e.telefono, 25),
      estrellas: Math.round(num(e.estrellas, 1, 5) ?? 3), texto: txt(e.texto, 1200), categorias: cats, origen: txt(e.origen, 30),
      atendida: !!e.atendida, seguimiento: txt(e.seguimiento, 1000),
    };
  }),
  atractivos: (v) => lugaresLimpios(v),
  lugares: (v) => lugaresLimpios(v),
  config: (v) => ({ mostrarDisponibilidad: !!v?.mostrarDisponibilidad }),
};
function lugaresLimpios(v) {
  return (Array.isArray(v) ? v : []).slice(0, 300).map((l) => {
    const o = { id: txt(l.id, 12) || nuevoId(), nombre: txt(l.nombre, 90), categoria: txt(l.categoria, 40), descripcion: txt(l.descripcion, 600),
      direccion: txt(l.direccion, 160), maps: url(l.maps), web: url(l.web), telefono: txt(l.telefono, 25), visible: l.visible !== false };
    if (!o.nombre) throw new Error("Cada lugar necesita nombre");
    return o;
  });
}

export default async (req, context) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  let d; try { d = await req.json(); } catch { return json({ error: "Datos inválidos" }, 400); }

  const COOKIE = "mm_sesion";
  const cookie = (v, seg) => `${COOKIE}=${v}; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=${seg}`;
  if (d.accion === "salir") return json({ ok: true }, 200, { "set-cookie": cookie("", 0) });

  if (d.accion === "entrar") {
    if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 8)
      return json({ error: "Falta configurar ADMIN_PASSWORD (mínimo 8 caracteres) en Netlify." }, 503);
    if (!(await limitar(context?.ip, "login", 8, 15))) return json({ error: "Demasiados intentos. Espera 15 minutos." }, 429);
    if (!claveCorrecta(d.clave)) {
      console.warn(JSON.stringify({ evento: "acceso_fallido", ip: context?.ip ?? null }));
      await new Promise((r) => setTimeout(r, 600)); return json({ error: "Contraseña incorrecta" }, 401);
    }
    await reiniciarLimite(context?.ip, "login");
    console.info(JSON.stringify({ evento: "acceso", ip: context?.ip ?? null }));
    // La sesión viaja en una cookie HttpOnly (12 h): el código de la página no puede leerla.
    return json({ token: "cookie" }, 200, { "set-cookie": cookie(crearToken(), 12 * 3600) });
  }

  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const galleta = (req.headers.get("cookie") || "").match(/(?:^|;\s*)mm_sesion=([^;]+)/);
  const token = bearer.includes(".") ? bearer : galleta ? galleta[1] : "";
  if (!tokenValido(token)) return json({ error: "Sesión vencida. Vuelve a entrar." }, 401);

  if (d.accion === "leer") return json(await leerTodo());
  if (d.accion === "guardar") {
    if (!limpiar[d.coleccion]) return json({ error: "Colección desconocida" }, 400);
    try {
      const valor = limpiar[d.coleccion](d.valor);
      await escribir(d.coleccion, valor);
      return json({ ok: true, valor });
    } catch (e) { return json({ error: e.message || "No se pudo guardar" }, 400); }
  }
  return json({ error: "Acción desconocida" }, 400);
};
export const config = { path: "/api/admin" };
