import type { TaskStatus } from "./crm";

export type DeadlineMarker =
  | "A tiempo"
  | "Poner atención"
  | "A punto de caducar"
  | "Atrasada"
  | "Sin deadline"
  | "Terminada";

const DAY_MS = 86_400_000;

/** Parses a YYYY-MM-DD date as a local calendar day (no timezone shift). */
export function parseDateOnly(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Whole calendar days from today to the due date. 0 = today, 1 = tomorrow, -1 = yesterday. */
export function daysUntil(due: string, today: Date = new Date()): number {
  return Math.round((parseDateOnly(due).getTime() - startOfLocalDay(today).getTime()) / DAY_MS);
}

/**
 * Deadline rules:
 * - Terminada: task is finished (never counted as late).
 * - Sin deadline: no date.
 * - Atrasada: due date already passed.
 * - A punto de caducar: due today or tomorrow.
 * - Poner atención: 2 or 3 days left.
 * - A tiempo: more than 3 days left.
 */
export function getDeadlineMarker(
  due: string | null | undefined,
  status: TaskStatus | string,
  today: Date = new Date(),
): DeadlineMarker {
  if (status === "Terminada") return "Terminada";
  if (!due) return "Sin deadline";
  const days = daysUntil(due, today);
  if (days < 0) return "Atrasada";
  if (days <= 1) return "A punto de caducar";
  if (days <= 3) return "Poner atención";
  return "A tiempo";
}

/** Sort key: overdue first (most overdue first), then nearest deadline, then no deadline, then finished. */
export function compareByUrgency<T extends { due_date: string | null; status: string; created_at?: string }>(
  a: T,
  b: T,
  today: Date = new Date(),
): number {
  const rank = (t: T) => {
    if (t.status === "Terminada") return Number.MAX_SAFE_INTEGER;
    if (!t.due_date) return Number.MAX_SAFE_INTEGER - 1;
    return daysUntil(t.due_date, today);
  };
  const diff = rank(a) - rank(b);
  if (diff !== 0) return diff;
  return (a.created_at ?? "").localeCompare(b.created_at ?? "");
}

export function describeDaysLeft(due: string, today: Date = new Date()): string {
  const d = daysUntil(due, today);
  if (d === 0) return "Vence hoy";
  if (d === 1) return "Vence mañana";
  if (d > 1) return `Faltan ${d} días`;
  if (d === -1) return "Venció ayer";
  return `Venció hace ${Math.abs(d)} días`;
}
