// /lealtad/api/google — redirige al enlace firmado "Guardar en Google Wallet".
import { json, seguro, ip, leerTarjeta, sitio, limitar } from "../../../lealtad-api/nucleo.js";
import { googleListo, enlaceGuardar } from "../../../lealtad-api/google.js";

export const onRequestGet = seguro(async ({ request, env }) => {
  if (!googleListo(env)) return json({ error: "Google Wallet aún no está configurado." }, 503);
  if (!(await limitar(env, "google:" + ip(request), 30, 60))) return json({ error: "Demasiadas solicitudes." }, 429);
  const t = await leerTarjeta(env, new URL(request.url).searchParams.get("id"));
  if (!t) return json({ error: "Tarjeta no encontrada." }, 404);
  return new Response(null, { status: 302, headers: { location: await enlaceGuardar(env, t, sitio(env, request)), "cache-control": "no-store" } });
});
