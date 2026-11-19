import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Mail, Phone, Plus, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SimpleRecordDialog, type RecordField } from "@/components/crm/SimpleRecordDialog";
import {
  EmptyState,
  ErrorBlock,
  FilterBar,
  LoadingBlock,
  PageHeader,
  SearchInput,
} from "@/components/crm/ui-bits";
import { useDeleteSupplier, useSaveSupplier, useSuppliers } from "@/hooks/use-crm";
import { matchesSearch, type Supplier } from "@/lib/crm";

export const Route = createFileRoute("/proveedores")({
  head: () => ({
    meta: [
      { title: "Proveedores | ROJU Consulting CRM" },
      { name: "description", content: "Directorio de proveedores con contacto y producto o servicio." },
      { property: "og:title", content: "Proveedores | ROJU Consulting CRM" },
      { property: "og:description", content: "Directorio de proveedores con contacto y producto o servicio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SuppliersPage,
});

const FIELDS: RecordField[] = [
  { key: "name", label: "Nombre / empresa", required: true, wide: true },
  { key: "contact_person", label: "Persona de contacto" },
  { key: "product_service", label: "Producto o servicio", placeholder: "Impresión, fotografía, hosting..." },
  { key: "email", label: "Correo", type: "email" },
  { key: "phone", label: "Teléfono", type: "tel" },
  { key: "notes", label: "Notas", type: "textarea" },
];

function SuppliersPage() {
  const suppliers = useSuppliers();
  const save = useSaveSupplier();
  const remove = useDeleteSupplier();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  const list = useMemo(
    () =>
      (suppliers.data ?? []).filter((s) =>
        matchesSearch(search, [s.name, s.contact_person, s.email, s.phone, s.product_service, s.notes]),
      ),
    [suppliers.data, search],
  );

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  return (
    <>
      <PageHeader
        eyebrow="Red de apoyo"
        title="Proveedores"
        description="Quién te provee qué, y cómo contactarlo."
        actions={
          <Button onClick={openCreate}>
            <Plus />
            Nuevo proveedor
          </Button>
        }
      />

      <FilterBar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre, contacto o producto"
          className="sm:col-span-2 lg:flex-1"
        />
      </FilterBar>

      {suppliers.isPending ? (
        <LoadingBlock />
      ) : suppliers.isError ? (
        <ErrorBlock message={suppliers.error.message} />
      ) : suppliers.data.length === 0 ? (
        <EmptyState
          title="Aún no hay proveedores"
          description="Registra a tus proveedores para tenerlos a la mano."
          action={
            <Button onClick={openCreate}>
              <Plus />
              Nuevo proveedor
            </Button>
          }
        />
      ) : list.length === 0 ? (
        <EmptyState title="Sin resultados" description="Prueba con otra búsqueda." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((s) => (
            <button
              type="button"
              key={s.id}
              onClick={() => {
                setEditing(s);
                setOpen(true);
              }}
              className="cursor-pointer rounded-2xl border bg-card p-5 text-left shadow-card transition-colors hover:border-primary-soft/40"
            >
              <p className="eyebrow !text-highlight">{s.product_service || "Producto o servicio sin definir"}</p>
              <h3 className="mt-2 font-display text-base font-semibold text-card-foreground">{s.name}</h3>
              <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 shrink-0" />
                  <span className="truncate">{s.contact_person || "Sin persona de contacto"}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="truncate">{s.email || "Sin correo"}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0" />
                  <span className="truncate">{s.phone || "Sin teléfono"}</span>
                </li>
              </ul>
              {s.notes && <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{s.notes}</p>}
            </button>
          ))}
        </div>
      )}

      <SimpleRecordDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Editar proveedor" : "Nuevo proveedor"}
        fields={FIELDS}
        initial={{
          name: editing?.name ?? "",
          contact_person: editing?.contact_person ?? "",
          product_service: editing?.product_service ?? "",
          email: editing?.email ?? "",
          phone: editing?.phone ?? "",
          notes: editing?.notes ?? "",
        }}
        isEditing={!!editing}
        saving={save.isPending}
        onSave={(v) =>
          save.mutate(
            {
              id: editing?.id,
              values: {
                name: v["name"] ?? "",
                contact_person: v["contact_person"] ?? "",
                product_service: v["product_service"] ?? "",
                email: v["email"] ?? "",
                phone: v["phone"] ?? "",
                notes: v["notes"] ?? "",
              },
            },
            {
              onSuccess: () => {
                toast.success(editing ? "Proveedor actualizado" : "Proveedor registrado");
                setOpen(false);
              },
            },
          )
        }
        deleteTitle="Eliminar proveedor"
        deleteDescription={`Se eliminará ${editing?.name ?? "este proveedor"}.`}
        onDelete={
          editing
            ? () =>
                remove.mutate(editing.id, {
                  onSuccess: () => {
                    toast.success("Proveedor eliminado");
                    setOpen(false);
                  },
                })
            : undefined
        }
      />
    </>
  );
}
