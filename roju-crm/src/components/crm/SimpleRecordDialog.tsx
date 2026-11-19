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
import { Field } from "./ui-bits";
import { ConfirmDelete } from "./ConfirmDelete";

export type RecordField = {
  key: string;
  label: string;
  required?: boolean;
  type?: "text" | "email" | "tel" | "textarea";
  placeholder?: string;
  wide?: boolean;
};

/** Generic dialog for simple directory records (collaborators, suppliers). */
export function SimpleRecordDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  initial,
  isEditing,
  saving,
  onSave,
  deleteTitle,
  deleteDescription,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: RecordField[];
  initial: Record<string, string>;
  isEditing: boolean;
  saving: boolean;
  onSave: (values: Record<string, string>) => void;
  deleteTitle?: string;
  deleteDescription?: string;
  onDelete?: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(initial);

  useEffect(() => {
    if (open) setValues(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const missing = fields.find((f) => f.required && !values[f.key]?.trim());
    if (missing) {
      toast.error(`Completa el campo ${missing.label}`);
      return;
    }
    const clean = Object.fromEntries(fields.map((f) => [f.key, (values[f.key] ?? "").trim()]));
    onSave(clean);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          {fields.map((f, i) => (
            <Field
              key={f.key}
              label={f.label}
              htmlFor={`r-${f.key}`}
              required={f.required}
              className={f.wide || f.type === "textarea" ? "sm:col-span-2" : undefined}
            >
              {f.type === "textarea" ? (
                <Textarea
                  id={`r-${f.key}`}
                  rows={3}
                  value={values[f.key] ?? ""}
                  placeholder={f.placeholder}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                />
              ) : (
                <Input
                  id={`r-${f.key}`}
                  type={f.type ?? "text"}
                  value={values[f.key] ?? ""}
                  placeholder={f.placeholder}
                  autoFocus={i === 0}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                />
              )}
            </Field>
          ))}
          <DialogFooter className="gap-2 sm:col-span-2 sm:justify-between">
            {isEditing && onDelete ? (
              <ConfirmDelete
                title={deleteTitle ?? "Eliminar"}
                description={deleteDescription ?? "Esta acción no se puede deshacer."}
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
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
