// /lealtad/api/cumple — lo llama cada mañana el Worker programado (cloudflare/cumple-cron).
// Envía la felicitación a quien cumple años hoy: el pase se actualiza y Wallet muestra el aviso del regalo.
import { json, seguro, cfg, iguales, listarClaves, leerTarjeta, guardarTarjeta, hoyMX, sitio, regaloTexto } from "../../../lealtad-api/nucleo.js";
import { avisarApple } from "../../../lealtad-api/apple.js";
import { actualizarGoogle } from "../../../lealtad-api/google.js";

export const onRequestPost = seguro(async ({ request, env }) => {
  const clave = cfg(env, "CRON_CLAVE");
  if (clave.length < 16 || !iguales(request.headers.get("x-cron-clave") || "", clave)) return json({ error: "No autorizado." }, 401);
  const h = hoyMX(), mmdd = String(h.getUTCMonth() + 1).padStart(2, "0") + String(h.getUTCDate()).padStart(2, "0");
  const ids = (await listarClaves(env, "cumple/" + mmdd + "/")).map((k) => k.split("/")[2]);
  // 28 de febrero en año no bisiesto: también felicita a quien nació el 29.
  const anio = h.getUTCFullYear(), bisiesto = (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
  if (mmdd === "0228" && !bisiesto) ids.push(...(await listarClaves(env, "cumple/0229/")).map((k) => k.split("/")[2]));
  let avisados = 0;
  for (const id of ids) {
    const t = await leerTarjeta(env, id);
    if (!t || t.felicitado === anio) continue;
    t.felicitado = anio;
    await guardarTarjeta(env, t); // cambia la fecha del pase: Wallet descarga la versión con el regalo
    await Promise.allSettled([avisarApple(env, [id]),
      actualizarGoogle(env, t, sitio(env, request), `¡Feliz cumpleaños, ${t.nombre.split(" ")[0]}! ${regaloTexto(env)}: pasa por él al taller.`)]);
    avisados++;
  }
  return json({ ok: true, fecha: mmdd, avisados });
});
