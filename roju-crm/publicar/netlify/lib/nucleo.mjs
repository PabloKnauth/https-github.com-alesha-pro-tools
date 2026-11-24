// Núcleo compartido del CRM de ROJU Consulting: esquema, validación, sesión y almacenamiento.
// Lo usan la API del CRM (functions/crm.mjs), el asistente (functions/asistente.mjs) y los archivos (functions/archivos.mjs).
import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { getStore } from "@netlify/blobs";

const USUARIOS = { "Pablo Knauth": "CRM_CLAVE_PABLO", "Kevin Juárez": "CRM_CLAVE_KEVIN" };
const RESPONSABLES = Object.keys(USUARIOS);
const SERVICIOS = ["Estrategia", "Identidad", "Redes sociales", "Contenido", "Web", "Pauta"];
const ETAPAS = ["Nuevo contacto", "Contactado", "Diagnóstico agendado", "Propuesta enviada", "Negociación", "Cliente ganado", "Perdido"];
const ESTATUS = ["Pendiente", "En proceso", "Terminada"];
const ORIGENES = ["", "Instagram", "Facebook", "Meta Ads", "Google", "Sitio web", "WhatsApp", "Referido", "Evento o networking", "Otro"];
const MOTIVOS = ["", "Precio", "Eligió a otra agencia", "No era el momento", "Sin presupuesto", "Dejó de responder", "No encajaba con nuestros servicios", "Otro"];
const COBROS = ["Pago único", "Iguala mensual"];
const COLORES = ["azul", "naranja", "verde", "rosa", "amarillo", "gris"];
export const LIMITE_PDF = 5 * 1024 * 1024; // Netlify acepta cuerpos de hasta ~6 MB por petición.
const DIAS_SESION = 7; // la sesión vence en una semana

// Mismo esquema que la base original (drizzle/migrations/0000_create_crm_tables.sql en el ZIP de Lovable).
const T = (max, def = "") => ({ tipo: "texto", max, def });
const E = (opciones) => ({ tipo: "enum", opciones, def: opciones[0] });
const ESQUEMA = {
  clients: {
    name: { ...T(120), requerido: true }, company: T(120), contact: T(120), email: T(160), phone: T(40),
    service: E(SERVICIOS), responsable: E(RESPONSABLES), stage: E(ETAPAS), notes: T(5000),
    next_follow_up: { tipo: "fecha" }, next_appointment: { tipo: "instante" },
    deal_value: { tipo: "monto" }, deal_type: E(COBROS), source: E(ORIGENES), lost_reason: E(MOTIVOS),
  },
  // Historial del cliente: notas con fecha y autor, y cambios de etapa (estos los escribe el servidor).
  client_activity: {
    client_id: { tipo: "ref", tabla: "clients", requerido: true }, kind: { tipo: "enum", opciones: ["nota"], def: "nota" },
    text: { ...T(2000), requerido: true },
  },
  tasks: {
    title: { ...T(200), requerido: true }, client_id: { tipo: "ref", tabla: "clients", requerido: true },
    encargado: E(RESPONSABLES), status: E(ESTATUS), due_date: { tipo: "fecha" }, notes: T(5000),
  },
  collaborators: { name: { ...T(120), requerido: true }, role: T(120), email: T(160), phone: T(40), notes: T(5000) },
  collaborator_tasks: {
    collaborator_id: { tipo: "ref", tabla: "collaborators", requerido: true }, title: { ...T(200), requerido: true },
    status: E(ESTATUS), due_date: { tipo: "fecha" }, notes: T(5000),
  },
  collaborator_appointments: {
    collaborator_id: { tipo: "ref", tabla: "collaborators", requerido: true }, title: { ...T(200), requerido: true },
    starts_at: { tipo: "instante", requerido: true }, duration_minutes: { tipo: "minutos", def: 60 },
    meet_link: { tipo: "url", def: "" }, notes: T(5000),
  },
  suppliers: {
    name: { ...T(160), requerido: true }, contact_person: T(120), email: T(160), phone: T(40),
    product_service: T(300), notes: T(5000),
  },
  // Documentos de una tarea: un PDF guardado en Blobs o un enlace (presentación, página).
  attachments: {
    owner_table: E(["tasks", "collaborator_tasks"]), owner_id: { tipo: "ref_dinamica", requerido: true },
    kind: E(["link", "pdf"]), name: { ...T(160), requerido: true }, url: { tipo: "url", def: "" },
  },
  // Perfil de cada usuario: apodo, puesto, color y foto (imagen pequeña ya reducida en el navegador).
  profiles: {
    user: { ...E(RESPONSABLES), requerido: true }, nickname: T(40), title: T(80), color: E(COLORES),
    avatar: { tipo: "imagen" },
  },
};
// Borrado en cascada (ON DELETE CASCADE del esquema original).
const CASCADA = {
  clients: [["tasks", "client_id"], ["client_activity", "client_id"]],
  collaborators: [["collaborator_tasks", "collaborator_id"], ["collaborator_appointments", "collaborator_id"]],
  tasks: [["attachments", "owner_id"]],
  collaborator_tasks: [["attachments", "owner_id"]],
};

