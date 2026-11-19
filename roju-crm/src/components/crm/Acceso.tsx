import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { alCambiarSesion, DEMO, entrar, leerSesion, USUARIOS, type Usuario } from "@/lib/api";
import { Wordmark } from "./AppShell";

/** Muestra el CRM solo con sesión iniciada; si no, la pantalla de acceso. */
export function Acceso({ children }: { children: ReactNode }) {
  const [listo, setListo] = useState(false);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    const leer = () => setUsuario(leerSesion()?.usuario ?? null);
    leer();
    setListo(true);
    return alCambiarSesion(leer);
  }, []);

  useEffect(() => {
    if (!usuario) qc.clear();
  }, [usuario, qc]);

  if (!listo) return <div className="min-h-screen bg-background" aria-busy="true" />;
  if (!usuario) return <PantallaEntrar />;
  return <>{children}</>;
}

function PantallaEntrar() {
  const [usuario, setUsuario] = useState<Usuario>(USUARIOS[0]);
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      await entrar(usuario, clave);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo entrar");
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border bg-card p-7 text-card-foreground"
        aria-labelledby="titulo-acceso"
      >
        <div className="flex justify-center">
          <Wordmark size="lg" />
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">Pensamos. Creamos. Crecemos.</p>
        <h1 id="titulo-acceso" className="mt-7 font-display text-lg font-bold">
          Entrar al CRM
        </h1>
        <fieldset className="mt-4">
          <legend className="text-sm font-medium">¿Quién eres?</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {USUARIOS.map((u) => (
              <label
                key={u}
                className={`flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2.5 text-center text-sm font-medium transition-colors ${
                  usuario === u ? "border-primary-soft bg-primary text-primary-foreground" : "hover:bg-accent"
                }`}
              >
                <input
                  type="radio"
                  name="usuario"
                  value={u}
                  checked={usuario === u}
                  onChange={() => setUsuario(u)}
                  className="sr-only"
                />
                {u}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-4 grid gap-2">
          <Label htmlFor="clave">Contraseña</Label>
          <Input
            id="clave"
            type="password"
            autoComplete="current-password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            required
          />
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm text-status-late">
            {error}
          </p>
        )}
        <Button type="submit" className="mt-5 w-full" disabled={enviando}>
          {enviando ? "Entrando…" : "Entrar"}
        </Button>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {DEMO
            ? "Vista previa: escribe cualquier contraseña para entrar."
            : "Acceso exclusivo para Pablo Knauth y Kevin Juárez."}
        </p>
      </form>
    </main>
  );
}
