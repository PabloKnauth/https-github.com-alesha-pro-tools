import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { addDays, addWeeks, format, isSameDay, isToday, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventItem } from "@/components/crm/EventItem";
import { ALL, ChoiceSelect, ErrorBlock, FilterBar, LoadingBlock, PageHeader } from "@/components/crm/ui-bits";
import { useClients, useCollaboratorAppointments, useCollaborators } from "@/hooks/use-crm";
import { buildAgendaEvents } from "@/lib/agenda";
import { RESPONSABLES } from "@/lib/crm";
import { capitalize } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda semanal | ROJU Consulting CRM" },
      { name: "description", content: "Vista semanal de citas con clientes y colaboradores." },
      { property: "og:title", content: "Agenda semanal | ROJU Consulting CRM" },
      { property: "og:description", content: "Vista semanal de citas con clientes y colaboradores." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgendaPage,
});

const KIND_OPTIONS = [
  { value: "cliente", label: "Solo clientes" },
  { value: "colaborador", label: "Solo colaboradores" },
];

function AgendaPage() {
  const clients = useClients();
  const collaborators = useCollaborators();
  const appointments = useCollaboratorAppointments();
  const [weekOffset, setWeekOffset] = useState(0);
  const [kind, setKind] = useState(ALL);
  const [responsable, setResponsable] = useState(ALL);

  const weekStart = useMemo(
    () => startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 }),
    [weekOffset],
  );
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const events = useMemo(
    () =>
      buildAgendaEvents(clients.data ?? [], collaborators.data ?? [], appointments.data ?? []).filter(
        (e) =>
          (kind === ALL || e.kind === kind) &&
          (responsable === ALL || (e.kind === "cliente" && e.responsable === responsable)),
      ),
    [clients.data, collaborators.data, appointments.data, kind, responsable],
  );

  const weekEnd = addDays(weekStart, 6);
  const rangeLabel =
    format(weekStart, "MMMM", { locale: es }) === format(weekEnd, "MMMM", { locale: es })
      ? `${format(weekStart, "d")} al ${format(weekEnd, "d 'de' MMMM yyyy", { locale: es })}`
      : `${format(weekStart, "d 'de' MMMM", { locale: es })} al ${format(weekEnd, "d 'de' MMMM yyyy", { locale: es })}`;
  const weekCount = events.filter((e) => e.start >= weekStart && e.start < addDays(weekStart, 7)).length;
  const loading = clients.isPending || collaborators.isPending || appointments.isPending;
  const error = clients.error ?? collaborators.error ?? appointments.error;

  return (
    <>
      <PageHeader
        eyebrow="Calendario"
        title="Agenda"
        description={`Semana del ${rangeLabel}. ${weekCount === 1 ? "1 cita" : `${weekCount} citas`}.`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setWeekOffset((w) => w - 1)} aria-label="Semana anterior">
              <ChevronLeft />
            </Button>
            <Button variant="subtle" onClick={() => setWeekOffset(0)} disabled={weekOffset === 0}>
              Esta semana
            </Button>
            <Button variant="outline" size="icon" onClick={() => setWeekOffset((w) => w + 1)} aria-label="Semana siguiente">
              <ChevronRight />
            </Button>
          </div>
        }
      />

      <FilterBar>
        <ChoiceSelect
          value={kind}
          onChange={setKind}
          options={KIND_OPTIONS}
          allLabel="Clientes y colaboradores"
          ariaLabel="Tipo de cita"
          className="lg:w-60"
        />
        <ChoiceSelect
          value={responsable}
          onChange={setResponsable}
          options={RESPONSABLES}
          allLabel="Todos los responsables"
          ariaLabel="Filtrar por responsable"
          className="lg:w-60"
        />
        <div className="flex items-center gap-4 text-xs text-muted-foreground lg:ml-auto">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-primary-soft" /> Clientes
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-highlight" /> Colaboradores
          </span>
        </div>
      </FilterBar>

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorBlock message={error.message} />
      ) : (
        <div className="grid gap-3 md:grid-cols-7">
          {days.map((day) => {
            const list = events.filter((e) => isSameDay(e.start, day));
            const today = isToday(day);
            return (
              <section
                key={day.toISOString()}
                aria-label={format(day, "EEEE d", { locale: es })}
                className={cn(
                  "flex min-h-28 flex-col rounded-xl border bg-surface p-2.5 md:min-h-[420px]",
                  today && "border-highlight/50",
                )}
              >
                <header className="mb-2 flex items-baseline justify-between px-0.5 md:block">
                  <p className={cn("eyebrow", today && "!text-highlight")}>
                    {capitalize(format(day, "EEE", { locale: es }))}
                  </p>
                  <p className={cn("font-display text-xl font-bold text-foreground", today && "text-highlight")}>
                    {format(day, "d")}
                  </p>
                </header>
                <div className="flex flex-col gap-2">
                  {list.map((e) => (
                    <EventItem key={e.id} event={e} />
                  ))}
                  {list.length === 0 && (
                    <p className="px-0.5 text-[11px] text-muted-foreground/70 md:pt-2">Sin citas</p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