class ErrorDatos extends Error {}
const json = (datos, estado = 200) =>
  new Response(JSON.stringify(datos), { status: estado, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

function almacen() {
  if (globalThis.__ROJU_ALMACEN__) return globalThis.__ROJU_ALMACEN__; // pruebas locales
  return getStore({ name: "roju-crm", consistency: "strong" });
}

/* ---------- Sesión ---------- */
const clave = (u) => (process.env[USUARIOS[u]] || "").trim();
const lista = (u) => clave(u).length >= 10;
const configurado = () => RESPONSABLES.some(lista);
const secreto = () => process.env.CRM_TOKEN_SECRET || RESPONSABLES.map(clave).join("\u0000");
const firmar = (s) => createHmac("sha256", secreto()).update(s).digest("base64url");
function iguales(a, b) {
  const x = createHmac("sha256", "roju").update(String(a)).digest(), y = createHmac("sha256", "roju").update(String(b)).digest();
  return timingSafeEqual(x, y);
}
function crearToken(usuario) {
  const vence = Date.now() + DIAS_SESION * 864e5;
  const carga = Buffer.from(JSON.stringify({ u: usuario, vence })).toString("base64url");
  return { token: carga + "." + firmar(carga), vence };
}
function usuarioDelToken(req) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const [carga, firma] = token.split(".");
  if (!carga || !firma || !configurado() || !iguales(firma, firmar(carga))) return null;
  try {
    const d = JSON.parse(Buffer.from(carga, "base64url").toString());
    return d.vence > Date.now() && RESPONSABLES.includes(d.u) && lista(d.u) ? d.u : null;
  } catch { return null; }
}
async function limitar(ip) {
  const k = "limite:entrar:" + (ip || "x"), ahora = Date.now();
  const reg = (await almacen().get(k, { type: "json" })) || { n: 0, desde: ahora };
  if (ahora - reg.desde > 15 * 60e3) { reg.n = 0; reg.desde = ahora; }
  reg.n++; await almacen().setJSON(k, reg);
  return reg.n <= 10;
}

/* ---------- Validación ---------- */
const txt = (v, max) => String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
function valor(def, v) {
  switch (def.tipo) {
    case "texto": return txt(v, def.max);
    case "enum":
      if (!def.opciones.includes(v)) throw new ErrorDatos(`Valor no permitido: ${txt(v, 40)}`);
      return v;
    case "fecha":
      if (v == null || v === "") return null;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || isNaN(Date.parse(v))) throw new ErrorDatos("Fecha inválida");
      return v;
    case "instante":
      if (v == null || v === "") return null;
      if (isNaN(Date.parse(v))) throw new ErrorDatos("Fecha y hora inválidas");
      return new Date(v).toISOString();
    case "minutos": {
      const n = Math.round(Number(v));
      if (!Number.isFinite(n) || n <= 0 || n > 24 * 60) throw new ErrorDatos("Duración inválida");
      return n;
    }
    case "url": {
      const s = txt(v, 500);
      if (s && !/^https:\/\//i.test(s)) throw new ErrorDatos("El enlace debe empezar con https://");
      return s;
    }
    case "ref": return txt(v, 60);
    case "ref_dinamica": return txt(v, 60);
    case "imagen": {
      if (v == null || v === "") return "";
      const s = String(v);
      if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s)) throw new ErrorDatos("Imagen inválida");
      if (s.length > 200_000) throw new ErrorDatos("La imagen es demasiado grande");
      return s;
    }
    case "monto": {
      if (v == null || v === "") return null;
      const n = Math.round(Number(v) * 100) / 100;
      if (!Number.isFinite(n) || n < 0 || n > 1e9) throw new ErrorDatos("Monto inválido");
      return n;
    }
  }
}
async function limpiar(tabla, entrada, previo) {
  const esquema = ESQUEMA[tabla], fila = previo ? { ...previo } : {};
  if (tabla === "attachments" && entrada && "owner_id" in entrada) {
    const dueno = (await leer(entrada.owner_table)).filas;
    if (!ESQUEMA[entrada.owner_table] || !dueno.some((f) => f.id === entrada.owner_id)) throw new ErrorDatos("La tarea ya no existe");
  }
  for (const [campo, def] of Object.entries(esquema)) {
    if (campo in (entrada || {})) fila[campo] = valor(def, entrada[campo]);
    else if (!previo) fila[campo] = def.def === undefined ? null : def.def;
    if (def.requerido && (fila[campo] == null || fila[campo] === "")) throw new ErrorDatos(`Falta el campo obligatorio: ${campo}`);
    if (def.tipo === "ref" && campo in (entrada || {})) {
      const padres = await leer(def.tabla);
      if (!padres.filas.some((p) => p.id === fila[campo])) throw new ErrorDatos("El registro relacionado ya no existe");
    }
  }
  return fila;
}

