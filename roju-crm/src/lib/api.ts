/**
 * Cliente de la API del CRM (Netlify Function /api/crm).
 * La sesión se guarda en este dispositivo; Pablo y Kevin ven los mismos datos en el servidor.
 */
import type { Database } from "@/lib/db/types";
import { demoDb } from "@/lib/demo";

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
