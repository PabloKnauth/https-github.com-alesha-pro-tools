// Alta de clientes y consulta pública de una tarjeta (quien tiene el enlace secreto).
import { json, almacen, nuevoId, nuevoCodigo, telNormal, leerTarjeta, guardarTarjeta, resumen, promoActual, limitar } from "../lib/nucleo.mjs";
import { appleListo } from "../lib/apple.mjs";
import { googleListo } from "../lib/google.mjs";

export const config = { path: "/api/tarjeta" };

const publica = async (t) => ({ id: t.id, codigo: t.codigo, nombre: t.nombre, ...resumen(t), canjes: t.canjes,
  promo: await promoActual(), apple: appleListo(), google: googleListo() });

export default async (req, context) => {
  try {
    if (req.method === "GET") {
      const t = await leerTarjeta(new URL(req.url).searchParams.get("id"));
      return t ? json(await publica(t)) : json({ error: "Tarjeta no encontrada." }, 404);
    }
    if (req.method !== "POST") return json({ error: "Método no permitido." }, 405);
    const d = await req.json().catch(() => ({}));
    if (d.sitio) return json({ error: "Solicitud inválida." }, 400); // trampa para bots
    const nombre = String(d.nombre || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 60);
    const tel = telNormal(d.tel);
    if (nombre.length < 2 || tel.length !== 10) return json({ error: "Escribe tu nombre y un WhatsApp de 10 dígitos." }, 400);
    if (!d.acepto) return json({ error: "Debes aceptar el aviso de privacidad." }, 400);
    if (!(await limitar("alta:" + (context?.ip || "x"), 5, 60))) return json({ error: "Demasiados intentos. Intenta más tarde." }, 429);
    const s = await almacen();
    if (await s.get("telefonos/" + tel)) return json({ error: "Ese WhatsApp ya tiene tarjeta. Pídele al taller que te reenvíe tu enlace." }, 409);
    const t = { id: nuevoId(), codigo: nuevoCodigo(), tokenApple: nuevoId(24), nombre, tel, sellos: 0, canjes: 0,
      historial: [{ t: Date.now(), tipo: "alta" }], creada: Date.now() };
    await guardarTarjeta(t);
    await s.set("telefonos/" + tel, t.id);
    await s.set("codigos/" + t.codigo, t.id);
    return json(await publica(t), 201);
  } catch (e) {
    console.error("tarjeta", e);
    return json({ error: "Error del servidor." }, 500);
  }
};