/* ---------- Almacenamiento con escritura condicional ---------- */
async function leer(tabla) {
  const r = await almacen().getWithMetadata("tabla:" + tabla, { type: "json" });
  return { filas: r?.data ?? [], etag: r?.etag };
}
async function modificar(tabla, cambio) {
  for (let intento = 0; intento < 6; intento++) {
    const { filas, etag } = await leer(tabla);
    const { nuevas, resultado } = await cambio(filas);
    const r = await almacen().setJSON("tabla:" + tabla, nuevas, etag ? { onlyIfMatch: etag } : { onlyIfNew: true });
    if (r?.modified !== false) return resultado;
    await new Promise((ok) => setTimeout(ok, 60 + Math.random() * 140));
  }
  throw new Error("Otra persona está guardando al mismo tiempo. Intenta de nuevo.");
}
async function registrar(client_id, author, kind, text) {
  const ahora = new Date().toISOString();
  const fila = { id: randomUUID(), client_id, author, kind, text: txt(text, 2000), created_at: ahora, updated_at: ahora };
  await modificar("client_activity", (filas) => ({ nuevas: [...filas, fila], resultado: fila }));
}

async function eliminarConCascada(tabla, id) {
  let borrada;
  await modificar(tabla, (filas) => {
    borrada = filas.find((f) => f.id === id);
    if (!borrada) throw new ErrorDatos("El registro ya no existe");
    return { nuevas: filas.filter((f) => f.id !== id), resultado: true };
  });
  if (tabla === "attachments" && borrada.blob_key) await almacen().delete(borrada.blob_key);
  for (const [hija, campo] of CASCADA[tabla] || []) {
    let quitadas = [];
    await modificar(hija, (filas) => {
      quitadas = filas.filter((f) => f[campo] === id && (hija !== "attachments" || f.owner_table === tabla));
      return { nuevas: filas.filter((f) => !quitadas.includes(f)), resultado: true };
    });
    for (const q of quitadas) {
      if (hija === "attachments" && q.blob_key) await almacen().delete(q.blob_key);
      if (CASCADA[hija]) for (const [nieta, c2] of CASCADA[hija]) {
        let fuera = [];
        await modificar(nieta, (filas) => {
          fuera = filas.filter((f) => f[c2] === q.id && (nieta !== "attachments" || f.owner_table === hija));
          return { nuevas: filas.filter((f) => !fuera.includes(f)), resultado: true };
        });
        for (const f of fuera) if (f.blob_key) await almacen().delete(f.blob_key);
      }
    }
  }
}

/* ---------- Operaciones (las usan la API del CRM y el asistente) ---------- */
export async function crearFila(tabla, valores, usuario) {
  if (tabla === "profiles") return guardarPerfil(valores, usuario);
  const base = await limpiar(tabla, valores, null), ahora = new Date().toISOString();
  const fila = { ...base, id: randomUUID(), created_at: ahora, updated_at: ahora };
  if (tabla === "client_activity" || tabla === "attachments") fila.author = usuario;
  if (tabla === "attachments" && fila.kind === "pdf") throw new ErrorDatos("Los PDF se suben con /api/archivos");
  if (tabla === "attachments" && !fila.url) throw new ErrorDatos("Escribe el enlace (https://…)");
  await modificar(tabla, (filas) => {
    if (filas.length >= 20000) throw new ErrorDatos("Se alcanzó el límite de registros");
    return { nuevas: [...filas, fila], resultado: fila };
  });
  if (tabla === "clients") await registrar(fila.id, usuario, "creado", `Registró al cliente en la etapa «${fila.stage}».`);
  return fila;
}

