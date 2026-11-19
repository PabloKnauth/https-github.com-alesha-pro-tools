import { useState, type FormEvent } from "react";
import { ArrowRightLeft, Pencil, StickyNote, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAddClientNote, useClientActivity, useDeleteClientNote, useEditClientNote } from "@/hooks/use-crm";
import { ConfirmDelete } from "./ConfirmDelete";
import { LIMITS } from "@/lib/crm";
import { formatDateTime } from "@/lib/dates";

const ICONO = { nota: StickyNote, etapa: ArrowRightLeft, creado: UserPlus } as const;

/** Historial del cliente: notas con fecha y autor, y los cambios de etapa que registra el servidor. */
export function ClientHistory({ clientId }: { clientId: string }) {
  const activity = useClientActivity();
  const add = useAddClientNote();
  const remove = useDeleteClientNote();
  const edit = useEditClientNote();
  const [text, setText] = useState("");
  const [editando, setEditando] = useState<{ id: string; text: string } | null>(null);
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
        Cada nota queda con fecha y autor. Los cambios de etapa se registran solos. Pablo y Kevin pueden editar y borrar
        cualquier registro.
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
                  {editando?.id === a.id ? (
                    <div className="grid gap-2">
                      <label htmlFor={`h-edit-${a.id}`} className="sr-only">
                        Editar nota
                      </label>
                      <Textarea
                        id={`h-edit-${a.id}`}
                        rows={3}
                        maxLength={LIMITS.activity}
                        value={editando.text}
                        onChange={(e) => setEditando({ id: a.id, text: e.target.value })}
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => setEditando(null)}>
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={!editando.text.trim() || edit.isPending}
                          onClick={() => edit.mutate({ id: a.id, text: editando.text.trim() }, { onSuccess: () => setEditando(null) })}
                        >
                          Guardar nota
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm text-foreground [overflow-wrap:anywhere]">{a.text}</p>
                  )}
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {a.author} · {formatDateTime(a.created_at, "d MMM yyyy, HH:mm")}
                    {a.edited_by ? ` · editada por ${a.edited_by}` : ""}
                  </p>
                </div>
                {editando?.id !== a.id && (
                  <div className="flex shrink-0 gap-1">
                    {a.kind === "nota" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                        aria-label="Editar nota"
                        onClick={() => setEditando({ id: a.id, text: a.text })}
                      >
                        <Pencil />
                      </Button>
                    )}
                    <ConfirmDelete
                      title="Borrar del historial"
                      description="Se borrará este registro para Pablo y Kevin. Esta acción no se puede deshacer."
                      onConfirm={() => remove.mutate(a.id)}
                      trigger={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                          aria-label="Borrar del historial"
                        >
                          <Trash2 />
                        </Button>
                      }
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
