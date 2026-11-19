// POST /api/crm — base de datos compartida del CRM de ROJU Consulting.
// Solo Pablo Knauth y Kevin Juárez, cada uno con su contraseña (variables de entorno en Netlify):
//   CRM_CLAVE_PABLO, CRM_CLAVE_KEVIN (mínimo 10 caracteres) y, opcional, CRM_TOKEN_SECRET.
// Datos en Netlify Blobs (almacén "roju-crm"): un JSON por tabla, con escritura condicional
// para que dos personas guardando al mismo tiempo no se borren cambios.
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
const DIAS_SESION = 30;

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
};
// Borrado en cascada (ON DELETE CASCADE del esquema original).
const CASCADA = {
  clients: [["tasks", "client_id"], ["client_activity", "client_id"]],
  collaborators: [["collaborator_tasks", "collaborator_id"], ["collaborator_appointments", "collaborator_id"]],
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
  await modificar(tabla, (filas) => {
    if (!filas.some((f) => f.id === id)) throw new ErrorDatos("El registro ya no existe");
    return { nuevas: filas.filter((f) => f.id !== id), resultado: true };
  });
  for (const [hija, campo] of CASCADA[tabla] || []) {
    await modificar(hija, (filas) => ({ nuevas: filas.filter((f) => f[campo] !== id), resultado: true }));
  }
}

export default async (req, context) => {
  // GET /api/crm: diagnóstico sin datos sensibles (no muestra contraseñas, solo si están listas).
  if (req.method === "GET") {
    const estado = (u) => { const n = clave(u).length; return n === 0 ? "falta" : n < 10 ? "muy corta (mínimo 10 caracteres)" : "lista"; };
    // Nombres (nunca valores) de las variables parecidas, con caracteres ocultos visibles, para detectar errores al escribirlas.
    const parecidas = Object.keys(process.env).filter((k) => /clave|crm|pablo|kevin/i.test(k)).map((k) => JSON.stringify(k).slice(1, -1));
    const crudo = (u) => process.env[USUARIOS[u]];
    const detalle = (u) => (crudo(u) === undefined ? "no existe con ese nombre exacto" : crudo(u).trim() === "" ? "existe pero está vacía o solo tiene espacios" : estado(u));
    return json({ servidor: "activo", CRM_CLAVE_PABLO: detalle("Pablo Knauth"), CRM_CLAVE_KEVIN: detalle("Kevin Juárez"), variables_parecidas: parecidas });
  }
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  let d;
  try { d = await req.json(); } catch { return json({ error: "Datos inválidos" }, 400); }

  if (d.accion === "entrar") {
    if (RESPONSABLES.includes(d.usuario) && !lista(d.usuario))
      return json({ error: `La contraseña de ${d.usuario} no está lista en Netlify: ${USUARIOS[d.usuario]} debe tener 10 caracteres o más. Corrígela y vuelve a desplegar.` }, 503);
    if (!(await limitar(context?.ip))) return json({ error: "Demasiados intentos. Espera 15 minutos." }, 429);
    if (!RESPONSABLES.includes(d.usuario) || !iguales(String(d.clave ?? "").trim(), clave(d.usuario))) {
      await new Promise((ok) => setTimeout(ok, 600));
      return json({ error: "Contraseña incorrecta para " + (RESPONSABLES.includes(d.usuario) ? d.usuario : "ese usuario") + ". Cada uno tiene su propia contraseña." }, 401);
    }
    return json(crearToken(d.usuario));
  }

  const usuario = usuarioDelToken(req);
  if (!usuario) return json({ error: "Tu sesión terminó. Vuelve a entrar." }, 401);
  const tabla = d.tabla;
  if (!ESQUEMA[tabla]) return json({ error: "Tabla desconocida" }, 400);

  try {
    if (d.accion === "listar") return json({ filas: (await leer(tabla)).filas });
    if (d.accion === "crear") {
      const base = await limpiar(tabla, d.valores, null), ahora = new Date().toISOString();
      const fila = { ...base, id: randomUUID(), created_at: ahora, updated_at: ahora };
      if (tabla === "client_activity") fila.author = usuario;
      await modificar(tabla, (filas) => {
        if (filas.length >= 20000) throw new ErrorDatos("Se alcanzó el límite de registros");
        return { nuevas: [...filas, fila], resultado: fila };
      });
      if (tabla === "clients") await registrar(fila.id, usuario, "creado", `Registró al cliente en la etapa «${fila.stage}».`);
      return json({ fila });
    }
    if (d.accion === "actualizar") {
      const id = txt(d.id, 60);
      if (tabla === "client_activity") {
        // Pablo y Kevin pueden editar cualquier nota; solo cambia el texto y queda quién la editó.
        const nota = (await leer(tabla)).filas.find((f) => f.id === id);
        if (!nota) return json({ error: "La nota ya no existe" }, 404);
        if (nota.kind !== "nota") return json({ error: "Los registros automáticos no se editan; puedes borrarlos." }, 400);
        const texto = txt(d.valores?.text, 2000);
        if (!texto) return json({ error: "La nota no puede quedar vacía" }, 400);
        const fila = await modificar(tabla, (filas) => {
          const nueva = { ...filas.find((f) => f.id === id), text: texto, edited_by: usuario, updated_at: new Date().toISOString() };
          return { nuevas: filas.map((f) => (f.id === id ? nueva : f)), resultado: nueva };
        });
        return json({ fila });
      }
      const previo = (await leer(tabla)).filas.find((f) => f.id === id);
      if (!previo) return json({ error: "El registro ya no existe" }, 404);
      const limpio = await limpiar(tabla, d.valores, previo);
      const fila = await modificar(tabla, (filas) => {
        const actual = filas.find((f) => f.id === id);
        if (!actual) throw new ErrorDatos("El registro ya no existe");
        const cambios = Object.fromEntries(Object.keys(d.valores || {}).filter((k) => k in ESQUEMA[tabla]).map((k) => [k, limpio[k]]));
        const nueva = { ...actual, ...cambios, updated_at: new Date().toISOString() };
        return { nuevas: filas.map((f) => (f.id === id ? nueva : f)), resultado: nueva };
      });
      if (tabla === "clients" && previo.stage !== fila.stage) {
        const motivo = fila.stage === "Perdido" && fila.lost_reason ? ` Motivo: ${fila.lost_reason}.` : "";
        await registrar(id, usuario, "etapa", `Movió de «${previo.stage}» a «${fila.stage}».${motivo}`);
      }
      return json({ fila });
    }
    if (d.accion === "eliminar") {
      await eliminarConCascada(tabla, txt(d.id, 60));
      return json({ ok: true });
    }
    return json({ error: "Acción desconocida" }, 400);
  } catch (e) {
    if (e instanceof ErrorDatos) return json({ error: e.message }, 400);
    console.error(e);
    return json({ error: e.message || "Error del servidor" }, 500);
  }
};

export const config = { path: "/api/crm" };