export async function actualizarFila(tabla, id, valores, usuario) {
  if (tabla === "client_activity") {
    const nota = (await leer(tabla)).filas.find((f) => f.id === id);
    if (!nota) throw new ErrorDatos("La nota ya no existe");
    if (nota.kind !== "nota") throw new ErrorDatos("Los registros automáticos no se editan; puedes borrarlos.");
    const texto = txt(valores?.text, 2000);
    if (!texto) throw new ErrorDatos("La nota no puede quedar vacía");
    return modificar(tabla, (filas) => {
      const nueva = { ...filas.find((f) => f.id === id), text: texto, edited_by: usuario, updated_at: new Date().toISOString() };
      return { nuevas: filas.map((f) => (f.id === id ? nueva : f)), resultado: nueva };
    });
  }
  if (tabla === "profiles") return guardarPerfil(valores, usuario);
  const previo = (await leer(tabla)).filas.find((f) => f.id === id);
  if (!previo) throw new ErrorDatos("El registro ya no existe");
  const permitidos = Object.keys(valores || {}).filter((k) => k in ESQUEMA[tabla] && !(tabla === "attachments" && ["owner_table", "owner_id", "kind"].includes(k)));
  const entrada = Object.fromEntries(permitidos.map((k) => [k, valores[k]]));
  const limpio = await limpiar(tabla, entrada, previo);
  const fila = await modificar(tabla, (filas) => {
    const actual = filas.find((f) => f.id === id);
    if (!actual) throw new ErrorDatos("El registro ya no existe");
    const cambios = Object.fromEntries(permitidos.map((k) => [k, limpio[k]]));
    const nueva = { ...actual, ...cambios, updated_at: new Date().toISOString() };
    return { nuevas: filas.map((f) => (f.id === id ? nueva : f)), resultado: nueva };
  });
  if (tabla === "clients" && previo.stage !== fila.stage) {
    const motivo = fila.stage === "Perdido" && fila.lost_reason ? ` Motivo: ${fila.lost_reason}.` : "";
    await registrar(id, usuario, "etapa", `Movió de «${previo.stage}» a «${fila.stage}».${motivo}`);
  }
  return fila;
}

/** Un perfil por usuario: Pablo y Kevin pueden editar ambos (los dos tienen todos los permisos). */
async function guardarPerfil(valores, usuario) {
  const quien = RESPONSABLES.includes(valores?.user) ? valores.user : usuario;
  const ahora = new Date().toISOString();
  return modificar("profiles", async (filas) => {
    const previo = filas.find((f) => f.user === quien);
    const entrada = Object.fromEntries(Object.entries(valores || {}).filter(([k]) => ["nickname", "title", "color", "avatar"].includes(k)));
    const limpio = await limpiar("profiles", { ...entrada, user: quien }, previo ?? null);
    const fila = { ...(previo ?? { id: randomUUID(), created_at: ahora }), ...limpio, user: quien, updated_at: ahora };
    return { nuevas: previo ? filas.map((f) => (f.user === quien ? fila : f)) : [...filas, fila], resultado: fila };
  });
}

export async function guardarPdf({ owner_table, owner_id, name, bytes }, usuario) {
  if (!["tasks", "collaborator_tasks"].includes(owner_table)) throw new ErrorDatos("Tipo de tarea inválido");
  if (!(await leer(owner_table)).filas.some((f) => f.id === owner_id)) throw new ErrorDatos("La tarea ya no existe");
  if (bytes.byteLength === 0) throw new ErrorDatos("El archivo está vacío");
  if (bytes.byteLength > LIMITE_PDF) throw new ErrorDatos("El PDF pesa más de 5 MB");
  const cabeza = Buffer.from(bytes.slice(0, 5)).toString("latin1");
  if (cabeza !== "%PDF-") throw new ErrorDatos("El archivo no es un PDF");
  const id = randomUUID(), blob_key = "archivo:" + id, ahora = new Date().toISOString();
  await almacen().set(blob_key, bytes, { metadata: { tipo: "application/pdf" } });
  const nombre = txt(name, 160).replace(/[\\/]/g, "-") || "documento.pdf";
  const fila = { id, owner_table, owner_id, kind: "pdf", name: nombre, url: "", blob_key, size: bytes.byteLength, author: usuario, created_at: ahora, updated_at: ahora };
  try {
    await modificar("attachments", (filas) => ({ nuevas: [...filas, fila], resultado: fila }));
  } catch (e) {
    await almacen().delete(blob_key);
    throw e;
  }
  return fila;
}

export async function leerPdf(id) {
  const fila = (await leer("attachments")).filas.find((f) => f.id === id && f.kind === "pdf");
  if (!fila) return null;
  const datos = await almacen().get(fila.blob_key, { type: "arrayBuffer" });
  return datos ? { fila, datos } : null;
}

export { ESQUEMA, ErrorDatos, json, leer, eliminarConCascada, usuarioDelToken, txt, almacen, RESPONSABLES, USUARIOS, SERVICIOS, ETAPAS, ESTATUS, ORIGENES, MOTIVOS, COBROS, clave, lista, limitar, iguales, crearToken };
