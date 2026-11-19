import { Badge, type BadgeProps } from "@/components/ui/badge";
import { getDeadlineMarker, type DeadlineMarker } from "@/lib/deadline";

const VARIANT: Record<DeadlineMarker, NonNullable<BadgeProps["variant"]>> = {
  "A tiempo": "ok",
  "Poner atención": "warn",
  "A punto de caducar": "urgent",
  Atrasada: "late",
  "Sin deadline": "none",
  Terminada: "done",
};

export function DeadlineBadge({ due, status }: { due: string | null; status: string }) {
  const marker = getDeadlineMarker(due, status);
  return <Badge variant={VARIANT[marker]}>{marker}</Badge>;
}

export function DeadlineLegend() {
  const items: Array<[DeadlineMarker, string]> = [
    ["A tiempo", "más de 3 días"],
    ["Poner atención", "2 a 3 días"],
    ["A punto de caducar", "hoy o mañana"],
    ["Atrasada", "venció sin terminar"],
    ["Sin deadline", "sin fecha"],
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
      {items.map(([m, d]) => (
        <span key={m} className="inline-flex items-center gap-1.5">
          <Badge variant={VARIANT[m]}>{m}</Badge>
          <span>{d}</span>
        </span>
      ))}
    </div>
  );
}
