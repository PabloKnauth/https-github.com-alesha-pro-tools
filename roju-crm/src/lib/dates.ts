import { format, isValid, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { parseDateOnly } from "./deadline";

export function formatDay(value: string | null | undefined, pattern = "d MMM yyyy"): string {
  if (!value) return "";
  const d = parseDateOnly(value);
  return isValid(d) ? format(d, pattern, { locale: es }) : "";
}

export function formatDateTime(value: string | null | undefined, pattern = "EEE d MMM, HH:mm"): string {
  if (!value) return "";
  const d = parseISO(value);
  return isValid(d) ? format(d, pattern, { locale: es }) : "";
}

export function formatTime(value: string): string {
  const d = parseISO(value);
  return isValid(d) ? format(d, "HH:mm") : "";
}

/** ISO timestamp -> value for <input type="datetime-local"> in the browser's timezone. */
export function toDateTimeLocal(value: string | null | undefined): string {
  if (!value) return "";
  const d = parseISO(value);
  return isValid(d) ? format(d, "yyyy-MM-dd'T'HH:mm") : "";
}

/** <input type="datetime-local"> value -> ISO timestamp, or null when empty. */
export function fromDateTimeLocal(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return isValid(d) ? d.toISOString() : null;
}

export function todayDateOnly(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
