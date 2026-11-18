// POST /api/evaluacion — un huésped envía su evaluación. Queda "pendiente" hasta que el administrador la revise.
import { leer, escribir, json, txt, num, nuevoId, limitar } from "../lib/comun.mjs";

const CATS = ["limpieza", "comodidad", "alberca", "ubicacion", "atencion"];

export default async (req, context) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  let d; try { d = await req.json(); } catch { return json({ error: "Datos inválidos" }, 400); }
  if (d.sitio_web) return json({ ok: true }); // trampa para bots: el campo oculto vino lleno
  if (!(await limitar(context?.ip, "eval", 5, 60))) return json({ error: "Demasiados envíos. Intenta más tarde." }, 429);

  const e = {
    id: nuevoId(), recibida: new Date().toISOString(), estado: "pendiente",
    casa: txt(d.casa, 60), nombre: txt(d.nombre, 60), ciudad: txt(d.ciudad, 60),
    fecha: /^\d{4}-\d{2}$/.test(d.fecha) ? d.fecha : "", telefono: txt(d.telefono, 20),
    estrellas: num(d.estrellas, 1, 5), texto: txt(d.texto, 1200), categorias: {},
  };
  for (const c of CATS) { const v = num(d[c], 1, 5); if (v) e.categorias[c] = Math.round(v); }
  if (!e.casa || !e.nombre || !e.estrellas || e.texto.length < 30) return json({ error: "Faltan datos obligatorios" }, 400);
  e.estrellas = Math.round(e.estrellas);

  const lista = await leer("evaluaciones");
  if (lista.length > 5000) return json({ error: "Capacidad llena" }, 507);
  lista.push(e); await escribir("evaluaciones", lista);
  return json({ ok: true });
};
export const config = { path: "/api/evaluacion" };
