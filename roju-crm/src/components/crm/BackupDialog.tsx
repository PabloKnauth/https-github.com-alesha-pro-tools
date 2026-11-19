import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { db, type TableName } from "@/lib/api";

const TABLAS: Array<[TableName, string]> = [
  ["clients", "clientes"],
  ["client_activity", "historial"],
  ["tasks", "tareas"],
  ["collaborators", "colaboradores"],
  ["collaborator_tasks", "tareas-colaboradores"],
  ["collaborator_appointments", "citas-colaboradores"],
  ["suppliers", "proveedores"],
];

function descargar(nombre: string, contenido: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function aCsv(filas: Array<Record<string, unknown>>): string {
  if (!filas.length) return "";
  const columnas = [...new Set(filas.flatMap((f) => Object.keys(f)))];
  const celda = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // BOM para que Excel lea bien los acentos.
  return "﻿" + [columnas.join(","), ...filas.map((f) => columnas.map((c) => celda(f[c])).join(","))].join("\r\n");
}

const hoy = () => new Date().toISOString().slice(0, 10);

export function BackupDialog() {
  const [trabajando, setTrabajando] = useState(false);

  async function todo() {
    setTrabajando(true);
    try {
      const datos: Record<string, unknown[]> = {};
      for (const [t] of TABLAS) datos[t] = await db.listar(t);
      descargar(`respaldo-roju-crm-${hoy()}.json`, JSON.stringify({ creado: new Date().toISOString(), datos }, null, 2), "application/json");
      toast.success("Respaldo descargado");
    } catch (e) {
      toast.error("No se pudo descargar el respaldo", { description: e instanceof Error ? e.message : "" });
    } finally {
      setTrabajando(false);
    }
  }

  async function csv(t: TableName, nombre: string) {
    try {
      const filas = (await db.listar(t)) as Array<Record<string, unknown>>;
      if (!filas.length) {
        toast.info(`No hay registros en ${nombre}`);
        return;
      }
      descargar(`roju-${nombre}-${hoy()}.csv`, aCsv(filas), "text/csv;charset=utf-8");
    } catch (e) {
      toast.error("No se pudo exportar", { description: e instanceof Error ? e.message : "" });
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-md border px-3 py-1.5 font-display text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Respaldo
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Respaldo de datos</DialogTitle>
          <DialogDescription>
            Descarga una copia de todo el CRM. Guárdala en un lugar seguro, por ejemplo una vez por semana.
          </DialogDescription>
        </DialogHeader>
        <Button onClick={todo} disabled={trabajando}>
          <Download />
          {trabajando ? "Preparando..." : "Descargar respaldo completo"}
        </Button>
        <div>
          <p className="mb-2 text-xs font-semibold text-muted-foreground">Exportar a Excel (CSV)</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => csv("clients", "clientes")}>Clientes</Button>
            <Button variant="outline" size="sm" onClick={() => csv("tasks", "tareas")}>Tareas</Button>
            <Button variant="outline" size="sm" onClick={() => csv("client_activity", "historial")}>Historial</Button>
            <Button variant="outline" size="sm" onClick={() => csv("suppliers", "proveedores")}>Proveedores</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
