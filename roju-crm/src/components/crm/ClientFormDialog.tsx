import { useEffect, useState, type FormEvent } from "react";
import { CalendarPlus, CalendarX2, Trash2 } from "lucide-react";
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
import {
  DEAL_TYPES,
  LIMITS,
  LOST_REASONS,
  RESPONSABLES,
  SERVICES,
  SOURCES,
  STAGES,
  type Client,
  type ClientInsert,
  type Stage,
} from "@/lib/crm";
import { buildGoogleCalendarUrl } from "@/lib/google";
import { ClientHistory } from "./ClientHistory";
import { WhatsAppTemplate } from "./WhatsAppTemplate";
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
  deal_value: string;
  deal_type: string;
  source: string;
  lost_reason: string;
};

const SIN_DATO = "Sin dato";

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
    deal_value: client?.deal_value != null ? String(client.deal_value) : "",
    deal_type: client?.deal_type || DEAL_TYPES[0],
    source: client?.source || SIN_DATO,
    lost_reason: client?.lost_reason || LOST_REASONS[0],
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
    const monto = form.deal_value.trim() === "" ? null : Number(form.deal_value.replace(/[$,\s]/g, ""));
    if (monto !== null && (!Number.isFinite(monto) || monto < 0)) {
      toast.error("Escribe el valor del trato solo con números, por ejemplo 15000");
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
      deal_value: monto,
      deal_type: form.deal_type,
      source: form.source === SIN_DATO ? "" : form.source,
      lost_reason: form.stage === "Perdido" ? form.lost_reason : "",
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
            <Input id="c-name" maxLength={LIMITS.name} value={form.name} onChange={(e) => set("name", e.target.value)} autoFocus />
          </Field>
          <Field label="Empresa" htmlFor="c-company">
            <Input id="c-company" maxLength={LIMITS.company} value={form.company} onChange={(e) => set("company", e.target.value)} />
          </Field>
          <Field label="Contacto" htmlFor="c-contact">
            <Input
              id="c-contact"
              maxLength={LIMITS.contact}
              value={form.contact}
              onChange={(e) => set("contact", e.target.value)}
              placeholder="Persona de contacto"
            />
          </Field>
          <Field label="Correo" htmlFor="c-email">
            <Input id="c-email" maxLength={LIMITS.email} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Teléfono / WhatsApp" htmlFor="c-phone">
            <Input id="c-phone" maxLength={LIMITS.phone} type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
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
          {form.stage === "Perdido" && (
            <Field label="Motivo de pérdida" htmlFor="c-lost">
              <ChoiceSelect id="c-lost" value={form.lost_reason} onChange={(v) => set("lost_reason", v)} options={LOST_REASONS} />
            </Field>
          )}
          <Field label="Origen del cliente" htmlFor="c-source" hint="¿Por dónde llegó? Sirve para saber qué canal funciona.">
            <ChoiceSelect id="c-source" value={form.source} onChange={(v) => set("source", v)} options={[SIN_DATO, ...SOURCES]} />
          </Field>
          <Field label="Valor del trato (MXN)" htmlFor="c-value" hint="Opcional. Monto total o mensual.">
            <Input
              id="c-value"
              inputMode="decimal"
              placeholder="Ej.: 15000"
              value={form.deal_value}
              onChange={(e) => set("deal_value", e.target.value)}
            />
          </Field>
          <Field label="Tipo de cobro" htmlFor="c-dealtype">
            <ChoiceSelect id="c-dealtype" value={form.deal_type} onChange={(v) => set("deal_type", v)} options={DEAL_TYPES} />
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
            {form.next_appointment && fromDateTimeLocal(form.next_appointment) && (
              <Button asChild type="button" variant="ghost" size="sm" className="mt-1 justify-start px-0 text-primary-soft">
                <a
                  href={buildGoogleCalendarUrl({
                    title: `ROJU · ${form.name || "Cita con cliente"}`,
                    start: new Date(fromDateTimeLocal(form.next_appointment)!),
                    durationMinutes: 60,
                    details: [form.company, form.contact, form.phone, `Servicio: ${form.service}`, `Responsable: ${form.responsable}`]
                      .filter(Boolean)
                      .join("\n"),
                    guests: form.email ? [form.email] : [],
                  })}
                  target="_blank"
                  rel="noreferrer"
                >
                  <CalendarPlus />
                  Crear cita en Google Calendar
                </a>
              </Button>
            )}
          </Field>
          <Field label="Notas" htmlFor="c-notes" className="sm:col-span-2">
            <Textarea
              id="c-notes"
              rows={4}
              maxLength={LIMITS.notes}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
            {form.notes.length > LIMITS.notes * 0.8 && (
              <p className="mt-1 text-right text-xs text-muted-foreground" aria-live="polite">
                {form.notes.length.toLocaleString("es-MX")} / {LIMITS.notes.toLocaleString("es-MX")} caracteres
              </p>
            )}
          </Field>
          {client && (
            <>
              <WhatsAppTemplate client={{ ...client, stage: form.stage, responsable: form.responsable, phone: form.phone, name: form.name, contact: form.contact }} />
            </>
          )}

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
        {client && <ClientHistory clientId={client.id} />}
      </DialogContent>
    </Dialog>
  );
}
