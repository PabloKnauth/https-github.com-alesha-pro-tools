import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cerrarSesion, DEMO, leerSesion } from "@/lib/api";
import { reiniciarEjemplo } from "@/lib/demo";
import { BackupDialog } from "./BackupDialog";

const NAV = [
  { to: "/", label: "Hoy y esta semana" },
  { to: "/clientes", label: "Seguimiento de clientes" },
  { to: "/tareas", label: "Tareas" },
  { to: "/colaboradores", label: "Colaboradores" },
  { to: "/proveedores", label: "Proveedores" },
  { to: "/agenda", label: "Agenda" },
] as const;

/** Wordmark del manual: ROJU con la R en azul y la J en naranja, CONSULTING debajo. */
export function Wordmark({ size = "md" }: { size?: "md" | "lg" }) {
  const grande = size === "lg";
  return (
    <span className="inline-flex flex-col items-start leading-none" aria-label="ROJU Consulting">
      <span
        aria-hidden="true"
        className={`font-display font-extrabold tracking-[0.04em] text-white ${grande ? "text-4xl" : "text-[22px]"}`}
      >
        <span className="text-roju-digital">R</span>O<span className="text-highlight">J</span>U
      </span>
      <span
        aria-hidden="true"
        className={`font-display font-semibold uppercase text-muted-foreground ${
          grande ? "mt-1.5 text-[11px] tracking-[0.42em]" : "mt-1 text-[8.5px] tracking-[0.36em]"
        }`}
      >
        Consulting
      </span>
    </span>
  );
}

export function BrandMark() {
  return (
    <Link to="/" className="flex items-center gap-4" aria-label="ROJU Consulting, inicio">
      <Wordmark />
      <span className="hidden border-l pl-4 text-[11px] text-muted-foreground sm:block">
        Pensamos. Creamos. Crecemos.
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      {DEMO && (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-primary px-4 py-2 text-center text-xs text-primary-foreground">
          <span>
            Vista previa con datos de ejemplo. Los cambios se guardan solo en este navegador, no en el CRM real.
          </span>
          <button
            type="button"
            className="font-semibold underline underline-offset-2"
            onClick={() => {
              reiniciarEjemplo();
              window.location.reload();
            }}
          >
            Restablecer ejemplo
          </button>
        </div>
      )}
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 pt-4 sm:px-6 lg:px-8">
          <BrandMark />
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-xs text-muted-foreground sm:block">{leerSesion()?.usuario}</span>
            <BackupDialog />
            <button
              type="button"
              onClick={cerrarSesion}
              className="rounded-md border px-3 py-1.5 font-display text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Salir
            </button>
          </div>
        </div>
        <nav
          aria-label="Secciones"
          className="scrollbar-thin mx-auto mt-3 flex max-w-[1400px] gap-1 overflow-x-auto px-2 sm:px-4 lg:px-6"
        >
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="relative shrink-0 whitespace-nowrap px-3 py-3 font-display text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{
                className:
                  "!text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-highlight",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        {children}
      </main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-1 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <span>ROJU Consulting. Pensamos. Creamos. Crecemos.</span>
          <span>Datos compartidos entre Pablo Knauth y Kevin Juárez</span>
        </div>
      </footer>
    </div>
  );
}
