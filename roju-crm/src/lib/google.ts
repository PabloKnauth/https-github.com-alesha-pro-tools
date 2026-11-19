export const GOOGLE_MEET_NEW_URL = "https://meet.google.com/new";

function toCalendarStamp(date: Date): string {
  // 2026-11-19T15:00:00.000Z -> 20261119T150000Z
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

export interface CalendarEventInput {
  title: string;
  start: Date;
  durationMinutes: number;
  details?: string;
  location?: string;
  guests?: string[];
}

/** Opens Google Calendar's "new event" screen with the data pre-filled. */
export function buildGoogleCalendarUrl(input: CalendarEventInput): string {
  const end = new Date(input.start.getTime() + input.durationMinutes * 60_000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    dates: `${toCalendarStamp(input.start)}/${toCalendarStamp(end)}`,
  });
  if (input.details) params.set("details", input.details);
  if (input.location) params.set("location", input.location);
  const guests = (input.guests ?? []).map((g) => g.trim()).filter(Boolean);
  if (guests.length) params.set("add", guests.join(","));
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function isGoogleMeetLink(value: string): boolean {
  return /^https:\/\/meet\.google\.com\/[a-z0-9-]+/i.test(value.trim());
}

/** Accepts a pasted link with or without protocol; returns a safe https URL or null. */
export function normalizeMeetLink(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const url = new URL(withProto);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}
