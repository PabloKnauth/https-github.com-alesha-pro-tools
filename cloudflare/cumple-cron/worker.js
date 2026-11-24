// Worker programado: cada mañana pide a la tarjeta de lealtad que felicite a quien cumple años hoy.
// Variables: SITIO (p. ej. https://motorokafixshop.pages.dev) y el secreto CRON_CLAVE (el mismo que en Pages).
// Disparador cron: "7 15 * * *" (9:07 a. m. en Malinalco).
export default {
  async scheduled(evento, env, ctx) {
    const r = await fetch(env.SITIO.replace(/\/$/, "") + "/lealtad/api/cumple", { method: "POST", headers: { "x-cron-clave": env.CRON_CLAVE } });
    console.log("cumpleaños", r.status, await r.text());
  },
};
