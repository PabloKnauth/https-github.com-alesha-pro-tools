/**
 * Cliente de la API del CRM (Netlify Function /api/crm).
 * La sesión se guarda en este dispositivo; Pablo y Kevin ven los mismos datos en el servidor.
 */
import type { Database } from "@/lib/db/types";
import { demoAsistente, demoDb, demoLeerPdf, demoSubirPdf } from "@/lib/demo";

/** Vista previa sin servidor (compilación aparte con VITE_DEMO=1). */
export const DEMO = import.meta.env["VITE_DEMO"] === "1";

export type TableName = keyof Database["public"]["Tables"];
export type Row<T extends TableName> = Database["public"]["Tables"][T]["Row"];
export type Insert<T extends TableName> = Database["public"]["Tables"][T]["Insert"];

export const USUARIOS = ["Pablo Knauth", "Kevin Juárez"] as const;
export type Usuario = (typeof USUARIOS)[number];

const LLAVE = "roju-crm-sesion";
type Sesion = { token: string; usuario: Usuario; vence: number };

export class SesionVencida extends Error {
  constructor() {
    super("Tu sesión terminó. Vuelve a entrar.");
  }
}

const oyentes = new Set<() => void>();
export function alCambiarSesion(fn: () => void) {
  oyentes.add(fn);
  return () => {
    oyentes.delete(fn);
  };
}
function avisar() {
  oyentes.forEach((fn) => fn());
}

export function leerSesion(): Sesion | null {
  if (typeof window === "undefined") return null;
  try {
    const s = JSON.parse(window.localStorage.getItem(LLAVE) ?? "null") as Sesion | null;
    if (!s || !s.token || s.vence < Date.now()) return null;
    return s;
  } catch {
    return null;
  }
}

export function cerrarSesion() {
  try {
    window.localStorage.removeItem(LLAVE);
  } catch {
    /* sin almacenamiento disponible */
  }
  avisar();
}

async function llamar<T>(cuerpo: Record<string, unknown>, conSesion = true): Promise<T> {
  const sesion = leerSesion();
  if (conSesion && !sesion) {
    avisar();
    throw new SesionVencida();
  }
  let res: Response;
  try {
    res = await fetch("/api/crm", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(conSesion && sesion ? { authorization: `Bearer ${sesion.token}` } : {}),
      },
      body: JSON.stringify(cuerpo),
    });
  } catch {
    throw new Error("Sin conexión. Revisa tu internet e intenta de nuevo.");
  }
  const esJson = (res.headers.get("content-type") ?? "").includes("application/json");
  if (!esJson) {
    throw new Error(
      res.status === 404 || res.ok
        ? "El servidor del CRM no está activo. En Netlify revisa que el último despliegue esté en verde y que en Logs → Functions aparezca «crm»."
        : `El servidor respondió con un error (${res.status}). Intenta de nuevo en un minuto.`,
    );
  }
  const datos = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (res.status === 401 && conSesion) {
    cerrarSesion();
    throw new SesionVencida();
  }
  if (!res.ok) throw new Error(datos.error ?? `Error ${res.status}`);
  return datos;
}

export async function entrar(usuario: Usuario, clave: string) {
  const r = DEMO
    ? { token: "vista-previa", vence: Date.now() + 864e5 * 30 }
    : await llamar<{ token: string; vence: number }>({ accion: "entrar", usuario, clave }, false);
  if (!r || typeof r.token !== "string" || !r.token) {
    throw new Error("El servidor no devolvió una sesión. Revisa que la función «crm» esté desplegada en Netlify.");
  }
  try {
    window.localStorage.setItem(LLAVE, JSON.stringify({ token: r.token, usuario, vence: r.vence }));
  } catch {
    throw new Error("Este navegador no permite guardar la sesión (¿modo privado?).");
  }
  avisar();
}

