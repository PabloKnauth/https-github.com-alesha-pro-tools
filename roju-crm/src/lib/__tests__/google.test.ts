import { describe, expect, it } from "vitest";
import { buildGoogleCalendarUrl } from "../google";

describe("Google Calendar link", () => {
  it("pre-fills title, UTC dates, details and guests", () => {
    const url = new URL(
      buildGoogleCalendarUrl({
        title: "Revisión de contenido",
        start: new Date("2026-11-20T16:00:00.000Z"),
        durationMinutes: 45,
        details: "Notas",
        guests: ["ana@ejemplo.com"],
      }),
    );
    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe("Revisión de contenido");
    expect(url.searchParams.get("dates")).toBe("20261120T160000Z/20261120T164500Z");
    expect(url.searchParams.get("add")).toBe("ana@ejemplo.com");
  });
});
