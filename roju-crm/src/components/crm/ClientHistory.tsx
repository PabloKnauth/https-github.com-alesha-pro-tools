import { useState, type FormEvent } from "react";
import { ArrowRightLeft, StickyNote, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAddClientNote, useClientActivity, useDeleteClientNote } from "@/hooks/use-crm";
import { leerSesion } from "@/lib/api";
import { LIMITS } from "@/lib/crm";
import { formatDateTime } from "@/lib/dates";

const ICONO = { nota: StickyNote, etapa: ArrowRightLeft, creado: UserPlus } as const;

/** Historial del cliente: notas con fecha y autor, y los cambios de etapa que registra el servidor. */
export function ClientHistory({ clientId }: { clientId: string }) {
  const activity = useClientActivity();
  const add = useAddClientNote();
  const remove = useDeleteClientNote();
  const [text, setText] = useState("");
  const yo = leerSesion()?.usuario;
  const items = (activity.data ?? []).filter((a) => a.client_id === clientId);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    add.mutate({ client_id: clientId, text: t }, { onSuccess: () => setText("") });
  }

  return (
    <section aria-labelledby="historial-t" className="rounded-xl border bg-surface p-4 sm:col-span-2">
      <h3 id="historial-t" className="font-display text-sm font-bold">
        Historial
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Cada nota queda con fecha y autor. Los cambios de etapa se registran solos.
      </p>
      <form onSubmit={onSubmit} className="mt-3 grid gap-2">
        <label htmlFor="h-nota" className="sr-only">
          Nueva nota
        </label>
        <Textarea
          id="h-nota"
          rows={2}
          maxLength={LIMITS.activity}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ej.: Llamé a la dueña, pide la propuesta con 3 opciones de precio."
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={!text.trim() || add.isPending}>
            {add.isPending ? "Guardando..." : "Agregar nota"}
          </Button>
        </div>
      </form>
      {items.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">Todavía no hay movimientos para este cliente.</p>
      ) : (
        <ol className="mt-3 grid gap-3">
          {items.map((a) => {
            const Icono = ICONO[a.kind as keyof typeof ICONO] ?? StickyNote;
            return (
              <li key={a.id} className="flex gap-3">
                <Icono className="mt-0.5 h-4 w-4 shrink-0 text-primary-soft" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap text-sm text-foreground [overflow-wrap:anywhere]">{a.text}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {a.author} · {formatDateTime(a.created_at, "d MMM yyyy, HH:mm")}
                  </p>
                </div>
                {a.kind === "nota" && a.author === yo && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground"
                    aria-label="Borrar nota"
                    onClick={() => remove.mutate(a.id)}
                  >
                    <Trash2 />
                  </Button>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
