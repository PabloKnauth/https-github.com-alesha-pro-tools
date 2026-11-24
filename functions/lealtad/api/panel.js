// /lealtad/api/panel — panel del taller: entrar, buscar, sellar, canjear, regalo de cumpleaños, promociones.
import { json, seguro, kv, cfg, ip, iguales, cookieSesion, cookieBorrar, sesionValida, limitar, idValido, telNormal, cumpleNormal,
  leerTarjeta, guardarTarjeta, resumen, regaloCumple, regaloTexto, listarClaves, sitio, SELLOS_META, RECOMPENSA } from "../../../lealtad-api/nucleo.js";
import { avisarApple } from "../../../lealtad-api/apple.js";
import { actualizarGoogle, promoGoogle } from "../../../lealtad-api/google.js";

const vista = (env, t) => ({ id: t.id, codigo: t.codigo, nombre: t.nombre, tel: t.tel, canjes: t.canjes, ...resumen(t, env), historial: t.historial.slice(-12) });

async function buscar(env, q) {
  q = String(q || "").trim();
  if (idValido(q)) return leerTarjeta(env, q);
  const cod = q.toUpperCase().replace(/^MR-?/, "MR-");
  const id = (await kv(env).get("cod/" + cod)) || (telNormal(q).length === 10 ? await kv(env).get("tel/" + telNormal(q)) : null);
  return id ? leerTarjeta(env, id) : null;
}

async function avisar(env, request, t, texto) {
  const [a, g] = await Promise.allSettled([avisarApple(env, [t.id]), actualizarGoogle(env, t, sitio(env, request), texto)]);
  if (a.status === "rejected") console.error("apple", a.reason);
  if (g.status === "rejected") console.error("google", g.reason);
}

export const onRequestPost = seguro(async ({ request, env }) => {
  const d = await request.json().catch(() => ({}));
  if (d.accion === "entrar") {
    if (!cfg(env, "PANEL_CLAVE") || cfg(env, "LEALTAD_SECRETO").length < 16) return json({ error: "Panel sin configurar." }, 503);
    if (!(await limitar(env, "panel:" + ip(request), 8, 15))) return json({ error: "Demasiados intentos. Espera 15 minutos." }, 429);
    if (!iguales(String(d.clave || ""), cfg(env, "PANEL_CLAVE"))) { console.warn("panel: clave incorrecta"); return json({ error: "Clave incorrecta." }, 401); }
    console.info("panel: entrada");
    return json({ ok: true }, 200, { "set-cookie": await cookieSesion(env) });
  }
  if (d.accion === "salir") return json({ ok: true }, 200, { "set-cookie": cookieBorrar() });
  if (!(await sesionValida(env, request))) return json({ error: "Sesión vencida." }, 401);
  if (d.accion === "estado") return json({ ok: true, regalo: regaloTexto(env) });

  if (d.accion === "promo") {
    const titulo = String(d.titulo || "").trim().slice(0, 50), texto = String(d.texto || "").trim().slice(0, 240);
    if (!titulo || !texto) return json({ error: "Escribe título y texto." }, 400);
    await kv(env).put("config/promo", JSON.stringify({ titulo, texto, fecha: Date.now() }));
    const seriales = (await listarClaves(env, "apple/pase/")).map((k) => k.slice(11));
    const apple = await avisarApple(env, seriales).catch((e) => (console.error(e), { error: true }));
    const google = await promoGoogle(env, titulo, texto).catch((e) => (console.error(e), "error"));
    return json({ ok: true, apple, google });
  }

  const t = await buscar(env, d.q || d.id);
  if (!t) return json({ error: "No encontré esa tarjeta." }, 404);
  const guardar = async (tipo, aviso) => { t.historial.push({ t: Date.now(), tipo }); await guardarTarjeta(env, t); await avisar(env, request, t, aviso); return json(vista(env, t)); };
  switch (d.accion) {
    case "buscar": return json(vista(env, t));
    case "sellar":
      if (t.sellos >= SELLOS_META) return json({ error: `Ya tiene ${SELLOS_META} sellos: primero canjea su ${RECOMPENSA}.` }, 409);
      t.sellos++;
      return guardar("sello", t.sellos >= SELLOS_META ? `¡Completaste ${SELLOS_META} sellos! Tu 5.º servicio es GRATIS.` : `Sumaste un sello: ${t.sellos} de ${SELLOS_META}.`);
    case "canjear":
      if (t.sellos < SELLOS_META) return json({ error: `Le faltan ${SELLOS_META - t.sellos} sellos.` }, 409);
      t.sellos = 0; t.canjes++;
      return guardar("canje", "Canjeaste tu Servicio Express gratis. ¡Gracias por confiar en Moto Roka!");
    case "quitar":
      if (t.sellos < 1) return json({ error: "No tiene sellos." }, 409);
      t.sellos--;
      return guardar("corrección");
    case "regalo": {
      const r = regaloCumple(t);
      if (!r.activo) return json({ error: r.entregado ? "Ya recibió su regalo de este año." : "Su regalo de cumpleaños no está vigente." }, 409);
      t.cumpleCanje = r.anio;
      return guardar("regalo de cumpleaños");
    }
    case "cumple": {
      const c = cumpleNormal(d.cumple);
      if (!c) return json({ error: "Escribe el cumpleaños como día/mes, p. ej. 14/03." }, 400);
      if (t.cumple) await kv(env).delete(`cumple/${t.cumple.replace("-", "")}/${t.id}`);
      t.cumple = c;
      await kv(env).put(`cumple/${c.replace("-", "")}/${t.id}`, "1");
      return guardar("cumpleaños registrado");
    }
  }
  return json({ error: "Acción desconocida." }, 400);
});
