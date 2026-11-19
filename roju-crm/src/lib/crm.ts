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
