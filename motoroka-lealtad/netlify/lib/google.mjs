// Google Wallet (programa de lealtad): enlace "Guardar en Google Wallet", actualización de sellos y mensajes de promoción.
import { createSign } from "node:crypto";
import { env, resumen, NEGOCIO, RECOMPENSA, SELLOS_META } from "./nucleo.mjs";

const API = "https://walletobjects.googleapis.com/walletobjects/v1";
export const googleListo = () => !!(env("GOOGLE_ISSUER_ID") && env("GOOGLE_SA_JSON"));
const cuenta = () => JSON.parse(env("GOOGLE_SA_JSON"));
const claseId = () => `${env("GOOGLE_ISSUER_ID")}.motoroka_lealtad`;
const objetoId = (t) => `${env("GOOGLE_ISSUER_ID")}.${t.id.replace(/[^\w.-]/g, "_")}`;

function jwt(carga, llave) {
  const b = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const cuerpo = b({ alg: "RS256", typ: "JWT" }) + "." + b(carga);
  return cuerpo + "." + createSign("RSA-SHA256").update(cuerpo).sign(llave, "base64url");
}

let token = { valor: "", vence: 0 };
async function acceso() {
  if (token.vence > Date.now() + 60e3) return token.valor;
  const sa = cuenta(), ahora = Math.floor(Date.now() / 1000);
  const asercion = jwt({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/wallet_object.issuer",
    aud: "https://oauth2.googleapis.com/token", iat: ahora, exp: ahora + 3600 }, sa.private_key);
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: asercion }) });
  if (!r.ok) throw new Error("Google OAuth " + r.status);
  const d = await r.json();
  token = { valor: d.access_token, vence: Date.now() + d.expires_in * 1000 };
  return token.valor;
}
async function api(metodo, ruta, cuerpo) {
  const r = await fetch(API + ruta, { method: metodo, headers: { authorization: "Bearer " + (await acceso()), "content-type": "application/json" },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  return { estado: r.status, datos: await r.json().catch(() => ({})) };
}

function clase(base) {
  return {
    id: claseId(), issuerName: NEGOCIO, programName: "Tarjeta de lealtad", reviewStatus: "UNDER_REVIEW",
    programLogo: { sourceUri: { uri: base + "/assets/img/logo-660.png" }, contentDescription: { defaultValue: { language: "es-MX", value: NEGOCIO } } },
    hexBackgroundColor: "#0b0d12",
    textModulesData: [{ id: "regla", header: "Cómo funciona", body: `Cada servicio suma un sello. Al juntar ${SELLOS_META}, tu siguiente servicio es un ${RECOMPENSA}.` }],
    linksModuleData: { uris: [{ id: "wa", uri: "https://wa.me/527226665997", description: "WhatsApp del taller" }] },
    multipleDevicesAndHoldersAllowedStatus: "ONE_USER_ALL_DEVICES",
  };
}
function objeto(t, base) {
  const r = resumen(t);
  return {
    id: objetoId(t), classId: claseId(), state: "ACTIVE", accountId: t.codigo, accountName: t.nombre,
    loyaltyPoints: { label: "Sellos", balance: { string: r.puntos } },
    secondaryLoyaltyPoints: { label: "Progreso", balance: { string: r.estado } },
    barcode: { type: "QR_CODE", value: `${base}/panel.html#${t.id}`, alternateText: t.codigo },
    linksModuleData: { uris: [{ id: "web", uri: `${base}/tarjeta.html#${t.id}`, description: "Ver mi tarjeta" }] },
  };
}

// Crea la clase la primera vez (o la actualiza si ya existe).
export async function asegurarClase(base) {
  const r = await api("GET", "/loyaltyClass/" + claseId());
  if (r.estado === 404) return api("POST", "/loyaltyClass", clase(base));
  return r;
}

export async function enlaceGuardar(t, base) {
  await asegurarClase(base);
  const sa = cuenta();
  const firmado = jwt({ iss: sa.client_email, aud: "google", typ: "savetowallet", origins: [base],
    payload: { loyaltyObjects: [objeto(t, base)] } }, sa.private_key);
  return "https://pay.google.com/gp/v/save/" + firmado;
}

// Tras sellar o canjear: si el cliente ya guardó la tarjeta, se actualiza y Google le avisa.
export async function actualizarGoogle(t, base, aviso) {
  if (!googleListo()) return null;
  const cuerpo = objeto(t, base);
  if (aviso) cuerpo.messages = [{ id: "m" + Date.now(), header: "Moto Roka", body: aviso, messageType: "TEXT_AND_NOTIFY" }];
  const r = await api("PATCH", "/loyaltyObject/" + encodeURIComponent(cuerpo.id), cuerpo);
  return r.estado; // 404 = aún no la guarda en Google Wallet
}

// Promoción para todos los que tienen la tarjeta en Google Wallet (Google limita los avisos por pase al día).
export async function promoGoogle(titulo, texto) {
  if (!googleListo()) return null;
  const r = await api("POST", `/loyaltyClass/${claseId()}/addMessage`,
    { message: { id: "p" + Date.now(), header: titulo, body: texto, messageType: "TEXT_AND_NOTIFY" } });
  return r.estado;
}
