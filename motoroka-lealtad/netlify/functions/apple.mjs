// Apple Wallet: descarga del pase y servicio web de PassKit (registro de iPhones y actualizaciones).
import { json, leerTarjeta, sitio, env, iguales, limitar } from "../lib/nucleo.mjs";
import { appleListo, crearPase, dispositivosDe, guardarDispositivos } from "../lib/apple.mjs";
import { almacen } from "../lib/nucleo.mjs";

export const config = { path: ["/api/apple/pase", "/api/apple/v1/*"] };

const pkpass = async (t, req) => new Response(await crearPase(t, sitio(req)), { headers: {
  "content-type": "application/vnd.apple.pkpass", "content-disposition": 'attachment; filename="motoroka.pkpass"',
  "last-modified": new Date(t.act).toUTCString(), "cache-control": "no-store" } });

async function autorizado(req, serial) {
  const t = await leerTarjeta(serial);
  const a = (req.headers.get("authorization") || "").replace(/^ApplePass /, "");
  return t && a && iguales(a, t.tokenApple) ? t : null;
}

export default async (req, context) => {
  try {
    if (!appleListo()) return json({ error: "Apple Wallet aún no está configurado." }, 503);
    const url = new URL(req.url), p = url.pathname.replace(/^\/api\/apple/, "").split("/").filter(Boolean);
    if (p[0] === "pase") {
      if (!(await limitar("pase:" + (context?.ip || "x"), 30, 60))) return json({ error: "Demasiadas descargas." }, 429);
      const t = await leerTarjeta(url.searchParams.get("id"));
      return t ? pkpass(t, req) : json({ error: "Tarjeta no encontrada." }, 404);
    }
    const tipo = env("APPLE_PASS_TYPE_ID");
    if (p[1] === "log") { console.info("passkit log", (await req.text()).slice(0, 2000)); return new Response(null, { status: 200 }); }
    // /v1/devices/{dispositivo}/registrations/{tipo}[/{serial}]
    if (p[1] === "devices" && p[3] === "registrations" && p[4] === tipo) {
      const dispositivo = p[2];
      if (!/^[\w-]{1,100}$/.test(dispositivo)) return new Response(null, { status: 400 });
      const s = await almacen(), kd = "apple/disp/" + dispositivo;
      const mios = (await s.get(kd, { type: "json" })) || [];
      if (p[5]) {
        const t = await autorizado(req, p[5]);
        if (!t) return new Response(null, { status: 401 });
        const reg = await dispositivosDe(t.id);
        if (req.method === "POST") {
          const { pushToken } = await req.json().catch(() => ({}));
          if (!pushToken || !/^[0-9a-fA-F]{20,200}$/.test(pushToken)) return new Response(null, { status: 400 });
          const nuevo = !reg[dispositivo]; reg[dispositivo] = pushToken;
          await guardarDispositivos(t.id, reg);
          if (!mios.includes(t.id)) { mios.push(t.id); await s.setJSON(kd, mios); }
          return new Response(null, { status: nuevo ? 201 : 200 });
        }
        if (req.method === "DELETE") {
          delete reg[dispositivo]; await guardarDispositivos(t.id, reg);
          await s.setJSON(kd, mios.filter((x) => x !== t.id));
          return new Response(null, { status: 200 });
        }
        return new Response(null, { status: 405 });
      }
      // GET: ¿qué pases de este iPhone cambiaron?
      const desde = Number(url.searchParams.get("passesUpdatedSince")) || 0;
      const promo = await s.get("config/promo", { type: "json" });
      let ultimo = desde; const cambiados = [];
      for (const id of mios) {
        const t = await leerTarjeta(id); if (!t) continue;
        const act = Math.max(t.act, promo?.fecha || 0);
        if (act > desde) { cambiados.push(id); ultimo = Math.max(ultimo, act); }
      }
      if (!cambiados.length) return new Response(null, { status: 204 });
      return json({ lastUpdated: String(ultimo), serialNumbers: cambiados });
    }
    // /v1/passes/{tipo}/{serial}: versión más reciente del pase
    if (p[1] === "passes" && p[2] === tipo && p[3] && req.method === "GET") {
      const t = await autorizado(req, p[3]);
      if (!t) return new Response(null, { status: 401 });
      const promo = await (await almacen()).get("config/promo", { type: "json" });
      t.act = Math.max(t.act, promo?.fecha || 0);
      const desde = Date.parse(req.headers.get("if-modified-since") || "");
      if (desde && Math.floor(t.act / 1000) * 1000 <= desde) return new Response(null, { status: 304 });
      return pkpass(t, req);
    }
    return new Response(null, { status: 404 });
  } catch (e) {
    console.error("apple", e);
    return json({ error: "Error del servidor." }, 500);
  }
};
