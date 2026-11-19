import { describe, expect, it } from "vitest";
import { compareByUrgency, getDeadlineMarker } from "../deadline";

// Thursday 19 Nov 2026, mid-day local time
const today = new Date(2026, 10, 19, 12, 0, 0);

describe("deadline marker", () => {
  it("more than 3 days left is A tiempo", () => {
    expect(getDeadlineMarker("2026-11-23", "Pendiente", today)).toBe("A tiempo");
  });
  it("3 days left is Poner atención", () => {
    expect(getDeadlineMarker("2026-11-22", "Pendiente", today)).toBe("Poner atención");
  });
  it("2 days left is Poner atención", () => {
    expect(getDeadlineMarker("2026-11-21", "En proceso", today)).toBe("Poner atención");
  });
  it("tomorrow is A punto de caducar", () => {
    expect(getDeadlineMarker("2026-11-20", "Pendiente", today)).toBe("A punto de caducar");
  });
  it("today is A punto de caducar", () => {
    expect(getDeadlineMarker("2026-11-19", "Pendiente", today)).toBe("A punto de caducar");
  });
  it("past date and not finished is Atrasada", () => {
    expect(getDeadlineMarker("2026-11-18", "En proceso", today)).toBe("Atrasada");
  });
  it("past date but Terminada is not Atrasada", () => {
    expect(getDeadlineMarker("2026-11-10", "Terminada", today)).not.toBe("Atrasada");
  });
  it("no date is Sin deadline", () => {
    expect(getDeadlineMarker(null, "Pendiente", today)).toBe("Sin deadline");
  });
});

describe("urgency sort", () => {
  it("puts overdue first, then nearest, then no deadline", () => {
    const tasks = [
      { id: "none", due_date: null, status: "Pendiente" },
      { id: "far", due_date: "2026-12-30", status: "Pendiente" },
      { id: "late", due_date: "2026-11-15", status: "Pendiente" },
      { id: "today", due_date: "2026-11-19", status: "Pendiente" },
    ];
    const sorted = [...tasks].sort((a, b) => compareByUrgency(a, b, today)).map((t) => t.id);
    expect(sorted).toEqual(["late", "today", "far", "none"]);
  });
});
