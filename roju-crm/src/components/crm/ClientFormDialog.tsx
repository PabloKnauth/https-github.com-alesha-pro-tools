import { useEffect, useState, type FormEvent } from "react";
import { CalendarX2, Trash2 } from "lucide-react";
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
import { useDeleteClient, useSaveClient } from "@/hooks/use-crm";
import { RESPONSABLES, SERVICES, STAGES, type Client, type ClientInsert, type Stage } from "@/lib/crm";
import { fromDateTimeLocal, toDateTimeLocal } from "@/lib/dates";

type FormState = {
  name: string;
  company: string;
  contact: string;
  email: string;
  phone: string;
  service: string;
  responsable: string;
  stage: string;
  notes: string;
  next_follow_up: string;
  next_appointment: string;
};

function toForm(client: Client | null | undefined, defaultStage?: Stage): FormState {
  return {
    name: client?.name ?? "",
    company: client?.company ?? "",
    contact: client?.contact ?? "",
    email: client?.email ?? "",
    phone: client?.phone ?? "",
    service: client?.service ?? SERVICES[0],
    responsable: client?.responsable ?? RESPONSABLES[0],
    stage: client?.stage ?? defaultStage ?? STAGES[0],
    notes: client?.notes ?? "",
    next_follow_up: client?.next_follow_up ?? "",
    next_appointment: toDateTimeLocal(client?.next_appointment),
  };
}

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
  defaultStage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  defaultStage?: Stage;
}) {
  const [form, setForm] = useState<FormState>(() => toForm(client, defaultStage));
  const save = useSaveClient();
  const remove = useDeleteClient();

  useEffect(() => {
    if (open) setForm(toForm(client, defaultStage));
  }, [open, client, defaultStage]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Escribe el nombre del cliente");
      return;
    }
    const values: ClientInsert = {
      name: form.name.trim(),
      company: form.company.trim(),
      contact: form.contact.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      service: form.service,
      responsable: form.responsable,
      stage: form.stage,
      notes: form.notes.trim(),
      next_follow_up: form.next_follow_up || null,
      next_appointment: fromDateTimeLocal(form.next_appointment),
    };
    save.mutate(
      { id: client?.id, values },
      {
        onSuccess: () => {
          toast.success(client ? "Cliente actualizado" : "Cliente registrado");
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">
            {client ? "Editar cliente" : "Nuevo cliente"}
          </DialogTitle>
          <DialogDescription>
            Los cambios se guardan para Pablo y Kevin al mismo tiempo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" htmlFor="c-name" required>
            <Input id="c-name" value={form.name} onChange={(e) => set("name", e.target.value)} autoFocus />
          </Field>
          <Field label="Empresa" htmlFor="c-company">
            <Input id="c-company" value={form.company} onChange={(e) => set("company", e.target.value)} />
          </Field>
          <Field label="Contacto" htmlFor="c-contact">
            <Input
              id="c-contact"
              value={form.contact}
              onChange={(e) => set("contact", e.target.value)}
              placeholder="Persona de contacto"
            />
          </Field>
          <Field label="Correo" htmlFor="c-email">
            <Input id="c-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Teléfono / WhatsApp" htmlFor="c-phone">
            <Input id="c-phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="Servicio" htmlFor="c-service">
            <ChoiceSelect id="c-service" value={form.service} onChange={(v) => set("service", v)} options={SERVICES} />
          </Field>
          <Field label="Responsable" htmlFor="c-resp">
            <ChoiceSelect
              id="c-resp"
              value={form.responsable}
              onChange={(v) => set("responsable", v)}
              options={RESPONSABLES}
            />
          </Field>
          <Field label="Etapa" htmlFor="c-stage">
            <ChoiceSelect id="c-stage" value={form.stage} onChange={(v) => set("stage", v)} options={STAGES} />
          </Field>
          <Field label="Próximo seguimiento" htmlFor="c-follow">
            <Input
              id="c-follow"
              type="date"
              value={form.next_follow_up}
              onChange={(e) => set("next_follow_up", e.target.value)}
            />
          </Field>
          <Field
            label="Próxima cita (opcional)"
            htmlFor="c-appt"
            hint="Puedes dejarla vacía y agregarla después."
          >
            <div className="flex gap-2">
              <Input
                id="c-appt"
                type="datetime-local"
                value={form.next_appointment}
                onChange={(e) => set("next_appointment", e.target.value)}
              />
              {form.next_appointment && (
                <Button type="button" variant="outline" onClick={() => set("next_appointment", "")}>
                  <CalendarX2 />
                  Quitar cita
                </Button>
              )}
            </div>
          </Field>
          <Field label="Notas" htmlFor="c-notes" className="sm:col-span-2">
            <Textarea id="c-notes" rows={4} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>

          <DialogFooter className="gap-2 sm:col-span-2 sm:justify-between">
            {client ? (
              <ConfirmDelete
                title="Eliminar cliente"
                description={`Se eliminará a ${client.name} y todas sus tareas. Esta acción no se puede deshacer.`}
                onConfirm={() =>
                  remove.mutate(client.id, {
                    onSuccess: () => {
                      toast.success("Cliente eliminado");
                      onOpenChange(false);
                    },
                  })
                }
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
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Guardando..." : "Guardar cliente"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
