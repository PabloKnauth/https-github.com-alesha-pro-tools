import type { ReactNode } from "react";
import { CalendarDays } from "lucide-react";
import { DeadlineBadge } from "./DeadlineBadge";
import { ChoiceSelect, PersonTag } from "./ui-bits";
import { AttachmentCount } from "./TaskAttachments";
import { compareByUrgency, describeDaysLeft } from "@/lib/deadline";
import { formatDay } from "@/lib/dates";
import { TASK_STATUSES } from "@/lib/crm";
import { cn } from "@/lib/utils";

export type BoardTask = {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  notes: string;
  created_at: string;
  context?: ReactNode; // e.g. client name
  person?: string; // encargado
};

export function TaskCard({
  task,
  onOpen,
  onStatusChange,
  docsTabla,
}: {
  task: BoardTask;
  onOpen: () => void;
  onStatusChange: (status: string) => void;
  docsTabla?: "tasks" | "collaborator_tasks";
}) {
  const done = task.status === "Terminada";
  return (
    <article className="group rounded-xl border bg-card p-4 shadow-card transition-colors hover:border-primary-soft/40">
      <button type="button" onClick={onOpen} className="block w-full cursor-pointer text-left">
        <div className="flex items-start justify-between gap-3">
          <h3
            className={cn(
              "font-display text-sm font-semibold leading-snug text-card-foreground",
              done && "text-muted-foreground line-through decoration-muted-foreground/60",
            )}
          >
            {task.title}
          </h3>
          <DeadlineBadge due={task.due_date} status={task.status} />
        </div>
        {task.context && <div className="mt-1 text-xs text-primary-soft">{task.context}</div>}
        {task.due_date && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDay(task.due_date)}
            {!done && <span>· {describeDaysLeft(task.due_date)}</span>}
          </p>
        )}
        {task.notes && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{task.notes}</p>}
        {docsTabla && (
          <div className="mt-2">
            <AttachmentCount tabla={docsTabla} tareaId={task.id} />
          </div>
        )}
      </button>
      <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
        {task.person ? <PersonTag name={task.person} /> : <span />}
        <ChoiceSelect
          value={task.status}
          onChange={onStatusChange}
          options={TASK_STATUSES}
          ariaLabel="Cambiar estado"
          className="h-8 w-[140px] text-xs"
        />
      </div>
    </article>
  );
}

export function TaskBoard({
  tasks,
  onOpen,
  onStatusChange,
  compact,
  docsTabla,
}: {
  tasks: BoardTask[];
  onOpen: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  compact?: boolean;
  docsTabla?: "tasks" | "collaborator_tasks";
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-5", compact ? "lg:grid-cols-3" : "md:grid-cols-3")}>
      {TASK_STATUSES.map((status) => {
        const list = tasks.filter((t) => t.status === status).sort((a, b) => compareByUrgency(a, b));
        return (
          <section key={status} aria-label={status} className="min-w-0">
            <header className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-sm font-bold uppercase tracking-[0.12em] text-foreground">
                {status}
              </h2>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                {list.length}
              </span>
            </header>
            <div className="space-y-3">
              {list.length === 0 ? (
                <p className="rounded-xl border border-dashed px-4 py-6 text-center text-xs text-muted-foreground">
                  Sin tareas
                </p>
              ) : (
                list.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onOpen={() => onOpen(t.id)}
                    onStatusChange={(s) => onStatusChange(t.id, s)}
                    docsTabla={docsTabla}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
