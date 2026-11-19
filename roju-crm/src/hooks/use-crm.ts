import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { db, SesionVencida, type TableName, type Row } from "@/lib/api";
import type {
  ClientInsert,
  CollaboratorAppointmentInsert,
  CollaboratorInsert,
  CollaboratorTaskInsert,
  SupplierInsert,
  TaskInsert,
} from "@/lib/crm";

// Both partners share the same data: refresh regularly so changes from the other person show up.
const SHARED_REFRESH_MS = 20_000;

function onError(error: Error) {
  if (error instanceof SesionVencida) return;
  toast.error("No se pudo guardar", { description: error.message });
}

/** Ordena como lo hacía la base de datos original. */
function ordenar<T extends TableName>(filas: Row<T>[], campo: keyof Row<T>, asc = true): Row<T>[] {
  return [...filas].sort((a, b) => {
    const x = String(a[campo] ?? ""), y = String(b[campo] ?? "");
    return (asc ? 1 : -1) * x.localeCompare(y, "es-MX");
  });
}

export const crmKeys = {
  clients: ["clients"] as const,
  tasks: ["tasks"] as const,
  collaborators: ["collaborators"] as const,
  collaboratorTasks: ["collaborator_tasks"] as const,
  collaboratorAppointments: ["collaborator_appointments"] as const,
  suppliers: ["suppliers"] as const,
};

/* ---------- Queries ---------- */

export function useClients() {
  return useQuery({
    queryKey: crmKeys.clients,
    queryFn: () => db.listar("clients").then((f) => ordenar<"clients">(f, "updated_at", false)),
    refetchInterval: SHARED_REFRESH_MS,
  });
}

export function useTasks() {
  return useQuery({
    queryKey: crmKeys.tasks,
    queryFn: () => db.listar("tasks").then((f) => ordenar<"tasks">(f, "created_at")),
    refetchInterval: SHARED_REFRESH_MS,
  });
}

export function useCollaborators() {
  return useQuery({
    queryKey: crmKeys.collaborators,
    queryFn: () => db.listar("collaborators").then((f) => ordenar<"collaborators">(f, "name")),
    refetchInterval: SHARED_REFRESH_MS,
  });
}

export function useCollaboratorTasks() {
  return useQuery({
    queryKey: crmKeys.collaboratorTasks,
    queryFn: () => db.listar("collaborator_tasks").then((f) => ordenar<"collaborator_tasks">(f, "created_at")),
    refetchInterval: SHARED_REFRESH_MS,
  });
}

export function useCollaboratorAppointments() {
  return useQuery({
    queryKey: crmKeys.collaboratorAppointments,
    queryFn: () =>
      db.listar("collaborator_appointments").then((f) => ordenar<"collaborator_appointments">(f, "starts_at")),
    refetchInterval: SHARED_REFRESH_MS,
  });
}

export function useSuppliers() {
  return useQuery({
    queryKey: crmKeys.suppliers,
    queryFn: () => db.listar("suppliers").then((f) => ordenar<"suppliers">(f, "name")),
    refetchInterval: SHARED_REFRESH_MS,
  });
}

/* ---------- Mutations ---------- */

type Save<T> = { id?: string; values: T };

export function useSaveClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: Save<ClientInsert>) =>
      id
        ? db.actualizar("clients", id, values)
        : db.crear("clients", values),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.clients }),
    onError,
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: Partial<ClientInsert> }) =>
      db.actualizar("clients", id, values),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.clients }),
    onError,
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => db.eliminar("clients", id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.clients });
      qc.invalidateQueries({ queryKey: crmKeys.tasks });
    },
    onError,
  });
}

export function useSaveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: Save<TaskInsert>) =>
      id
        ? db.actualizar("tasks", id, values)
        : db.crear("tasks", values),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.tasks }),
    onError,
  });
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      db.actualizar("tasks", id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.tasks }),
    onError,
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => db.eliminar("tasks", id),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.tasks }),
    onError,
  });
}

export function useSaveCollaborator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: Save<CollaboratorInsert>) =>
      id
        ? db.actualizar("collaborators", id, values)
        : db.crear("collaborators", values),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.collaborators }),
    onError,
  });
}

export function useDeleteCollaborator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      db.eliminar("collaborators", id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.collaborators });
      qc.invalidateQueries({ queryKey: crmKeys.collaboratorTasks });
      qc.invalidateQueries({ queryKey: crmKeys.collaboratorAppointments });
    },
    onError,
  });
}

export function useSaveCollaboratorTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: Save<CollaboratorTaskInsert>) =>
      id
        ? db.actualizar("collaborator_tasks", id, values)
        : db.crear("collaborator_tasks", values),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.collaboratorTasks }),
    onError,
  });
}

export function useUpdateCollaboratorTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      db.actualizar("collaborator_tasks", id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.collaboratorTasks }),
    onError,
  });
}

export function useDeleteCollaboratorTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      db.eliminar("collaborator_tasks", id),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.collaboratorTasks }),
    onError,
  });
}

export function useSaveCollaboratorAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: Save<CollaboratorAppointmentInsert>) =>
      id
        ? db.actualizar("collaborator_appointments", id, values)
        : db.crear("collaborator_appointments", values),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.collaboratorAppointments }),
    onError,
  });
}

export function useDeleteCollaboratorAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      db.eliminar("collaborator_appointments", id),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.collaboratorAppointments }),
    onError,
  });
}

export function useSaveSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: Save<SupplierInsert>) =>
      id
        ? db.actualizar("suppliers", id, values)
        : db.crear("suppliers", values),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.suppliers }),
    onError,
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => db.eliminar("suppliers", id),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.suppliers }),
    onError,
  });
}
