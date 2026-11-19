import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DeadlineBadge } from "@/components/crm/DeadlineBadge";
import { EventItem } from "@/components/crm/EventItem";
import { ALL, ChoiceSelect, ErrorBlock, LoadingBlock, PageHeader, PersonTag } from "@/components/crm/ui-bits";
import {
  useClients,
  useCollaboratorAppointments,
  useCollaboratorTasks,
  useCollaborators,
  useTasks,
} from "@/hooks/use-crm";
import { buildAgendaEvents } from "@/lib/agenda";
import { CLOSED_STAGES, OPEN_STAGES, RESPONSABLES, formatMoney, type Stage } from "@/lib/crm";
import { capitalize, formatDay } from "@/lib/dates";
import { compareByUrgency, daysUntil, describeDaysLeft } from "@/lib/deadline";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hoy y esta semana | ROJU Consulting CRM" },
      {
        name: "description",
        content: "Seguimientos vencidos, tareas del día y próximas citas de ROJU Consulting.",
      },
      { property: "og:title", content: "Hoy y esta semana | ROJU Consulting CRM" },
      {
        property: "og:description",
        content: "Seguimientos vencidos, tareas del día y próximas citas de ROJU Consulting.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TodayPage,
});

/** Current time, only after mount: keeps server and browser renders identical across timezones. */
function useNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function TodayPage() {
  const now = useNow();
  const clients = useClients();
  const tasks = useTasks();
  const collaborators = useCollaborators();
  const collabTasks = useCollaboratorTasks();
  const appointments = useCollaboratorAppointments();
  const [responsable, setResponsable] = useState(ALL);

  const loading =
    !now ||
    clients.isPending ||
    tasks.isPending ||
    collaborators.isPending ||
    collabTasks.isPending ||
    appointments.isPending;
  const error = clients.error ?? tasks.error ?? collaborators.error ?? collabTasks.error ?? appointments.error;

  const data = useMemo(() => {
    if (!now) return null;
    const clientList = clients.data ?? [];
    const clientMap = new Map(clientList.map((c) => [c.id, c]));
    const collabMap = new Map((collaborators.data ?? []).map((c) => [c.id, c]));
    const byResp = (r?: string) => responsable === ALL || r === responsable;

    const followUps = clientList
      .filter(
        (c) =>
          c.next_follow_up &&
          !CLOSED_STAGES.includes(c.stage as Stage) &&
          daysUntil(c.next_follow_up, now) <= 0 &&
          byResp(c.responsable),
      )
      .sort((a, b) => (a.next_follow_up ?? "").localeCompare(b.next_follow_up ?? ""));

    const dueTasks = [
      ...(tasks.data ?? [])
        .filter((t) => byResp(t.encargado))
        .map((t) => {
          const c = clientMap.get(t.client_id);
          return { ...t, context: c ? `Cliente: ${c.name}` : "Cliente", person: t.encargado as string | undefined };
        }),
      ...(responsable === ALL ? (collabTasks.data ?? []) : []).map((t) => ({
        ...t,
        context: `Colaborador: ${collabMap.get(t.collaborator_id)?.name ?? ""}`,
        person: undefined as string | undefined,
      })),
    ]
      .filter((t) => t.status !== "Terminada" && t.due_date && daysUntil(t.due_date, now) <= 0)
      .sort((a, b) => compareByUrgency(a, b, now));

    const weekLimit = now.getTime() + 7 * 86_400_000;
    const upcoming = buildAgendaEvents(clientList, collaborators.data ?? [], appointments.data ?? []).filter(
      (e) =>
        e.start.getTime() + e.durationMinutes * 60_000 >= now.getTime() &&
        e.start.getTime() <= weekLimit &&
        (responsable === ALL || (e.kind === "cliente" && e.responsable === responsable)),
    );

    const mios = clientList.filter((c) => byResp(c.responsable));
    const abiertos = mios.filter((c) => OPEN_STAGES.includes(c.stage as Stage));
    const ganados = mios.filter((c) => c.stage === "Cliente ganado");
    const perdidos = mios.filter((c) => c.stage === "Perdido");
    const contar = (xs: string[]) =>
      Object.entries(xs.reduce<Record<string, number>>((m, k) => ((m[k] = (m[k] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]);
    const embudo = {
      abiertoValor: abiertos.reduce((t, c) => t + (c.deal_value ?? 0), 0),
      abiertos: abiertos.length,
      abiertosSinValor: abiertos.filter((c) => c.deal_value == null).length,
      ganados: ganados.length,
      perdidos: perdidos.length,
      igualas: ganados.filter((c) => c.deal_type === "Iguala mensual").reduce((t, c) => t + (c.deal_value ?? 0), 0),
      unicos: ganados.filter((c) => c.deal_type !== "Iguala mensual").reduce((t, c) => t + (c.deal_value ?? 0), 0),
      tasa: ganados.length + perdidos.length ? Math.round((ganados.length / (ganados.length + perdidos.length)) * 100) : null,
      origenes: contar(ganados.map((c) => c.source || "Sin dato")),
      motivos: contar(perdidos.map((c) => c.lost_reason || "Sin motivo")),
    };

    return {
      embudo,
      followUps,
      overdueFollowUps: followUps.filter((c) => daysUntil(c.next_follow_up!, now) < 0).length,
      dueToday: dueTasks.filter((t) => daysUntil(t.due_date!, now) === 0),
      overdueTasks: dueTasks.filter((t) => daysUntil(t.due_date!, now) < 0),
      upcoming,
    };
  }, [now, clients.data, tasks.data, collaborators.data, collabTasks.data, appointments.data, responsable]);

  return (
    <>
      <PageHeader
        eyebrow={now ? capitalize(format(now, "EEEE d 'de' MMMM", { locale: es })) : "Hoy"}
        title="Hoy y esta semana"
        description="Lo que necesita atención: seguimientos vencidos, tareas del día y las citas de los próximos 7 días."
        actions={
          <ChoiceSelect
            value={responsable}
            onChange={setResponsable}
            options={RESPONSABLES}
            allLabel="Pablo y Kevin"
            ariaLabel="Ver por responsable"
            className="w-52"
          />
        }
      />

      {error ? (
        <ErrorBlock message={error.message} />
      ) : loading || !data ? (
        <LoadingBlock rows={4} />
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Seguimientos vencidos" value={data.overdueFollowUps} tone={data.overdueFollowUps ? "late" : undefined} />
            <Stat label="Tareas para hoy" value={data.dueToday.length} tone={data.dueToday.length ? "urgent" : undefined} />
            <Stat label="Tareas atrasadas" value={data.overdueTasks.length} tone={data.overdueTasks.length ? "late" : undefined} />
            <Stat label="Citas en 7 días" value={data.upcoming.length} />
          </div>
          <Embudo e={data.embudo} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Panel title="Seguimientos pendientes" subtitle="Vencidos y para hoy" link={{ to: "/clientes", label: "Ver clientes" }}>
              {data.followUps.length === 0 ? (
                <Empty text="No hay seguimientos vencidos. Todo al día." />
              ) : (
                <ul className="divide-y">
                  {data.followUps.map((c) => {
                    const d = daysUntil(c.next_follow_up!, now!);
                    return (
                      <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="truncate font-display text-sm font-semibold text-foreground">{c.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {[c.company, c.stage].filter(Boolean).join(" · ")}
                          </p>
                          <div className="mt-1.5">
                            <PersonTag name={c.responsable} />
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <Badge variant={d < 0 ? "late" : "urgent"}>{d < 0 ? "Vencido" : "Hoy"}</Badge>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {d < 0 ? `Hace ${Math.abs(d)} ${Math.abs(d) === 1 ? "día" : "días"}` : formatDay(c.next_follow_up)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            <Panel title="Tareas de hoy" subtitle="Incluye las atrasadas" link={{ to: "/tareas", label: "Ver tareas" }}>
              {data.dueToday.length + data.overdueTasks.length === 0 ? (
                <Empty text="No hay tareas que venzan hoy." />
              ) : (
                <ul className="divide-y">
                  {[...data.overdueTasks, ...data.dueToday].map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-display text-sm font-semibold text-foreground">{t.title}</p>
                        <p className="truncate text-xs text-primary-soft">{t.context}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {t.person ? `${t.person} · ` : ""}
                          {t.status} · {describeDaysLeft(t.due_date!, now!)}
                        </p>
                      </div>
                      <DeadlineBadge due={t.due_date} status={t.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <Panel title="Próximas citas" subtitle="Siguientes 7 días" link={{ to: "/agenda", label: "Ver agenda" }}>
            {data.upcoming.length === 0 ? (
              <Empty text="No hay citas en los próximos 7 días." />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {data.upcoming.map((e) => (
                  <EventItem key={e.id} event={e} showDay={capitalize(format(e.start, "EEE d MMM", { locale: es }))} />
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "late" | "urgent" }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-card sm:p-5">
      <p className="eyebrow [overflow-wrap:anywhere] [hyphens:auto]">{label}</p>
      <p
        className={cn(
          "mt-2 font-display text-3xl font-extrabold text-card-foreground sm:text-4xl",
          tone === "late" && "text-status-late",
          tone === "urgent" && "text-status-urgent",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  link,
  children,
}: {
  title: string;
  subtitle: string;
  link: { to: "/clientes" | "/tareas" | "/agenda"; label: string };
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-surface p-5 sm:p-6">
      <header className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <Link to={link.to} className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-semibold text-primary-soft hover:underline">
          {link.label}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </header>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">{text}</p>;
}

type EmbudoDatos = {
  abiertoValor: number;
  abiertos: number;
  abiertosSinValor: number;
  ganados: number;
  perdidos: number;
  igualas: number;
  unicos: number;
  tasa: number | null;
  origenes: Array<[string, number]>;
  motivos: Array<[string, number]>;
};

/** Resumen del embudo: dinero en juego, tasa de cierre, de dónde llegan los clientes y por qué se pierden. */
function Embudo({ e }: { e: EmbudoDatos }) {
  return (
    <section aria-labelledby="embudo-t" className="rounded-2xl border bg-surface p-5 sm:p-6">
      <header className="mb-4">
        <h2 id="embudo-t" className="text-lg font-bold text-foreground">
          Resumen comercial
        </h2>
        <p className="text-xs text-muted-foreground">Con el valor, el origen y el motivo de pérdida de cada cliente.</p>
      </header>
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">En juego ({e.abiertos} {e.abiertos === 1 ? "abierto" : "abiertos"})</dt>
          <dd className="font-display text-xl font-extrabold tabular-nums text-foreground">{formatMoney(e.abiertoValor)}</dd>
          {e.abiertosSinValor > 0 && <dd className="text-xs text-muted-foreground">{e.abiertosSinValor} sin valor capturado</dd>}
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">Igualas ganadas</dt>
          <dd className="font-display text-xl font-extrabold tabular-nums text-status-ok">{formatMoney(e.igualas)}/mes</dd>
          {e.unicos > 0 && <dd className="text-xs text-muted-foreground">+ {formatMoney(e.unicos)} en pagos únicos</dd>}
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">Tasa de cierre</dt>
          <dd className="font-display text-xl font-extrabold tabular-nums text-foreground">{e.tasa == null ? "—" : `${e.tasa} %`}</dd>
          <dd className="text-xs text-muted-foreground">
            {e.ganados} {e.ganados === 1 ? "ganado" : "ganados"} · {e.perdidos} {e.perdidos === 1 ? "perdido" : "perdidos"}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-muted-foreground">Canal que más clientes trae</dt>
          <dd className="truncate font-display text-xl font-extrabold text-foreground">{e.origenes[0]?.[0] ?? "—"}</dd>
          {e.origenes[0] && <dd className="text-xs text-muted-foreground">{e.origenes[0][1]} de {e.ganados} {e.ganados === 1 ? "ganado" : "ganados"}</dd>}
        </div>
      </dl>
      {(e.origenes.length > 0 || e.motivos.length > 0) && (
        <div className="mt-5 grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2">
          <Lista titulo="Origen de los clientes ganados" filas={e.origenes} vacio="Aún no hay clientes ganados." />
          <Lista titulo="Motivos de pérdida" filas={e.motivos} vacio="Aún no hay clientes perdidos." />
        </div>
      )}
    </section>
  );
}

function Lista({ titulo, filas, vacio }: { titulo: string; filas: Array<[string, number]>; vacio: string }) {
  return (
    <div className="min-w-0">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{titulo}</h3>
      {filas.length === 0 ? (
        <p className="text-xs text-muted-foreground">{vacio}</p>
      ) : (
        <ul className="grid gap-1 text-sm">
          {filas.map(([k, n]) => (
            <li key={k} className="flex justify-between gap-3">
              <span className="min-w-0 truncate text-foreground">{k}</span>
              <span className="tabular-nums text-muted-foreground">{n}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
