import { Video } from "lucide-react";
import { format } from "date-fns";
import type { AgendaEvent } from "@/lib/agenda";
import { normalizeMeetLink } from "@/lib/google";
import { cn } from "@/lib/utils";

export function EventItem({ event, showDay }: { event: AgendaEvent; showDay?: string }) {
  const meet = event.meetLink ? normalizeMeetLink(event.meetLink) : null;
  return (
    <article
      className={cn(
        "rounded-lg border-l-2 bg-card p-2.5 shadow-card",
        event.kind === "cliente" ? "border-l-primary-soft" : "border-l-highlight",
      )}
    >
      <p className="text-[11px] font-semibold text-muted-foreground">
        {showDay && <span className="mr-1 text-foreground">{showDay}</span>}
        {format(event.start, "HH:mm")} · {event.kind === "cliente" ? "Cliente" : "Colaborador"}
      </p>
      <p className="mt-0.5 truncate font-display text-[13px] font-semibold text-card-foreground">{event.title}</p>
      <p className="truncate text-[11px] text-muted-foreground">
        {event.subtitle}
        {event.responsable ? ` · ${event.responsable}` : ""}
      </p>
      {meet && (
        <a
          href={meet}
          target="_blank"
          rel="noreferrer"
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-highlight hover:underline"
        >
          <Video className="h-3 w-3" />
          Entrar a la reunión en Google Meet
        </a>
      )}
    </article>
  );
}
