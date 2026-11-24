// Panel del taller: entrar, buscar, sellar, canjear y enviar promociones.
import { json, almacen, env, iguales, cookieSesion, cookieBorrar, sesionValida, limitar, idValido, telNormal,
  leerTarjeta, guardarTarjeta, resumen, sitio, SELLOS_META, RECOMPENSA } from "../lib/nucleo.mjs";
import { avisarApple } from "../lib/apple.mjs";
import { actualizarGoogle, promoGoogle } from "../lib/google.mjs";

export const config = { path: "/api/panel" };

const vista = (t) => ({ id: t.id, codigo: t.codigo, nombre: t.nombre, tel: t.tel, canjes: t.canjes, ...resumen(t), historial: t.historial.slice(-12) });

async function buscar(q) {
  q = String(q || "").trim();
  if (idValido(q)) return leerTarjeta(q);
  const s = await almacen();
  const cod = q.toUpperCase().replace(/^MR-?/, "MR-");
  const id = (await s.get("codigos/" + cod)) || (telNormal(q).length === 10 ? await s.get("telefonos/" + telNormal(q)) : null);
  return id ? leerTarjeta(id) : null;
}

async function avisar(t, req, texto) {
  const base = sitio(req);
  const [a, g] = await Promise.allSettled([avisarApple([t.id]), actualizarGoogle(t, base, texto)]);
  if (a.status === "rejected") console.error("apple push", a.reason);
  if (g.status === "rejected") console.error("google", g.reason);
}

export default async (req, context) => {
  try {
    if (req.method !== "POST") return json({ error: "Método no permitido." }, 405);
    const d = await req.json().catch(() => ({}));
    if (d.accion === "entrar") {
      if (!env("PANEL_CLAVE") || !env("LEALTAD_SECRETO")) return json({ error: "Panel sin configurar." }, 503);
      if (!(await limitar("panel:" + (context?.ip || "x"), 8, 15))) return json({ error: "Demasiados intentos. Espera 15 minutos." }, 429);
      if (!iguales(String(d.clave || ""), env("PANEL_CLAVE"))) { console.warn("panel: clave incorrecta"); return json({ error: "Clave incorrecta." }, 401); }
      console.info("panel: entrada");
      return json({ ok: true }, 200, { "set-cookie": cookieSesion() });
    }
    if (d.accion === "salir") return json({ ok: true }, 200, { "set-cookie": cookieBorrar() });
    if (!sesionValida(req)) return json({ error: "Sesión vencida." }, 401);
    if (d.accion === "estado") return json({ ok: true });

    if (d.accion === "promo") {
      const titulo = String(d.titulo || "").trim().slice(0, 50), texto = String(d.texto || "").trim().slice(0, 240);
      if (!titulo || !texto) return json({ error: "Escribe título y texto." }, 400);
      const s = await almacen();
      await s.setJSON("config/promo", { titulo, texto, fecha: Date.now() });
      // Apple: cada pase se vuelve a descargar con la promo nueva (changeMessage la muestra como aviso).
      const { blobs } = await s.list({ prefix: "apple/pase/" });
      const apple = await avisarApple(blobs.map((b) => b.key.slice("apple/pase/".length))).catch((e) => (console.error(e), { error: true }));
      const google = await promoGoogle(titulo, texto).catch((e) => (console.error(e), "error"));
      return json({ ok: true, apple, google });
    }

    const t = await buscar(d.q || d.id);
    if (!t) return json({ error: "No encontré esa tarjeta." }, 404);
    if (d.accion === "buscar") return json(vista(t));
    if (d.accion === "sellar") {
      if (t.sellos >= SELLOS_META) return json({ error: `Ya tiene ${SELLOS_META} sellos: primero canjea su ${RECOMPENSA}.` }, 409);
      t.sellos++; t.historial.push({ t: Date.now(), tipo: "sello" });
      await guardarTarjeta(t);
      await avisar(t, req, t.sellos >= SELLOS_META ? `¡Completaste ${SELLOS_META} sellos! Tu próximo servicio es un ${RECOMPENSA}.` : `Sumaste un sello: ${t.sellos} de ${SELLOS_META}.`);
      return json(vista(t));
    }
    if (d.accion === "canjear") {
      if (t.sellos < SELLOS_META) return json({ error: `Le faltan ${SELLOS_META - t.sellos} sellos.` }, 409);
      t.sellos = 0; t.canjes++; t.historial.push({ t: Date.now(), tipo: "canje" });
      await guardarTarjeta(t);
      await avisar(t, req, "Canjeaste tu Servicio Express gratis. ¡Gracias por confiar en Moto Roka!");
      return json(vista(t));
    }
    if (d.accion === "quitar") { // corrige un sello puesto por error
      if (t.sellos < 1) return json({ error: "No tiene sellos." }, 409);
      t.sellos--; t.historial.push({ t: Date.now(), tipo: "corrección" });
      await guardarTarjeta(t); await avisar(t, req);
      return json(vista(t));
    }
    return json({ error: "Acción desconocida." }, 400);
  } catch (e) {
    console.error("panel", e);
    return json({ error: "Error del servidor." }, 500);
  }
};
