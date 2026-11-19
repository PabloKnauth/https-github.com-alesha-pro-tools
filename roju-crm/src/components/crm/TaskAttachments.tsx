import { useRef, useState } from "react";
import { ExternalLink, FileText, Link2, Paperclip, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAddLink, useAttachments, useDeleteAttachment, useUploadPdf } from "@/hooks/use-crm";
import { abrirPdf } from "@/lib/api";
import { ConfirmDelete } from "./ConfirmDelete";

const MAX_PDF = 5 * 1024 * 1024;
const kb = (n: number | null | undefined) => (n == null ? "" : n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Documentos de una tarea: PDF (hasta 5 MB) o enlaces a presentaciones y páginas. */
export function TaskAttachments({ tabla, tareaId }: { tabla: "tasks" | "collaborator_tasks"; tareaId: string }) {
  const lista = useAttachments();
  const subir = useUploadPdf();
  const enlace = useAddLink();
  const borrar = useDeleteAttachment();
  const archivoRef = useRef<HTMLInputElement>(null);
  const [nombre, setNombre] = useState("");
  const [url, setUrl] = useState("");
  const docs = (lista.data ?? []).filter((a) => a.owner_table === tabla && a.owner_id === tareaId);

  function elegirPdf(f: File | undefined) {
    if (!f) return;
    if (f.type !== "application/pdf" && !/\.pdf$/i.test(f.name)) {
      toast.error("Solo se aceptan archivos PDF");
      return;
    }
    if (f.size > MAX_PDF) {
      toast.error("El PDF pesa más de 5 MB. Comprímelo o súbelo a Drive y agrega el enlace.");
      return;
    }
    subir.mutate({ owner_table: tabla, owner_id: tareaId, file: f }, { onSuccess: () => toast.success("PDF adjuntado") });
  }

  function agregarEnlace() {
    const u = url.trim();
    const conProtocolo = /^https?:\/\//i.test(u) ? u.replace(/^http:/i, "https:") : `https://${u}`;
    try {
      new URL(conProtocolo);
    } catch {
      toast.error("Ese enlace no es válido");
      return;
    }
    const n = nombre.trim() || new URL(conProtocolo).hostname.replace(/^www\./, "");
    enlace.mutate(
      { owner_table: tabla, owner_id: tareaId, name: n, url: conProtocolo },
      {
        onSuccess: () => {
          setNombre("");
          setUrl("");
          toast.success("Enlace adjuntado");
        },
      },
    );
  }

  return (
    <section aria-labelledby={`docs-${tareaId}`} className="rounded-xl border bg-surface p-4">
      <h3 id={`docs-${tareaId}`} className="flex items-center gap-2 font-display text-sm font-bold">
        <Paperclip className="h-4 w-4" aria-hidden="true" />
        Documentos
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground">PDF de hasta 5 MB, o enlaces a presentaciones y páginas.</p>

      {docs.length > 0 && (
        <ul className="mt-3 grid gap-2">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
              {d.kind === "pdf" ? <FileText className="h-4 w-4 shrink-0 text-highlight" aria-hidden="true" /> : <Link2 className="h-4 w-4 shrink-0 text-primary-soft" aria-hidden="true" />}
              {d.kind === "pdf" ? (
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left text-sm text-foreground hover:underline"
                  onClick={() => abrirPdf(d.id).catch((e) => toast.error(e instanceof Error ? e.message : "No se pudo abrir"))}
                  title={d.name}
                >
                  {d.name}
                </button>
              ) : (
                <a href={d.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm text-foreground hover:underline" title={d.url}>
                  {d.name}
                </a>
              )}
              <span className="shrink-0 text-xs text-muted-foreground">{d.kind === "pdf" ? kb(d.size) : <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />}</span>
              <ConfirmDelete
                title="Quitar documento"
                description={`Se quitará «${d.name}» de la tarea para Pablo y Kevin.`}
                onConfirm={() => borrar.mutate(d.id)}
                trigger={
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground" aria-label={`Quitar ${d.name}`}>
                    <Trash2 />
                  </Button>
                }
              />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 grid gap-2">
        <input
          ref={archivoRef}
          id={`pdf-${tareaId}`}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(e) => {
            elegirPdf(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <Button type="button" variant="outline" size="sm" className="justify-start" disabled={subir.isPending} onClick={() => archivoRef.current?.click()}>
          <Upload />
          {subir.isPending ? "Subiendo PDF..." : "Subir PDF"}
        </Button>
        <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
          <label className="sr-only" htmlFor={`ln-${tareaId}`}>
            Nombre del enlace
          </label>
          <Input id={`ln-${tareaId}`} maxLength={160} placeholder="Nombre (ej.: Propuesta)" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <label className="sr-only" htmlFor={`lu-${tareaId}`}>
            Enlace
          </label>
          <Input
            id={`lu-${tareaId}`}
            type="url"
            inputMode="url"
            maxLength={500}
            placeholder="https://docs.google.com/presentation/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                agregarEnlace();
              }
            }}
          />
          <Button type="button" size="sm" disabled={!url.trim() || enlace.isPending} onClick={agregarEnlace}>
            <Link2 />
            Agregar enlace
          </Button>
        </div>
      </div>
    </section>
  );
}

/** Contador de documentos para las tarjetas de tarea. */
export function AttachmentCount({ tabla, tareaId }: { tabla: "tasks" | "collaborator_tasks"; tareaId: string }) {
  const lista = useAttachments();
  const n = (lista.data ?? []).filter((a) => a.owner_table === tabla && a.owner_id === tareaId).length;
  if (!n) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" aria-label={`${n} ${n === 1 ? "documento" : "documentos"}`}>
      <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
      {n}
    </span>
  );
}
