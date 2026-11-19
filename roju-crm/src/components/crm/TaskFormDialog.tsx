import { useEffect, useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChoiceSelect, Field } from "./ui-bits";
import { ConfirmDelete } from "./ConfirmDelete";

export type TaskFormValues = {
  title: string;
  status: string;
  due_date: string | null;
  notes: string;
  owner_id: string; // client_id or collaborator_id
  encargado?: string;
};

type Option = { value: string; label: string };

/**
 * Shared task form for client tasks and collaborator tasks.
 * Client tasks require a client and an encargado; collaborator tasks are tied to one collaborator.
 */
export function TaskFormDialog({
  open,
  onOpenChange,
  initial,
  isEditing,
  ownerLabel,
  ownerOptions,
  encargadoOptions,
  statuses,
  saving,
  onSave,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: TaskFormValues;
  isEditing: boolean;
  ownerLabel: string;
  ownerOptions?: Option[];
  encargadoOptions?: readonly string[];
  statuses: readonly string[];
  saving: boolean;
  onSave: (values: TaskFormValues) => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState<TaskFormValues>(initial);

  useEffect(() => {
    if (open) setForm(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = <K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Escribe el nombre de la tarea");
      return;
    }
    if (!form.owner_id) {
      toast.error(`Selecciona ${ownerLabel.toLowerCase()}`);
      return;
    }
    onSave({ ...form, title: form.title.trim(), notes: form.notes.trim() });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display">{isEditing ? "Editar tarea" : "Nueva tarea"}</DialogTitle>
          <DialogDescription>El deadline es opcional.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Tarea" htmlFor="t-title" required className="sm:col-span-2">
            <Input id="t-title" maxLength={200} value={form.title} onChange={(e) => set("title", e.target.value)} autoFocus />
          </Field>
          {ownerOptions && (
            <Field label={ownerLabel} htmlFor="t-owner" required>
              <ChoiceSelect
                id="t-owner"
                value={form.owner_id}
                onChange={(v) => set("owner_id", v)}
                options={ownerOptions}
                placeholder={`Selecciona ${ownerLabel.toLowerCase()}`}
              />
            </Field>
          )}
          {encargadoOptions && (
            <Field label="Encargado" htmlFor="t-enc">
              <ChoiceSelect
                id="t-enc"
                value={form.encargado ?? encargadoOptions[0] ?? ""}
                onChange={(v) => set("encargado", v)}
                options={encargadoOptions}
              />
            </Field>
          )}
          <Field label="Estado" htmlFor="t-status">
            <ChoiceSelect id="t-status" value={form.status} onChange={(v) => set("status", v)} options={statuses} />
          </Field>
          <Field label="Deadline (opcional)" htmlFor="t-due">
            <div className="flex gap-2">
              <Input
                id="t-due"
                type="date"
                value={form.due_date ?? ""}
                onChange={(e) => set("due_date", e.target.value || null)}
              />
              {form.due_date && (
                <Button type="button" variant="outline" onClick={() => set("due_date", null)}>
                  Quitar
                </Button>
              )}
            </div>
          </Field>
          <Field label="Notas" htmlFor="t-notes" className="sm:col-span-2">
            <Textarea id="t-notes" rows={3} maxLength={5000} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
          <DialogFooter className="gap-2 sm:col-span-2 sm:justify-between">
            {isEditing && onDelete ? (
              <ConfirmDelete
                title="Eliminar tarea"
                description="La tarea se eliminará para ambos socios."
                onConfirm={onDelete}
                trigger={
                  <Button type="button" variant="ghost" className="text-destructive hover:text-destructive">
                    <Trash2 />
                    Eliminar
                  </Button>
                }
              />
            ) : (
              <span />
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando..." : "Guardar tarea"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
