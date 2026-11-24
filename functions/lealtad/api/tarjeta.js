// /lealtad/api/tarjeta — alta de clientes (POST) y consulta con el enlace secreto (GET).
import { json, seguro, kv, ip, sitio, nuevoId, nuevoCodigo, telNormal, cumpleNormal, leerTarjeta, guardarTarjeta, resumen, promoActual, limitar } from "../../../lealtad-api/nucleo.js";
import { appleListo, avisarApple } from "../../../lealtad-api/apple.js";
import { googleListo, actualizarGoogle } from "../../../lealtad-api/google.js";
import { TEMAS, SELLOS } from "../../../lealtad-api/temas.js";

const publica = async (env, t) => ({ id: t.id, codigo: t.codigo, nombre: t.nombre, canjes: t.canjes, ...resumen(t, env),
  promo: await promoActual(env), apple: appleListo(env), google: googleListo(env) });

export const onRequestGet = seguro(async ({ request, env }) => {
  const t = await leerTarjeta(env, new URL(request.url).searchParams.get("id"));
  return t ? json(await publica(env, t)) : json({ error: "Tarjeta no encontrada." }, 404);
});

export const onRequestPost = seguro(async ({ request, env }) => {
  const d = await request.json().catch(() => ({}));
  if (d.accion === "personalizar") { // quien tiene el enlace de su tarjeta elige tema e icono del sello
    const t = await leerTarjeta(env, d.id);
    if (!t) return json({ error: "Tarjeta no encontrada." }, 404);
    if (!TEMAS[d.tema] || !SELLOS.includes(d.sello)) return json({ error: "Opción no válida." }, 400);
    if (!(await limitar(env, "pers:" + t.id, 30, 60))) return json({ error: "Demasiados cambios seguidos. Intenta en un rato." }, 429);
    t.tema = d.tema; t.sello = d.sello;
    await guardarTarjeta(env, t);
    await Promise.allSettled([avisarApple(env, [t.id]), actualizarGoogle(env, t, sitio(env, request))]);
    return json(await publica(env, t));
  }
  if (d.sitio) return json({ error: "Solicitud inválida." }, 400); // trampa para bots
  const nombre = String(d.nombre || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 60);
  const tel = telNormal(d.tel), cumple = d.cumple ? cumpleNormal(d.cumple) : null;
  if (nombre.length < 2 || tel.length !== 10) return json({ error: "Escribe tu nombre y un WhatsApp de 10 dígitos." }, 400);
  if (d.cumple && !cumple) return json({ error: "Revisa tu fecha de cumpleaños (día y mes)." }, 400);
  if (!d.acepto) return json({ error: "Debes aceptar el aviso de privacidad." }, 400);
  if (!(await limitar(env, "alta:" + ip(request), 5, 60))) return json({ error: "Demasiados intentos. Intenta más tarde." }, 429);
  if (await kv(env).get("tel/" + tel)) return json({ error: "Ese WhatsApp ya tiene tarjeta. Pídele al taller que te reenvíe tu enlace." }, 409);
  const t = { id: nuevoId(), codigo: nuevoCodigo(), tokenApple: nuevoId() + nuevoId(), nombre, tel, cumple, sellos: 0, canjes: 0,
    historial: [{ t: Date.now(), tipo: "alta" }], creada: Date.now() };
  await guardarTarjeta(env, t);
  await kv(env).put("tel/" + tel, t.id);
  await kv(env).put("cod/" + t.codigo, t.id);
  if (cumple) await kv(env).put(`cumple/${cumple.replace("-", "")}/${t.id}`, "1");
  return json(await publica(env, t), 201);
});
