import { CalendarPlus, Video, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GOOGLE_MEET_NEW_URL, buildGoogleCalendarUrl, normalizeMeetLink } from "@/lib/google";

export function MeetNotice() {
  return (
    <p className="rounded-lg border border-highlight/30 bg-highlight/10 p-3 text-xs leading-relaxed text-foreground">
      Google Calendar no está conectado al CRM, así que el enlace de Google Meet no se genera
      automáticamente. Crea la reunión con "Crear reunión en Google Calendar" (o "Abrir Google
      Meet"), copia el enlace que te da Google y pégalo una sola vez en el campo Enlace de Google
      Meet. Después entras con un clic en "Entrar a la reunión en Google Meet".
    </p>
  );
}

export function calendarUrlFor(input: {
  title: string;
  startsAt: string | null;
  durationMinutes: number;
  notes?: string;
  meetLink?: string;
  guestEmail?: string;
  collaboratorName?: string;
}): string | null {
  if (!input.startsAt) return null;
  const start = new Date(input.startsAt);
  if (Number.isNaN(start.getTime())) return null;
  const link = normalizeMeetLink(input.meetLink ?? "");
  const details = [
    input.collaboratorName ? `Reunión con ${input.collaboratorName} (ROJU Consulting).` : "ROJU Consulting.",
    input.notes?.trim() ? `\n${input.notes.trim()}` : "",
    link ? `\nGoogle Meet: ${link}` : "",
  ].join("");
  return buildGoogleCalendarUrl({
    title: input.title || "Reunión ROJU Consulting",
    start,
    durationMinutes: input.durationMinutes,
    details,
    location: link ?? undefined,
    guests: input.guestEmail ? [input.guestEmail] : [],
  });
}

export function MeetButtons({
  meetLink,
  calendarUrl,
  showOpenMeet = true,
  size = "sm",
}: {
  meetLink: string;
  calendarUrl: string | null;
  showOpenMeet?: boolean;
  size?: "sm" | "default";
}) {
  const join = normalizeMeetLink(meetLink);
  return (
    <div className="flex flex-wrap gap-2">
      {join ? (
        <Button asChild size={size} variant="highlight">
          <a href={join} target="_blank" rel="noreferrer">
            <Video />
            Entrar a la reunión en Google Meet
          </a>
        </Button>
      ) : (
        <Button size={size} variant="highlight" disabled title="Primero pega el enlace de Google Meet">
          <Video />
          Entrar a la reunión en Google Meet
        </Button>
      )}
      {showOpenMeet && (
        <Button asChild size={size} variant="outline">
          <a href={GOOGLE_MEET_NEW_URL} target="_blank" rel="noreferrer">
            <ExternalLink />
            Abrir Google Meet
          </a>
        </Button>
      )}
      {calendarUrl ? (
        <Button asChild size={size} variant="outline">
          <a href={calendarUrl} target="_blank" rel="noreferrer">
            <CalendarPlus />
            Crear reunión en Google Calendar
          </a>
        </Button>
      ) : (
        <Button size={size} variant="outline" disabled title="Primero elige fecha y hora">
          <CalendarPlus />
          Crear reunión en Google Calendar
        </Button>
      )}
    </div>
  );
}
