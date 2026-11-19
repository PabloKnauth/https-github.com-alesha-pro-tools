/**
 * Modo vista previa (VITE_DEMO=1): sin servidor. Los datos viven solo en este navegador
 * y empiezan con registros de ejemplo. El CRM real usa la API de Netlify y empieza vacío.
 */
import type { Database } from "@/lib/db/types";

type Tablas = Database["public"]["Tables"];
type Nombre = keyof Tablas;
type Fila = Record<string, unknown> & { id: string };

const LLAVE = "roju-crm-vista-previa-v2";
const autor = () => {
  try {
    return (JSON.parse(localStorage.getItem("roju-crm-sesion") ?? "null") as { usuario?: string } | null)?.usuario ?? "Pablo Knauth";
  } catch {
    return "Pablo Knauth";
  }
};
let memoria: Record<string, Fila[]> | null = null;

const dia = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const instante = (n: number, h: number, m = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};
const id = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

function ejemplo(): Record<string, Fila[]> {
  const ahora = new Date().toISOString();
  const base = { created_at: ahora, updated_at: ahora };
  const c = (o: Record<string, unknown>): Fila => ({
    id: id(), company: "", contact: "", email: "", phone: "", notes: "", next_follow_up: null, next_appointment: null,
    deal_value: null, deal_type: "Pago único", source: "", lost_reason: "", ...base, ...o,
  } as Fila);
  const clients = [
    c({ name: "Café Aurora", company: "Aurora Tostadores", contact: "Mariana López", email: "mariana@ejemplo.com", phone: "5512345678", service: "Identidad", responsable: "Pablo Knauth", stage: "Propuesta enviada", next_follow_up: dia(-1), notes: "Quiere rediseño de logo y empaque.", deal_value: 18000, source: "Instagram" }),
    c({ name: "Clínica Dental Sonríe", company: "Sonríe", contact: "Dr. Ramírez", service: "Redes sociales", responsable: "Kevin Juárez", stage: "Diagnóstico agendado", next_follow_up: dia(0), next_appointment: instante(1, 11), deal_value: 6500, deal_type: "Iguala mensual", source: "Referido" }),
    c({ name: "Gimnasio Fuerza Norte", company: "Fuerza Norte", service: "Pauta", responsable: "Kevin Juárez", stage: "Nuevo contacto", next_follow_up: dia(2), source: "Meta Ads" }),
    c({ name: "Hotel Casa Jade", company: "Casa Jade", service: "Web", responsable: "Pablo Knauth", stage: "Negociación", next_follow_up: dia(4), deal_value: 45000, source: "Sitio web" }),
    c({ name: "Panadería La Espiga", company: "La Espiga", service: "Contenido", responsable: "Pablo Knauth", stage: "Cliente ganado", deal_value: 8000, deal_type: "Iguala mensual", source: "Instagram" }),
    c({ name: "Ferretería El Clavo", service: "Estrategia", responsable: "Kevin Juárez", stage: "Contactado", next_follow_up: dia(6), source: "WhatsApp" }),
    c({ name: "Boutique Lirio", service: "Contenido", responsable: "Kevin Juárez", stage: "Perdido", deal_value: 12000, source: "Instagram", lost_reason: "Precio" }),
  ];
  const [aurora, sonrie, fuerza, jade, espiga] = clients;
  const t = (o: Record<string, unknown>): Fila => ({ id: id(), notes: "", due_date: null, status: "Pendiente", ...base, ...o } as Fila);
  const tasks = [
    t({ title: "Enviar propuesta de identidad", client_id: aurora!.id, encargado: "Pablo Knauth", due_date: dia(-2) }),
    t({ title: "Preparar diagnóstico de redes", client_id: sonrie!.id, encargado: "Kevin Juárez", due_date: dia(0), status: "En proceso" }),
    t({ title: "Cotizar campaña de Meta Ads", client_id: fuerza!.id, encargado: "Kevin Juárez", due_date: dia(3) }),
    t({ title: "Mapa del sitio y textos", client_id: jade!.id, encargado: "Pablo Knauth", due_date: dia(9) }),
    t({ title: "Calendario de contenido de diciembre", client_id: espiga!.id, encargado: "Pablo Knauth" }),
    t({ title: "Entrega de manual de marca", client_id: espiga!.id, encargado: "Kevin Juárez", due_date: dia(-6), status: "Terminada" }),
  ];
  const k = (o: Record<string, unknown>): Fila => ({ id: id(), email: "", phone: "", notes: "", ...base, ...o } as Fila);
  const collaborators = [
    k({ name: "Ana Torres", role: "Fotografía", email: "ana@ejemplo.com", phone: "5598765432" }),
    k({ name: "Luis Mendoza", role: "Desarrollo web", email: "luis@ejemplo.com" }),
  ];
  const [ana, luis] = collaborators;
  const collaborator_tasks = [
    t({ collaborator_id: ana!.id, title: "Sesión de fotos para Café Aurora", due_date: dia(1) }),
    t({ collaborator_id: luis!.id, title: "Maqueta del sitio de Casa Jade", due_date: dia(5), status: "En proceso" }),
  ];
  const collaborator_appointments = [
    { id: id(), collaborator_id: ana!.id, title: "Revisión de fotos", starts_at: instante(2, 16), duration_minutes: 60, meet_link: "https://meet.google.com/abc-defg-hij", notes: "", ...base },
    { id: id(), collaborator_id: luis!.id, title: "Kickoff del sitio web", starts_at: instante(3, 10, 30), duration_minutes: 30, meet_link: "", notes: "", ...base },
  ] as Fila[];
  const s = (o: Record<string, unknown>): Fila => ({ id: id(), contact_person: "", email: "", phone: "", notes: "", product_service: "", ...base, ...o } as Fila);
  const suppliers = [
    s({ name: "Imprenta Luna", contact_person: "Jorge Luna", product_service: "Impresión de tarjetas y lonas" }),
    s({ name: "Hosting Sol", product_service: "Hosting y dominios" }),
    s({ name: "Estudio Eco", contact_person: "Paola Ruiz", product_service: "Grabación de voz y audio" }),
  ];
  const hace = (n: number, h: number) => instante(-n, h);
  const client_activity = [
    { id: id(), client_id: aurora!.id, author: "Pablo Knauth", kind: "creado", text: "Registró al cliente en la etapa «Nuevo contacto».", created_at: hace(9, 10), updated_at: hace(9, 10) },
    { id: id(), client_id: aurora!.id, author: "Kevin Juárez", kind: "nota", text: "Llamé a Mariana: quiere ver opciones de empaque antes de decidir el logo.", created_at: hace(5, 17), updated_at: hace(5, 17) },
    { id: id(), client_id: aurora!.id, author: "Pablo Knauth", kind: "etapa", text: "Movió de «Diagnóstico agendado» a «Propuesta enviada».", created_at: hace(2, 12), updated_at: hace(2, 12) },
  ] as Fila[];
  return { clients, tasks, collaborators, collaborator_tasks, collaborator_appointments, suppliers, client_activity };
}

