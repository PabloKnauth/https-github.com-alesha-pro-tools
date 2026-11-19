import { useMemo, useState, type DragEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, MessageCircle, MoreHorizontal, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ClientFormDialog } from "@/components/crm/ClientFormDialog";
import { LostReasonDialog } from "@/components/crm/LostReasonDialog";
import {
  ALL,
  ChoiceSelect,
  EmptyState,
  ErrorBlock,
  FilterBar,
  LoadingBlock,
  PageHeader,
  PersonTag,
  SearchInput,
} from "@/components/crm/ui-bits";
import { useClients, useUpdateClient } from "@/hooks/use-crm";
import {
  CLOSED_STAGES,
  RESPONSABLES,
  SERVICES,
  STAGES,
  formatMoney,
  matchesSearch,
  whatsappUrl,
  type Client,
  type Stage,
} from "@/lib/crm";
import { formatDateTime, formatDay } from "@/lib/dates";
import { daysUntil } from "@/lib/deadline";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/clientes")({
  head: () => ({
    meta: [
      { title: "Seguimiento de clientes | ROJU Consulting CRM" },
      {
        name: "description",
        content: "Tablero de clientes por etapa: desde nuevo contacto hasta cliente ganado.",
      },
      { property: "og:title", content: "Seguimiento de clientes | ROJU Consulting CRM" },
      {
        property: "og:description",
        content: "Tablero de clientes por etapa: desde nuevo contacto hasta cliente ganado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClientsPage,
});

const STAGE_ACCENT: Partial<Record<Stage, string>> = {
  "Cliente ganado": "bg-status-ok",
  Perdido: "bg-status-none",
};

function ClientsPage() {
  const clients = useClients();
  const update = useUpdateClient();
  const [search, setSearch] = useState("");
  const [responsable, setResponsable] = useState(ALL);
  const [service, setService] = useState(ALL);
  const [editing, setEditing] = useState<Client | null>(null);
  const [creatingStage, setCreatingStage] = useState<Stage | null>(null);
  const [dragOver, setDragOver] = useState<Stage | null>(null);
  const [perdiendo, setPerdiendo] = useState<Client | null>(null);

  const filtered = useMemo(
    () =>
      (clients.data ?? []).filter(
        (c) =>
          (responsable === ALL || c.responsable === responsable) &&
          (service === ALL || c.service === service) &&
          matchesSearch(search, [c.name, c.company, c.contact, c.email, c.phone, c.notes]),
      ),
    [clients.data, search, responsable, service],
  );

  const hasFilters = search || responsable !== ALL || service !== ALL;
  const dialogOpen = editing !== null || creatingStage !== null;

  function moveTo(id: string, stage: Stage) {
    if (stage === "Perdido") {
      const c = clients.data?.find((x) => x.id === id);
      if (c) {
        setPerdiendo(c);
        return;
      }
    }
    update.mutate({ id, values: { stage, ...(stage !== "Perdido" ? { lost_reason: "" } : {}) } });
  }

  function onDrop(e: DragEvent, stage: Stage) {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData("text/plain");
    const client = clients.data?.find((c) => c.id === id);
    if (client && client.stage !== stage) moveTo(id, stage);
  }

  return (
    <>
      <PageHeader
        eyebrow="Tablero de seguimiento"
        title="Seguimiento de clientes"
        description="Arrastra las tarjetas entre etapas o usa el menú de cada tarjeta para moverlas."
        actions={
          <Button onClick={() => setCreatingStage(STAGES[0])}>
            <Plus />
            Cliente
          </Button>
        }
      />

      <FilterBar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre, empresa, correo o notas"
          className="sm:col-span-2 lg:flex-1"
        />
        <ChoiceSelect
          value={responsable}
          onChange={setResponsable}
          options={RESPONSABLES}
          allLabel="Todos los responsables"
          ariaLabel="Filtrar por responsable"
          className="lg:w-56"
        />
        <ChoiceSelect
          value={service}
          onChange={setService}
          options={SERVICES}
          allLabel="Todos los servicios"
          ariaLabel="Filtrar por servicio"
          className="lg:w-52"
        />
        {hasFilters && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearch("");
              setResponsable(ALL);
              setService(ALL);
            }}
          >
            <RotateCcw />
            Limpiar
          </Button>
        )}
      </FilterBar>

      {clients.isPending ? (
        <LoadingBlock />
      ) : clients.isError ? (
        <ErrorBlock message={clients.error.message} />
      ) : clients.data.length === 0 ? (
        <EmptyState
          title="Aún no hay clientes"
          description="Registra tu primer contacto para empezar a darle seguimiento."
          action={
            <Button onClick={() => setCreatingStage(STAGES[0])}>
              <Plus />
              Cliente
            </Button>
          }
        />
      ) : (
        <div className="scrollbar-thin relative -mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex gap-4">
            {STAGES.map((stage) => {
              const list = filtered.filter((c) => c.stage === stage);
              return (
                <section
                  key={stage}
                  aria-label={stage}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(stage);
                  }}
                  onDragLeave={() => setDragOver((s) => (s === stage ? null : s))}
                  onDrop={(e) => onDrop(e, stage)}
                  className={cn(
                    "flex w-[290px] shrink-0 flex-col rounded-2xl border bg-surface p-3 transition-colors",
                    dragOver === stage && "border-primary-soft/60 bg-accent",
                  )}
                >
                  <header className="mb-3 flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn("h-2 w-2 rounded-full bg-primary-soft", STAGE_ACCENT[stage])}
                      />
                      <h2 className="font-display text-[13px] font-bold text-foreground">{stage}</h2>
                    </div>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                      {list.length}
                    </span>
                  </header>
                  {list.some((c) => c.deal_value != null) && (
                    <p className="-mt-2 mb-3 px-1 text-xs tabular-nums text-muted-foreground">
                      {formatMoney(list.reduce((t, c) => t + (c.deal_value ?? 0), 0))} en esta etapa
                    </p>
                  )}
                  <div className="flex min-h-24 flex-1 flex-col gap-3">
                    {list.map((c) => (
                      <ClientCard
                        key={c.id}
                        client={c}
                        onOpen={() => setEditing(c)}
                        onMove={(s) => moveTo(c.id, s)}
                      />
                    ))}
                    {list.length === 0 && (
                      <p className="rounded-xl border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
                        {hasFilters ? "Sin resultados" : "Sin clientes"}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 justify-start text-muted-foreground"
                    onClick={() => setCreatingStage(stage)}
                  >
                    <Plus />
                    Agregar aquí
                  </Button>
                </section>
              );
            })}
          </div>
        </div>
      )}

      <ClientFormDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          if (!o) {
            setEditing(null);
            setCreatingStage(null);
          }
        }}
        client={editing}
        defaultStage={creatingStage ?? undefined}
      />
      <LostReasonDialog
        open={perdiendo !== null}
        clientName={perdiendo?.name ?? ""}
        onCancel={() => setPerdiendo(null)}
        onConfirm={(reason) => {
          if (perdiendo) update.mutate({ id: perdiendo.id, values: { stage: "Perdido", lost_reason: reason } });
          setPerdiendo(null);
        }}
      />
    </>
  );
}

