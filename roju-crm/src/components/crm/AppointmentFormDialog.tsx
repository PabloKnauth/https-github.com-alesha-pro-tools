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
import { MeetButtons, MeetNotice, calendarUrlFor } from "./MeetActions";
import { useDeleteCollaboratorAppointment, useSaveCollaboratorAppointment } from "@/hooks/use-crm";
import type { Collaborator, CollaboratorAppointment } from "@/lib/crm";
import { fromDateTimeLocal, toDateTimeLocal } from "@/lib/dates";
import { isGoogleMeetLink } from "@/lib/google";

const DURATIONS = [15, 30, 45, 60, 90, 120].map((m) => ({
  value: String(m),
  label: m < 60 ? `${m} minutos` : m === 60 ? "1 hora" : `${m / 60} horas`,
}));

export function AppointmentFormDialog({
  open,
  onOpenChange,
  collaborator,
  appointment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collaborator: Collaborator;
  appointment: CollaboratorAppointment | null;
}) {
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [duration, setDuration] = useState("60");
  const [meetLink, setMeetLink] = useState("");
  const [notes, setNotes] = useState("");
  const save = useSaveCollaboratorAppointment();
  const remove = useDeleteCollaboratorAppointment();

  useEffect(() => {
    if (!open) return;
    setTitle(appointment?.title ?? `Reunión con ${collaborator.name}`);
    setStartsAt(toDateTimeLocal(appointment?.starts_at));
    setDuration(String(appointment?.duration_minutes ?? 60));
    setMeetLink(appointment?.meet_link ?? "");
    setNotes(appointment?.notes ?? "");
  }, [open, appointment, collaborator.name]);

  const startsIso = fromDateTimeLocal(startsAt);
  const calendarUrl = calendarUrlFor({
    title,
    startsAt: startsIso,
    durationMinutes: Number(duration),
    notes,
    meetLink,
    guestEmail: collaborator.email,
    collaboratorName: collaborator.name,
  });
  const linkWarning = meetLink.trim() && !isGoogleMeetLink(meetLink);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return void toast.error("Escribe el asunto de la cita");
    if (!startsIso) return void toast.error("Elige fecha y hora de la cita");
    save.mutate(
      {
        id: appointment?.id,
        values: {
          collaborator_id: collaborator.id,
          title: title.trim(),
          starts_at: startsIso,
          duration_minutes: Number(duration),
          meet_link: meetLink.trim(),
          notes: notes.trim(),
        },
      },
      {
        onSuccess: () => {
          toast.success(appointment ? "Cita actualizada" : "Cita agendada");
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
            {appointment ? "Editar cita" : "Nueva cita"} con {collaborator.name}
          </DialogTitle>
          <DialogDescription>Aparecerá en la Agenda semanal.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Asunto" htmlFor="a-title" required className="sm:col-span-2">
            <Input id="a-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Fecha y hora" htmlFor="a-start" required>
            <Input id="a-start" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </Field>
          <Field label="Duración" htmlFor="a-dur">
            <ChoiceSelect id="a-dur" value={duration} onChange={setDuration} options={DURATIONS} />
          </Field>
          <Field
            label="Enlace de Google Meet"
            htmlFor="a-meet"
            className="sm:col-span-2"
            hint={linkWarning ? "Este enlace no parece de Google Meet. Revisa que sea correcto." : undefined}
          >
            <Input
              id="a-meet"
              value={meetLink}
              onChange={(e) => setMeetLink(e.target.value)}
              placeholder="Pega aquí el enlace, por ejemplo https://meet.google.com/abc-defg-hij"
              inputMode="url"
            />
          </Field>
          <div className="space-y-3 sm:col-span-2">
            <MeetNotice />
            <MeetButtons meetLink={meetLink} calendarUrl={calendarUrl} />
          </div>
          <Field label="Notas" htmlFor="a-notes" className="sm:col-span-2">
            <Textarea id="a-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <DialogFooter className="gap-2 sm:col-span-2 sm:justify-between">
            {appointment ? (
              <ConfirmDelete
                title="Eliminar cita"
                description="La cita se quitará de la agenda."
                onConfirm={() =>
                  remove.mutate(appointment.id, {
                    onSuccess: () => {
                      toast.success("Cita eliminada");
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
                {save.isPending ? "Guardando..." : "Guardar cita"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
