import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarPlus, Mail, MessageCircle, Pencil, Phone, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AppointmentFormDialog } from "@/components/crm/AppointmentFormDialog";
import { DeadlineLegend } from "@/components/crm/DeadlineBadge";
import { MeetButtons, MeetNotice, calendarUrlFor } from "@/components/crm/MeetActions";
import { SimpleRecordDialog, type RecordField } from "@/components/crm/SimpleRecordDialog";
import { TaskBoard } from "@/components/crm/TaskBoard";
import { TaskFormDialog, type TaskFormValues } from "@/components/crm/TaskFormDialog";
import {
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  PageHeader,
  SearchInput,
} from "@/components/crm/ui-bits";
import {
  useCollaboratorAppointments,
  useCollaboratorTasks,
  useCollaborators,
  useDeleteCollaborator,
  useDeleteCollaboratorTask,
  useSaveCollaborator,
  useSaveCollaboratorTask,
  useUpdateCollaboratorTaskStatus,
} from "@/hooks/use-crm";
import {
  TASK_STATUSES,
  initials,
  matchesSearch,
  whatsappUrl,
  type Collaborator,
  type CollaboratorAppointment,
  type CollaboratorTask,
} from "@/lib/crm";
import { capitalize, formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/colaboradores")({
  head: () => ({
    meta: [
      { title: "Colaboradores | ROJU Consulting CRM" },
      {
        name: "description",
        content: "Directorio de colaboradores con sus tareas, citas y reuniones de Google Meet.",
      },
      { property: "og:title", content: "Colaboradores | ROJU Consulting CRM" },
      {
        property: "og:description",
        content: "Directorio de colaboradores con sus tareas, citas y reuniones de Google Meet.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CollaboratorsPage,
});

const COLLAB_FIELDS: RecordField[] = [
  { key: "name", label: "Nombre", required: true },
  { key: "role", label: "Función", placeholder: "Diseño, fotografía, desarrollo..." },
  { key: "email", label: "Correo", type: "email" },
  { key: "phone", label: "Teléfono / WhatsApp", type: "tel" },
  { key: "notes", label: "Notas", type: "textarea" },
];

function CollaboratorsPage() {
  const collaborators = useCollaborators();
  const saveCollab = useSaveCollaborator();
  const deleteCollab = useDeleteCollaborator();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCollab, setEditingCollab] = useState<Collaborator | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const list = useMemo(
    () =>
      (collaborators.data ?? []).filter((c) =>
        matchesSearch(search, [c.name, c.role, c.email, c.phone, c.notes]),
      ),
    [collaborators.data, search],
  );
  const selected = collaborators.data?.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    const first = collaborators.data?.[0];
    if (!selectedId && first) setSelectedId(first.id);
  }, [collaborators.data, selectedId]);

  function select(id: string) {
    setSelectedId(id);
    if (window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth" }));
    }
  }

  function openCreate() {
    setEditingCollab(null);
    setFormOpen(true);
  }

  return (
    <>
      <PageHeader
        eyebrow="Equipo externo"
        title="Colaboradores"
        description="Registra a las personas con las que trabajas, sus tareas y sus reuniones."
        actions={
          <Button onClick={openCreate}>
            <Plus />
            Nuevo colaborador
          </Button>
        }
      />

      {collaborators.isPending ? (
        <LoadingBlock />
      ) : collaborators.isError ? (
        <ErrorBlock message={collaborators.error.message} />
      ) : collaborators.data.length === 0 ? (
        <EmptyState
          title="Aún no hay colaboradores"
          description="Agrega a tu primer colaborador para asignarle tareas y citas."
          action={
            <Button onClick={openCreate}>
              <Plus />
              Nuevo colaborador
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="space-y-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar colaborador" />
            <ul className="space-y-2">
              {list.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => select(c.id)}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary-soft/40",
                      c.id === selectedId && "border-primary-soft/60 bg-accent",
                    )}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-display text-xs font-bold text-primary-foreground">
                      {initials(c.name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-display text-sm font-semibold text-card-foreground">
                        {c.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {c.role || "Sin función"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
              {list.length === 0 && (
                <li className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                  Sin resultados
                </li>
              )}
            </ul>
          </aside>
          <div ref={detailRef} className="min-w-0 scroll-mt-32">
            {selected ? (
              <CollaboratorDetail
                collaborator={selected}
                onEdit={() => {
                  setEditingCollab(selected);
                  setFormOpen(true);
                }}
              />
            ) : (
              <EmptyState title="Selecciona un colaborador" />
            )}
          </div>
        </div>
      )}

      <SimpleRecordDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editingCollab ? "Editar colaborador" : "Nuevo colaborador"}
        fields={COLLAB_FIELDS}
        initial={{
          name: editingCollab?.name ?? "",
          role: editingCollab?.role ?? "",
          email: editingCollab?.email ?? "",
          phone: editingCollab?.phone ?? "",
          notes: editingCollab?.notes ?? "",
        }}
        isEditing={!!editingCollab}
        saving={saveCollab.isPending}
        onSave={(v) =>
          saveCollab.mutate(
            {
              id: editingCollab?.id,
              values: {
                name: v["name"] ?? "",
                role: v["role"] ?? "",
                email: v["email"] ?? "",
                phone: v["phone"] ?? "",
                notes: v["notes"] ?? "",
              },
            },
            {
              onSuccess: (row) => {
                toast.success(editingCollab ? "Colaborador actualizado" : "Colaborador registrado");
                if (row) setSelectedId(row.id);
                setFormOpen(false);
              },
            },
          )
        }
        deleteTitle="Eliminar colaborador"
        deleteDescription={`Se eliminará a ${editingCollab?.name ?? ""} junto con sus tareas y citas.`}
        onDelete={
          editingCollab
            ? () =>
                deleteCollab.mutate(editingCollab.id, {
                  onSuccess: () => {
                    toast.success("Colaborador eliminado");
                    setSelectedId(null);
                    setFormOpen(false);
                  },
                })
            : undefined
        }
      />
    </>
  );
}

function CollaboratorDetail({ collaborator, onEdit }: { collaborator: Collaborator; onEdit: () => void }) {
  const tasks = useCollaboratorTasks();
  const appointments = useCollaboratorAppointments();
  const saveTask = useSaveCollaboratorTask();
  const deleteTask = useDeleteCollaboratorTask();
  const updateStatus = useUpdateCollaboratorTaskStatus();
  const [taskDialog, setTaskDialog] = useState<{ open: boolean; task: CollaboratorTask | null }>({
    open: false,
    task: null,
  });
  const [apptDialog, setApptDialog] = useState<{ open: boolean; appt: CollaboratorAppointment | null }>({
    open: false,
    appt: null,
  });

  const myTasks = (tasks.data ?? []).filter((t) => t.collaborator_id === collaborator.id);
  const now = Date.now();
  const myAppts = (appointments.data ?? []).filter((a) => a.collaborator_id === collaborator.id);
  const upcoming = myAppts.filter((a) => new Date(a.starts_at).getTime() + a.duration_minutes * 60000 >= now);
  const past = myAppts.filter((a) => new Date(a.starts_at).getTime() + a.duration_minutes * 60000 < now).reverse();
  const wa = whatsappUrl(collaborator.phone);

  const editingTask = taskDialog.task;
  const taskInitial: TaskFormValues = editingTask
    ? {
        title: editingTask.title,
        status: editingTask.status,
        due_date: editingTask.due_date,
        notes: editingTask.notes,
        owner_id: collaborator.id,
      }
    : { title: "", status: "Pendiente", due_date: null, notes: "", owner_id: collaborator.id };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border bg-card p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary font-display text-lg font-bold text-primary-foreground">
              {initials(collaborator.name)}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold text-card-foreground">{collaborator.name}</h2>
              <p className="text-sm text-muted-foreground">{collaborator.role || "Sin función registrada"}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil />
            Editar
          </Button>
        </div>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {collaborator.email ? (
            <a href={`mailto:${collaborator.email}`} className="inline-flex items-center gap-2 text-primary-soft hover:underline">
              <Mail className="h-4 w-4" />
              {collaborator.email}
            </a>
          ) : (
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              Sin correo
            </span>
          )}
          {collaborator.phone ? (
            <span className="inline-flex items-center gap-2 text-foreground">
              <Phone className="h-4 w-4 text-muted-foreground" />
              {collaborator.phone}
              {wa && (
                <a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary-soft hover:underline">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              )}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              Sin teléfono
            </span>
          )}
        </div>
        {collaborator.notes && <p className="mt-4 text-sm text-muted-foreground">{collaborator.notes}</p>}
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-foreground">Citas y reuniones</h2>
          <Button size="sm" onClick={() => setApptDialog({ open: true, appt: null })}>
            <CalendarPlus />
            Nueva cita
          </Button>
        </div>
        <div className="mb-4">
          <MeetNotice />
        </div>
        {appointments.isPending ? (
          <LoadingBlock rows={1} />
        ) : upcoming.length === 0 && past.length === 0 ? (
          <EmptyState title="Sin citas" description="Agenda una reunión y pega el enlace de Google Meet." />
        ) : (
          <div className="space-y-3">
            {upcoming.map((a) => (
              <AppointmentRow key={a.id} appt={a} collaborator={collaborator} onEdit={() => setApptDialog({ open: true, appt: a })} />
            ))}
            {past.length > 0 && (
              <details className="group rounded-xl border bg-surface p-3">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                  Citas pasadas ({past.length})
                </summary>
                <div className="mt-3 space-y-3">
                  {past.map((a) => (
                    <AppointmentRow key={a.id} appt={a} collaborator={collaborator} past onEdit={() => setApptDialog({ open: true, appt: a })} />
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-foreground">Tareas del colaborador</h2>
          <Button size="sm" onClick={() => setTaskDialog({ open: true, task: null })}>
            <Plus />
            Tarea
          </Button>
        </div>
        <div className="mb-4">
          <DeadlineLegend />
        </div>
        {tasks.isPending ? (
          <LoadingBlock rows={1} />
        ) : (
          <TaskBoard
            compact
            tasks={myTasks}
            onOpen={(id) => setTaskDialog({ open: true, task: myTasks.find((t) => t.id === id) ?? null })}
            onStatusChange={(id, status) => updateStatus.mutate({ id, status })}
          />
        )}
      </section>

      <TaskFormDialog
        open={taskDialog.open}
        onOpenChange={(o) => !o && setTaskDialog({ open: false, task: null })}
        initial={taskInitial}
        isEditing={!!editingTask}
        ownerLabel="Colaborador"
        statuses={TASK_STATUSES}
        saving={saveTask.isPending}
        onSave={(v) =>
          saveTask.mutate(
            {
              id: editingTask?.id,
              values: {
                collaborator_id: collaborator.id,
                title: v.title,
                status: v.status,
                due_date: v.due_date,
                notes: v.notes,
              },
            },
            {
              onSuccess: () => {
                toast.success(editingTask ? "Tarea actualizada" : "Tarea creada");
                setTaskDialog({ open: false, task: null });
              },
            },
          )
        }
        onDelete={
          editingTask
            ? () =>
                deleteTask.mutate(editingTask.id, {
                  onSuccess: () => {
                    toast.success("Tarea eliminada");
                    setTaskDialog({ open: false, task: null });
                  },
                })
            : undefined
        }
      />

      <AppointmentFormDialog
        open={apptDialog.open}
        onOpenChange={(o) => !o && setApptDialog({ open: false, appt: null })}
        collaborator={collaborator}
        appointment={apptDialog.appt}
      />
    </div>
  );
}

function AppointmentRow({
  appt,
  collaborator,
  past,
  onEdit,
}: {
  appt: CollaboratorAppointment;
  collaborator: Collaborator;
  past?: boolean;
  onEdit: () => void;
}) {
  return (
    <article className={cn("rounded-xl border bg-card p-4 shadow-card", past && "opacity-70")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-highlight">
            {capitalize(formatDateTime(appt.starts_at, "EEEE d 'de' MMMM, HH:mm"))}
          </p>
          <h3 className="mt-1 font-display text-sm font-semibold text-card-foreground">{appt.title}</h3>
          <p className="text-xs text-muted-foreground">
            {appt.duration_minutes} min · {appt.meet_link ? "Enlace de Meet guardado" : "Sin enlace de Meet"}
          </p>
          {appt.notes && <p className="mt-2 text-xs text-muted-foreground">{appt.notes}</p>}
        </div>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Pencil />
          Editar
        </Button>
      </div>
      {!past && (
        <div className="mt-3 border-t pt-3">
          <MeetButtons
            meetLink={appt.meet_link}
            showOpenMeet={!appt.meet_link}
            calendarUrl={calendarUrlFor({
              title: appt.title,
              startsAt: appt.starts_at,
              durationMinutes: appt.duration_minutes,
              notes: appt.notes,
              meetLink: appt.meet_link,
              guestEmail: collaborator.email,
              collaboratorName: collaborator.name,
            })}
          />
        </div>
      )}
    </article>
  );
}