const dbReal = {
  listar: <T extends TableName>(tabla: T) =>
    llamar<{ filas: Row<T>[] }>({ accion: "listar", tabla }).then((r) => r.filas),
  crear: <T extends TableName>(tabla: T, valores: Insert<T>) =>
    llamar<{ fila: Row<T> }>({ accion: "crear", tabla, valores }).then((r) => r.fila),
  actualizar: <T extends TableName>(tabla: T, id: string, valores: Partial<Insert<T>>) =>
    llamar<{ fila: Row<T> }>({ accion: "actualizar", tabla, id, valores }).then((r) => r.fila),
  eliminar: <T extends TableName>(tabla: T, id: string) =>
    llamar<{ ok: true }>({ accion: "eliminar", tabla, id }).then(() => undefined),
};

export const db = (DEMO ? demoDb : dbReal) as typeof dbReal;

/* ---------- Documentos PDF de tareas ---------- */
export async function subirPdf(tabla: "tasks" | "collaborator_tasks", tareaId: string, archivo: File) {
  if (DEMO) return demoSubirPdf(tabla, tareaId, archivo);
  const sesion = leerSesion();
  if (!sesion) {
    avisar();
    throw new SesionVencida();
  }
  const res = await fetch("/api/archivos", {
    method: "POST",
    headers: {
      authorization: `Bearer ${sesion.token}`,
      "content-type": "application/pdf",
      "x-tabla": tabla,
      "x-tarea": tareaId,
      "x-nombre": encodeURIComponent(archivo.name),
    },
    body: archivo,
  }).catch(() => {
    throw new Error("Sin conexión. Revisa tu internet e intenta de nuevo.");
  });
  const datos = (await res.json().catch(() => ({}))) as { error?: string; fila?: Row<"attachments"> };
  if (res.status === 401) {
    cerrarSesion();
    throw new SesionVencida();
  }
  if (!res.ok || !datos.fila) throw new Error(datos.error ?? `Error ${res.status}`);
  return datos.fila;
}

/** Abre el PDF en una pestaña nueva (se descarga con la sesión, nunca queda público). */
export async function abrirPdf(id: string) {
  const ventana = window.open("", "_blank");
  try {
    let blob: Blob;
    if (DEMO) blob = demoLeerPdf(id);
    else {
      const sesion = leerSesion();
      if (!sesion) throw new SesionVencida();
      const res = await fetch(`/api/archivos?id=${encodeURIComponent(id)}`, { headers: { authorization: `Bearer ${sesion.token}` } });
      if (!res.ok) throw new Error(res.status === 404 ? "El documento ya no existe" : `Error ${res.status}`);
      blob = await res.blob();
    }
    const url = URL.createObjectURL(blob);
    if (ventana) ventana.location.href = url;
    else window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (e) {
    ventana?.close();
    throw e;
  }
}

/* ---------- Asistente de IA ---------- */
export type MensajeChat = { role: "user" | "assistant"; texto: string };
export type RespuestaAsistente = { respuesta?: string; acciones: string[]; continuar?: unknown[] };

export async function preguntarAsistente(mensaje: string, historial: MensajeChat[]): Promise<{ respuesta: string; acciones: string[] }> {
  if (DEMO) return demoAsistente(mensaje);
  const sesion = leerSesion();
  if (!sesion) {
    avisar();
    throw new SesionVencida();
  }
  const acciones: string[] = [];
  let cuerpo: Record<string, unknown> = { mensaje, historial };
  for (let i = 0; i < 6; i++) {
    const res = await fetch("/api/asistente", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${sesion.token}` },
      body: JSON.stringify(cuerpo),
    }).catch(() => {
      throw new Error("Sin conexión. Revisa tu internet e intenta de nuevo.");
    });
    const datos = (await res.json().catch(() => ({}))) as RespuestaAsistente & { error?: string };
    if (res.status === 401) {
      cerrarSesion();
      throw new SesionVencida();
    }
    if (!res.ok) throw new Error(datos.error ?? `Error ${res.status}`);
    acciones.push(...(datos.acciones ?? []));
    if (datos.continuar) {
      cuerpo = { continuar: datos.continuar };
      continue;
    }
    return { respuesta: datos.respuesta ?? "Listo.", acciones };
  }
  return { respuesta: "Hice varias acciones pero no terminé; dime si sigo.", acciones };
}