function ClientCard({
  client,
  onOpen,
  onMove,
}: {
  client: Client;
  onOpen: () => void;
  onMove: (stage: Stage) => void;
}) {
  const followDays = client.next_follow_up ? daysUntil(client.next_follow_up) : null;
  const isClosed = CLOSED_STAGES.includes(client.stage as Stage);
  const followOverdue = followDays !== null && followDays < 0 && !isClosed;
  const followToday = followDays === 0 && !isClosed;
  const wa = whatsappUrl(client.phone);

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", client.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="cursor-grab rounded-xl border bg-card p-3.5 shadow-card transition-colors hover:border-primary-soft/40 active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 cursor-pointer text-left">
          <h3 className="truncate font-display text-sm font-semibold text-card-foreground">
            {client.name}
          </h3>
          {client.company && (
            <p className="truncate text-xs text-muted-foreground">{client.company}</p>
          )}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="-mr-1 -mt-1 h-7 w-7" aria-label="Opciones">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onOpen}>Editar cliente</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">Mover a</DropdownMenuLabel>
            {STAGES.filter((s) => s !== client.stage).map((s) => (
              <DropdownMenuItem key={s} onSelect={() => onMove(s)}>
                {s}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <button type="button" onClick={onOpen} className="mt-3 block w-full cursor-pointer space-y-2 text-left">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="service">{client.service}</Badge>
          {client.deal_value != null && (
            <span className="text-xs font-semibold tabular-nums text-foreground">
              {formatMoney(client.deal_value)}
              {client.deal_type === "Iguala mensual" ? " /mes" : ""}
            </span>
          )}
        </div>
        {(client.source || (client.stage === "Perdido" && client.lost_reason)) && (
          <p className="text-xs text-muted-foreground">
            {client.source ? `Origen: ${client.source}` : ""}
            {client.source && client.stage === "Perdido" && client.lost_reason ? " · " : ""}
            {client.stage === "Perdido" && client.lost_reason ? `Motivo: ${client.lost_reason}` : ""}
          </p>
        )}
        <dl className="space-y-1 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5 shrink-0" />
            <dt className="sr-only">Próxima cita</dt>
            <dd className={cn(client.next_appointment && "text-foreground")}>
              {client.next_appointment ? `Cita: ${formatDateTime(client.next_appointment)}` : "Sin cita"}
            </dd>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5 shrink-0" />
            <dt className="sr-only">Próximo seguimiento</dt>
            <dd
              className={cn(
                followOverdue && "font-semibold text-status-late",
                followToday && "font-semibold text-status-urgent",
              )}
            >
              {client.next_follow_up
                ? `Seguimiento: ${formatDay(client.next_follow_up, "d MMM")}${followOverdue ? " (vencido)" : followToday ? " (hoy)" : ""}`
                : "Sin seguimiento"}
            </dd>
          </div>
        </dl>
        {client.notes && <p className="line-clamp-2 text-xs text-muted-foreground">{client.notes}</p>}
      </button>

      <div className="mt-3 flex items-center justify-between border-t pt-2.5">
        <PersonTag name={client.responsable} />
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary-soft hover:underline"
            aria-label={`Abrir WhatsApp de ${client.name}`}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp
          </a>
        )}
      </div>
    </article>
  );
}
