import type { Tables, TablesInsert } from "@/lib/db/types";

export const SERVICES = [
  "Estrategia",
  "Identidad",
  "Redes sociales",
  "Contenido",
  "Web",
  "Pauta",
] as const;
export type Service = (typeof SERVICES)[number];

export const RESPONSABLES = ["Pablo Knauth", "Kevin Juárez"] as const;
export type Responsable = (typeof RESPONSABLES)[number];

export const STAGES = [
  "Nuevo contacto",
  "Contactado",
  "Diagnóstico agendado",
  "Propuesta enviada",
  "Negociación",
  "Cliente ganado",
  "Perdido",
] as const;
export type Stage = (typeof STAGES)[number];

/** Stages where a client no longer needs commercial follow-up. */
export const CLOSED_STAGES: readonly Stage[] = ["Cliente ganado", "Perdido"];

export const TASK_STATUSES = ["Pendiente", "En proceso", "Terminada"] as const;

/** De dónde llegó el cliente: para saber qué canal de marketing de ROJU funciona. */
export const SOURCES = [
  "Instagram",
  "Facebook",
  "Meta Ads",
  "Google",
  "Sitio web",
  "WhatsApp",
  "Referido",
  "Evento o networking",
  "Otro",
] as const;

/** Por qué se perdió un cliente: convierte los "no" en aprendizaje. */
export const LOST_REASONS = [
  "Precio",
  "Eligió a otra agencia",
  "No era el momento",
  "Sin presupuesto",
  "Dejó de responder",
  "No encajaba con nuestros servicios",
  "Otro",
] as const;

/** Tipo de cobro del trato. */
export const DEAL_TYPES = ["Pago único", "Iguala mensual"] as const;

/** Stages that count as open opportunities in the funnel summary. */
export const OPEN_STAGES: readonly Stage[] = [
  "Nuevo contacto",
  "Contactado",
  "Diagnóstico agendado",
  "Propuesta enviada",
  "Negociación",
];

const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
export function formatMoney(value: number | null | undefined): string {
  return value == null ? "" : mxn.format(value);
}

/** Límites de texto: los mismos que valida el servidor (publicar/netlify/functions/crm.mjs). */
export const LIMITS = {
  name: 120,
  company: 120,
  contact: 120,
  email: 160,
  phone: 40,
  notes: 5000,
  title: 200,
  role: 120,
  supplierName: 160,
  productService: 300,
  activity: 2000,
} as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export type Client = Tables<"clients">;
export type ClientInsert = TablesInsert<"clients">;
export type Task = Tables<"tasks">;
export type TaskInsert = TablesInsert<"tasks">;
export type Collaborator = Tables<"collaborators">;
export type CollaboratorInsert = TablesInsert<"collaborators">;
export type CollaboratorTask = Tables<"collaborator_tasks">;
export type CollaboratorTaskInsert = TablesInsert<"collaborator_tasks">;
export type CollaboratorAppointment = Tables<"collaborator_appointments">;
export type CollaboratorAppointmentInsert = TablesInsert<"collaborator_appointments">;
export type Supplier = Tables<"suppliers">;
export type ClientActivity = Tables<"client_activity">;
export type SupplierInsert = TablesInsert<"suppliers">;

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Accent-insensitive, case-insensitive match of a query against any of the given fields. */
export function matchesSearch(query: string, fields: Array<string | null | undefined>): boolean {
  const q = normalize(query.trim());
  if (!q) return true;
  return fields.some((f) => f && normalize(f).includes(q));
}

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function whatsappUrl(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}`;
}

/** Plantillas de WhatsApp por etapa. {nombre} y {responsable} se reemplazan al enviar. */
export const WHATSAPP_TEMPLATES: Record<Stage, string> = {
  "Nuevo contacto":
    "Hola {nombre}, soy {responsable} de ROJU Consulting. Gracias por tu interés. ¿Te parece si agendamos 20 minutos para conocer tu negocio?",
  Contactado:
    "Hola {nombre}, te escribe {responsable} de ROJU Consulting. Quedo pendiente para agendar el diagnóstico de tu marca. ¿Qué día te acomoda esta semana?",
  "Diagnóstico agendado":
    "Hola {nombre}, te confirmo nuestra reunión de diagnóstico. Si puedes, ten a la mano tus redes y tus metas de este año. Saludos, {responsable}.",
  "Propuesta enviada":
    "Hola {nombre}, ¿pudiste revisar la propuesta que te enviamos? Con gusto resuelvo cualquier duda. Saludos, {responsable} (ROJU Consulting).",
  Negociación:
    "Hola {nombre}, ¿cómo vas con la decisión? Si algo de la propuesta no te convence, lo ajustamos. Saludos, {responsable}.",
  "Cliente ganado":
    "Hola {nombre}, ¡bienvenido a ROJU Consulting! En breve te compartimos el calendario de arranque. Saludos, {responsable}.",
  Perdido:
    "Hola {nombre}, gracias por considerarnos. Si más adelante quieres retomar el proyecto, aquí estamos. Saludos, {responsable} (ROJU Consulting).",
};

export function fillTemplate(template: string, client: { name: string; contact?: string; responsable: string }): string {
  // Solo se saluda por nombre si hay persona de contacto; el nombre del cliente suele ser una empresa.
  const nombre = client.contact?.trim().replace(/^(Lic|Ing|Dr|Dra|Mtro|Mtra|Sr|Sra)\.?\s+/i, "").split(/\s+/)[0] ?? "";
  const quien = client.responsable.split(" ")[0] ?? client.responsable;
  return template.replace(" {nombre}", nombre ? ` ${nombre}` : "").replaceAll("{nombre}", nombre).replaceAll("{responsable}", quien);
}

export function whatsappMessageUrl(phone: string, text: string): string | null {
  const base = whatsappUrl(phone);
  return base ? `${base}?text=${encodeURIComponent(text)}` : null;
}
