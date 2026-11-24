// Google Wallet: redirige al enlace firmado "Guardar en Google Wallet".
import { json, leerTarjeta, sitio, limitar } from "../lib/nucleo.mjs";
import { googleListo, enlaceGuardar } from "../lib/google.mjs";

export const config = { path: "/api/google" };

export default async (req, context) => {
  try {
    if (!googleListo()) return json({ error: "Google Wallet aún no está configurado." }, 503);
    if (!(await limitar("google:" + (context?.ip || "x"), 30, 60))) return json({ error: "Demasiadas solicitudes." }, 429);
    const t = await leerTarjeta(new URL(req.url).searchParams.get("id"));
    if (!t) return json({ error: "Tarjeta no encontrada." }, 404);
    return new Response(null, { status: 302, headers: { location: await enlaceGuardar(t, sitio(req)), "cache-control": "no-store" } });
  } catch (e) {
    console.error("google", e);
    return json({ error: "Error del servidor." }, 500);
  }
};
