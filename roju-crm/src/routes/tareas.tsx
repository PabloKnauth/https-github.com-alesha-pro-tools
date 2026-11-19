import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DeadlineLegend } from "@/components/crm/DeadlineBadge";
import { TaskBoard } from "@/components/crm/TaskBoard";
import { TaskFormDialog, type TaskFormValues } from "@/components/crm/TaskFormDialog";
import {
  ALL,
  ChoiceSelect,
  EmptyState,
  ErrorBlock,
  FilterBar,
  LoadingBlock,
  PageHeader,
  SearchInput,
} from "@/components/crm/ui-bits";
import { useClients, useDeleteTask, useSaveTask, useTasks, useUpdateTaskStatus } from "@/hooks/use-crm";
import { RESPONSABLES, TASK_STATUSES, matchesSearch, type Task } from "@/lib/crm";

export const Route = createFileRoute("/tareas")({
  head: () => ({
    meta: [
      { title: "Tareas | ROJU Consulting CRM" },
      {
        name: "description",
        content: "Tareas por cliente con encargado, estado y deadline ordenadas por urgencia.",
      },
      { property: "og:title", content: "Tareas | ROJU Consulting CRM" },
      {
        property: "og:description",
        content: "Tareas por cliente con encargado, estado y deadline ordenadas por urgencia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TasksPage,
});

function TasksPage() {
  const tasks = useTasks();
  const clients = useClients();
  const save = useSaveTask();
  const remove = useDeleteTask();
  const updateStatus = useUpdateTaskStatus();
  const [search, setSearch] = useState("");
  const [encargado, setEncargado] = useState(ALL);
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);

  const clientMap = useMemo(
    () => new Map((clients.data ?? []).map((c) => [c.id, c])),
    [clients.data],
  );
  const clientOptions = useMemo(
    () =>
      (clients.data ?? [])
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, "es"))
        .map((c) => ({ value: c.id, label: c.company ? `${c.name} · ${c.company}` : c.name })),
    [clients.data],
  );

  const boardTasks = useMemo(
    () =>
      (tasks.data ?? [])
        .filter((t) => {
          const c = clientMap.get(t.client_id);
          return (
            (encargado === ALL || t.encargado === encargado) &&
            matchesSearch(search, [t.title, t.notes, c?.name, c?.company])
          );
        })
        .map((t) => {
          const c = clientMap.get(t.client_id);
          return {
            ...t,
            person: t.encargado,
            context: c ? (c.company ? `${c.name} · ${c.company}` : c.name) : "Cliente",
          };
        }),
    [tasks.data, clientMap, encargado, search],
  );

  const noClients = clients.isSuccess && clients.data.length === 0;
  const open = creating || editing !== null;
  const initial: TaskFormValues = editing
    ? {
        title: editing.title,
        status: editing.status,
        due_date: editing.due_date,
        notes: editing.notes,
        owner_id: editing.client_id,
        encargado: editing.encargado,
      }
    : { title: "", status: "Pendiente", due_date: null, notes: "", owner_id: "", encargado: RESPONSABLES[0] };

  function close() {
    setCreating(false);
    setEditing(null);
  }

  return (
    <>
      <PageHeader
        eyebrow="Operación"
        title="Tareas"
        description="Cada tarea está ligada a un cliente. Las más urgentes aparecen primero."
        actions={
          <Button onClick={() => setCreating(true)} disabled={noClients}>
            <Plus />
            Tarea
          </Button>
        }
      />

      <FilterBar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar tarea, cliente o notas"
          className="lg:flex-1"
        />
        <ChoiceSelect
          value={encargado}
          onChange={setEncargado}
          options={RESPONSABLES}
          allLabel="Todos los encargados"
          ariaLabel="Filtrar por encargado"
          className="lg:w-56"
        />
      </FilterBar>

      <div className="mb-6">
        <DeadlineLegend />
      </div>

      {tasks.isPending || clients.isPending ? (
        <LoadingBlock />
      ) : tasks.isError ? (
        <ErrorBlock message={tasks.error.message} />
      ) : noClients ? (
        <EmptyState
          title="Primero registra un cliente"
          description="Cada tarea debe estar ligada a un cliente."
          action={
            <Button asChild>
              <Link to="/clientes">Ir a Seguimiento de clientes</Link>
            </Button>
          }
        />
      ) : tasks.data.length === 0 ? (
        <EmptyState
          title="Aún no hay tareas"
          description="Crea la primera tarea y asígnala a Pablo o Kevin."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus />
              Tarea
            </Button>
          }
        />
      ) : (
        <TaskBoard
          tasks={boardTasks}
          onOpen={(id) => setEditing(tasks.data.find((t) => t.id === id) ?? null)}
          onStatusChange={(id, status) => updateStatus.mutate({ id, status })}
        />
      )}

      <TaskFormDialog
        open={open}
        onOpenChange={(o) => !o && close()}
        initial={initial}
        isEditing={!!editing}
        ownerLabel="Cliente"
        ownerOptions={clientOptions}
        encargadoOptions={RESPONSABLES}
        statuses={TASK_STATUSES}
        saving={save.isPending}
        onSave={(v) =>
          save.mutate(
            {
              id: editing?.id,
              values: {
                title: v.title,
                client_id: v.owner_id,
                encargado: v.encargado ?? RESPONSABLES[0],
                status: v.status,
                due_date: v.due_date,
                notes: v.notes,
              },
            },
            {
              onSuccess: () => {
                toast.success(editing ? "Tarea actualizada" : "Tarea creada");
                close();
              },
            },
          )
        }
        onDelete={
          editing
            ? () =>
                remove.mutate(editing.id, {
                  onSuccess: () => {
                    toast.success("Tarea eliminada");
                    close();
                  },
                })
            : undefined
        }
      />
    </>
  );
}
