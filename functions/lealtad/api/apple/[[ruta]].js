// /lealtad/api/apple/* — descarga del pase y servicio web de PassKit (registro de iPhones y actualizaciones).
import { json, vacio, seguro, kv, cfg, ip, iguales, leerTarjeta, sitio, limitar, promoActual } from "../../../../lealtad-api/nucleo.js";
import { appleListo, crearPase, dispositivosDe, guardarDispositivos } from "../../../../lealtad-api/apple.js";

const pkpass = async (env, request, t) => new Response(await crearPase(env, t, sitio(env, request)), { headers: {
  "content-type": "application/vnd.apple.pkpass", "content-disposition": 'attachment; filename="motoroka.pkpass"',
  "last-modified": new Date(t.act).toUTCString(), "cache-control": "no-store" } });

async function autorizado(env, request, serial) {
  const t = await leerTarjeta(env, serial), a = (request.headers.get("authorization") || "").replace(/^ApplePass /, "");
  return t && a && iguales(a, t.tokenApple) ? t : null;
}
const actualizado = async (env, t) => Math.max(t.act, (await promoActual(env))?.fecha || 0);

export const onRequest = seguro(async ({ request, env, params }) => {
  if (!appleListo(env)) return json({ error: "Apple Wallet aún no está configurado." }, 503);
  const p = [].concat(params.ruta || []), url = new URL(request.url), tipo = cfg(env, "APPLE_PASS_TYPE_ID");
  if (p[0] === "pase" && request.method === "GET") {
    if (!(await limitar(env, "pase:" + ip(request), 30, 60))) return json({ error: "Demasiadas descargas." }, 429);
    const t = await leerTarjeta(env, url.searchParams.get("id"));
    return t ? pkpass(env, request, t) : json({ error: "Tarjeta no encontrada." }, 404);
  }
  if (p[0] !== "v1") return vacio(404);
  if (p[1] === "log") { console.info("passkit", (await request.text()).slice(0, 2000)); return vacio(200); }
  // v1/devices/{dispositivo}/registrations/{tipo}[/{serial}]
  if (p[1] === "devices" && p[3] === "registrations" && p[4] === tipo) {
    const disp = p[2];
    if (!/^[\w-]{1,100}$/.test(disp)) return vacio(400);
    const kd = "apple/disp/" + disp, mios = (await kv(env).get(kd, "json")) || [];
    if (p[5]) {
      const t = await autorizado(env, request, p[5]);
      if (!t) return vacio(401);
      const reg = await dispositivosDe(env, t.id);
      if (request.method === "POST") {
        const { pushToken } = await request.json().catch(() => ({}));
        if (!/^[0-9a-fA-F]{20,200}$/.test(pushToken || "")) return vacio(400);
        const nuevo = !reg[disp]; reg[disp] = pushToken;
        await guardarDispositivos(env, t.id, reg);
        if (!mios.includes(t.id)) await kv(env).put(kd, JSON.stringify([...mios, t.id]));
        return vacio(nuevo ? 201 : 200);
      }
      if (request.method === "DELETE") {
        delete reg[disp];
        await guardarDispositivos(env, t.id, reg);
        await kv(env).put(kd, JSON.stringify(mios.filter((x) => x !== t.id)));
        return vacio(200);
      }
      return vacio(405);
    }
    const desde = Number(url.searchParams.get("passesUpdatedSince")) || 0, cambiados = [];
    let ultimo = desde;
    for (const id of mios) {
      const t = await leerTarjeta(env, id); if (!t) continue;
      const act = await actualizado(env, t);
      if (act > desde) { cambiados.push(id); ultimo = Math.max(ultimo, act); }
    }
    return cambiados.length ? json({ lastUpdated: String(ultimo), serialNumbers: cambiados }) : vacio(204);
  }
  // v1/passes/{tipo}/{serial}
  if (p[1] === "passes" && p[2] === tipo && p[3] && request.method === "GET") {
    const t = await autorizado(env, request, p[3]);
    if (!t) return vacio(401);
    t.act = await actualizado(env, t);
    const desde = Date.parse(request.headers.get("if-modified-since") || "");
    if (desde && Math.floor(t.act / 1000) * 1000 <= desde) return vacio(304);
    return pkpass(env, request, t);
  }
  return vacio(404);
});
