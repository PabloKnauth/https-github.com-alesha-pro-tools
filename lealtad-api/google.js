// Google Wallet (programa de lealtad): enlace "Guardar", actualización de sellos y mensajes.
import { cfg, resumen, NEGOCIO, RECOMPENSA, SELLOS_META } from "./nucleo.js";

const API = "https://walletobjects.googleapis.com/walletobjects/v1";
export const googleListo = (env) => !!(cfg(env, "GOOGLE_ISSUER_ID") && cfg(env, "GOOGLE_SA_JSON"));
const cuenta = (env) => JSON.parse(cfg(env, "GOOGLE_SA_JSON"));
const claseId = (env) => `${cfg(env, "GOOGLE_ISSUER_ID")}.motoroka_lealtad`;
const objetoId = (env, t) => `${cfg(env, "GOOGLE_ISSUER_ID")}.${t.id.replace(/[^\w.-]/g, "_")}`;
const b64url = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

let llaveCache;
async function jwt(env, carga) {
  const sa = cuenta(env);
  if (!llaveCache) {
    const der = Uint8Array.from(atob(sa.private_key.replace(/-----[^-]+-----|\s/g, "")), (c) => c.charCodeAt(0));
    llaveCache = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  }
  const cuerpo = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" })) + "." + b64url(JSON.stringify(carga));
  const f = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", llaveCache, new TextEncoder().encode(cuerpo)));
  return cuerpo + "." + btoa(String.fromCharCode(...f)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

let token = { valor: "", vence: 0 };
async function acceso(env) {
  if (token.vence > Date.now() + 60e3) return token.valor;
  const sa = cuenta(env), ahora = Math.floor(Date.now() / 1000);
  const asercion = await jwt(env, { iss: sa.client_email, scope: "https://www.googleapis.com/auth/wallet_object.issuer",
    aud: "https://oauth2.googleapis.com/token", iat: ahora, exp: ahora + 3600 });
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: asercion }) });
  if (!r.ok) throw new Error("Google OAuth " + r.status);
  const d = await r.json();
  token = { valor: d.access_token, vence: Date.now() + d.expires_in * 1000 };
  return token.valor;
}
async function api(env, metodo, ruta, cuerpo) {
  const r = await fetch(API + ruta, { method: metodo, headers: { authorization: "Bearer " + (await acceso(env)), "content-type": "application/json" },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  return { estado: r.status, datos: await r.json().catch(() => ({})) };
}

function clase(env, base) {
  return {
    id: claseId(env), issuerName: NEGOCIO, programName: "Tarjeta de lealtad", reviewStatus: "UNDER_REVIEW",
    programLogo: { sourceUri: { uri: base + "/a/logo-660.png" }, contentDescription: { defaultValue: { language: "es-MX", value: NEGOCIO } } },
    hexBackgroundColor: "#0b0d12",
    textModulesData: [{ id: "regla", header: "Cómo funciona", body: `Cada servicio suma un sello. Al juntar ${SELLOS_META}, tu siguiente servicio es un ${RECOMPENSA}. En tu cumpleaños te espera un regalo.` }],
    linksModuleData: { uris: [{ id: "wa", uri: "https://wa.me/527226665997", description: "WhatsApp del taller" }] },
    multipleDevicesAndHoldersAllowedStatus: "ONE_USER_ALL_DEVICES",
  };
}
function objeto(env, t, base) {
  const r = resumen(t, env);
  return {
    id: objetoId(env, t), classId: claseId(env), state: "ACTIVE", accountId: t.codigo, accountName: t.nombre,
    loyaltyPoints: { label: "Sellos", balance: { string: r.puntos } },
    secondaryLoyaltyPoints: { label: "Progreso", balance: { string: r.estado } },
    textModulesData: [{ id: "cumple", header: "Cumpleaños", body: r.textoCumple }],
    barcode: { type: "QR_CODE", value: `${base}/panel.html#${t.id}`, alternateText: t.codigo },
    linksModuleData: { uris: [{ id: "web", uri: `${base}/tarjeta.html#${t.id}`, description: "Ver mi tarjeta" }] },
  };
}

export async function enlaceGuardar(env, t, base) {
  const c = await api(env, "GET", "/loyaltyClass/" + claseId(env));
  if (c.estado === 404) await api(env, "POST", "/loyaltyClass", clase(env, base));
  const sa = cuenta(env);
  return "https://pay.google.com/gp/v/save/" + await jwt(env, { iss: sa.client_email, aud: "google", typ: "savetowallet",
    origins: [new URL(base).origin], payload: { loyaltyObjects: [objeto(env, t, base)] } });
}

// Actualiza la tarjeta guardada; con `aviso`, Google muestra una notificación. 404 = aún no la guarda.
export async function actualizarGoogle(env, t, base, aviso) {
  if (!googleListo(env)) return null;
  const cuerpo = objeto(env, t, base);
  if (aviso) cuerpo.messages = [{ id: "m" + Date.now(), header: "Moto Roka", body: aviso, messageType: "TEXT_AND_NOTIFY" }];
  return (await api(env, "PATCH", "/loyaltyObject/" + encodeURIComponent(cuerpo.id), cuerpo)).estado;
}

// Promoción para todos los que la tienen en Google Wallet (Google limita los avisos por pase al día).
export async function promoGoogle(env, titulo, texto) {
  if (!googleListo(env)) return null;
  return (await api(env, "POST", `/loyaltyClass/${claseId(env)}/addMessage`,
    { message: { id: "p" + Date.now(), header: titulo, body: texto, messageType: "TEXT_AND_NOTIFY" } })).estado;
}
