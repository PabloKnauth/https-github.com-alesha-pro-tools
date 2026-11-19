import type { Client, Collaborator, CollaboratorAppointment } from "./crm";

export type AgendaEvent = {
  id: string;
  kind: "cliente" | "colaborador";
  title: string;
  subtitle: string;
  start: Date;
  durationMinutes: number;
  responsable?: string;
  service?: string;
  meetLink?: string;
};

export function buildAgendaEvents(
  clients: Client[],
  collaborators: Collaborator[],
  appointments: CollaboratorAppointment[],
): AgendaEvent[] {
  const collabMap = new Map(collaborators.map((c) => [c.id, c]));
  const fromClients: AgendaEvent[] = clients
    .filter((c) => c.next_appointment)
    .map((c) => ({
      id: `c-${c.id}`,
      kind: "cliente",
      title: c.name,
      subtitle: c.company ? `${c.company} · ${c.stage}` : c.stage,
      start: new Date(c.next_appointment as string),
      durationMinutes: 60,
      responsable: c.responsable,
      service: c.service,
    }));
  const fromCollabs: AgendaEvent[] = appointments.map((a) => ({
    id: `a-${a.id}`,
    kind: "colaborador",
    title: a.title,
    subtitle: collabMap.get(a.collaborator_id)?.name ?? "Colaborador",
    start: new Date(a.starts_at),
    durationMinutes: a.duration_minutes,
    meetLink: a.meet_link || undefined,
  }));
  return [...fromClients, ...fromCollabs].sort((a, b) => a.start.getTime() - b.start.getTime());
}