function datos(): Record<string, Fila[]> {
  if (memoria) return memoria;
  try {
    const g = localStorage.getItem(LLAVE);
    if (g) return (memoria = JSON.parse(g));
  } catch { /* sin almacenamiento */ }
  return (memoria = ejemplo());
}
function guardar() {
  try { localStorage.setItem(LLAVE, JSON.stringify(memoria)); } catch { /* sin almacenamiento */ }
}
export function reiniciarEjemplo() {
  memoria = ejemplo();
  guardar();
}

const espera = <T,>(v: T) => new Promise<T>((ok) => setTimeout(() => ok(structuredClone(v)), 120));
const CASCADA: Record<string, Array<[string, string]>> = {
  clients: [["tasks", "client_id"], ["client_activity", "client_id"]],
  collaborators: [["collaborator_tasks", "collaborator_id"], ["collaborator_appointments", "collaborator_id"]],
};

export const demoDb = {
  listar: (t: Nombre) => espera(datos()[t] ?? []),
  crear: (t: Nombre, v: Record<string, unknown>) => {
    const ahora = new Date().toISOString();
    const fila = { ...v, id: id(), created_at: ahora, updated_at: ahora } as Fila;
    if (t === "client_activity") fila["author"] = autor();
    datos()[t] = [...(datos()[t] ?? []), fila];
    guardar();
    return espera(fila);
  },
  actualizar: (t: Nombre, fid: string, v: Record<string, unknown>) => {
    let nueva: Fila | undefined;
    const previa = (datos()[t] ?? []).find((f) => f.id === fid);
    if (t === "clients" && previa && v["stage"] && v["stage"] !== previa["stage"]) {
      const ahora = new Date().toISOString();
      const motivo = v["stage"] === "Perdido" && v["lost_reason"] ? ` Motivo: ${String(v["lost_reason"])}.` : "";
      datos()["client_activity"] = [...(datos()["client_activity"] ?? []), { id: id(), client_id: fid, author: autor(), kind: "etapa", text: `Movió de «${String(previa["stage"])}» a «${String(v["stage"])}».${motivo}`, created_at: ahora, updated_at: ahora }];
    }
    const extra = t === "client_activity" ? { edited_by: autor() } : {};
    datos()[t] = (datos()[t] ?? []).map((f) => (f.id === fid ? (nueva = { ...f, ...v, ...extra, updated_at: new Date().toISOString() }) : f));
    guardar();
    if (!nueva) return Promise.reject(new Error("El registro ya no existe"));
    return espera(nueva);
  },
  eliminar: (t: Nombre, fid: string) => {
    datos()[t] = (datos()[t] ?? []).filter((f) => f.id !== fid);
    for (const [h, campo] of CASCADA[t] ?? []) datos()[h] = (datos()[h] ?? []).filter((f) => f[campo] !== fid);
    guardar();
    return espera(undefined);
  },
};

/* Vista previa: PDF solo en memoria y asistente simulado (sin servidor ni clave de IA). */
const pdfsDemo = new Map<string, Blob>();
export function demoSubirPdf(tabla: string, tareaId: string, archivo: File) {
  const ahora = new Date().toISOString();
  const fila = { id: id(), owner_table: tabla, owner_id: tareaId, kind: "pdf", name: archivo.name, url: "", blob_key: null, size: archivo.size, author: autor(), created_at: ahora, updated_at: ahora } as Fila;
  pdfsDemo.set(fila.id, archivo);
  datos()["attachments"] = [...(datos()["attachments"] ?? []), fila];
  guardar();
  return espera(fila) as unknown as Promise<Tablas["attachments"]["Row"]>;
}
export function demoLeerPdf(fid: string): Blob {
  const b = pdfsDemo.get(fid);
  if (!b) throw new Error("En la vista previa los PDF solo duran mientras la página está abierta.");
  return b;
}
export async function demoAsistente(mensaje: string) {
  await new Promise((ok) => setTimeout(ok, 500));
  const pendientes = (datos()["tasks"] ?? []).filter((t) => t["status"] !== "Terminada").length;
  return {
    respuesta: `Esta es la vista previa: aquí el asistente no está conectado a la IA. En el CRM real respondería a «${mensaje.slice(0, 80)}» con tus datos y podría crear clientes, tareas y notas. Por ejemplo, ahora hay ${pendientes} tareas sin terminar.`,
    acciones: [] as string[],
  };
}
