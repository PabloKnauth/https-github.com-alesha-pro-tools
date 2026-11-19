import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Send, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DEMO, leerSesion, preguntarAsistente, SesionVencida, type MensajeChat } from "@/lib/api";
import { cn } from "@/lib/utils";

type Burbuja = MensajeChat & { acciones?: string[]; error?: boolean };

const SUGERENCIAS = [
  "¿Qué tengo pendiente hoy?",
  "Resume cómo vamos en ventas este mes",
  "Crea una tarea para Café Aurora: enviar propuesta el viernes",
  "¿Qué clientes llevan más de una semana sin seguimiento?",
];

const llave = () => `roju-asistente-${leerSesion()?.usuario ?? "x"}`;
function leerChat(): Burbuja[] {
  try {
    return JSON.parse(sessionStorage.getItem(llave()) ?? "[]") as Burbuja[];
  } catch {
    return [];
  }
}

/** Asistente de IA del CRM: responde dudas y ejecuta varias acciones a la vez. */
export function AssistantPanel() {
  const [abierto, setAbierto] = useState(false);
  const [chat, setChat] = useState<Burbuja[]>([]);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const fin = useRef<HTMLDivElement>(null);
  const entrada = useRef<HTMLTextAreaElement>(null);
  const qc = useQueryClient();

  useEffect(() => setChat(leerChat()), []);
  useEffect(() => {
    try {
      sessionStorage.setItem(llave(), JSON.stringify(chat.slice(-40)));
    } catch {
      /* sin almacenamiento */
    }
    fin.current?.scrollIntoView({ block: "end" });
  }, [chat, pensando]);
  useEffect(() => {
    if (abierto) setTimeout(() => entrada.current?.focus(), 50);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [abierto]);

  async function enviar(mensaje: string) {
    const m = mensaje.trim();
    if (!m || pensando) return;
    const historial: MensajeChat[] = chat.filter((b) => !b.error).map(({ role, texto: t }) => ({ role, texto: t }));
    setChat((c) => [...c, { role: "user", texto: m }]);
    setTexto("");
    setPensando(true);
    try {
      const r = await preguntarAsistente(m, historial);
      setChat((c) => [...c, { role: "assistant", texto: r.respuesta, acciones: r.acciones }]);
      if (r.acciones.length) {
        await qc.invalidateQueries();
        toast.success(r.acciones.length === 1 ? "El asistente hizo 1 cambio" : `El asistente hizo ${r.acciones.length} cambios`);
      }
    } catch (e) {
      if (e instanceof SesionVencida) return;
      setChat((c) => [...c, { role: "assistant", texto: e instanceof Error ? e.message : "No se pudo contactar al asistente", error: true }]);
    } finally {
      setPensando(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void enviar(texto);
  }

  return (
    <>
      {!abierto && (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] z-50 inline-flex min-h-12 items-center gap-2 rounded-full bg-highlight px-5 font-display text-sm font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5 active:scale-95"
          aria-label="Abrir asistente de IA"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Asistente
        </button>
      )}
      {abierto && (
        <section
          role="dialog"
          aria-label="Asistente de IA"
          className="fixed inset-0 z-50 flex flex-col border-r bg-background sm:inset-auto sm:bottom-4 sm:left-4 sm:h-[min(640px,calc(100vh-2rem))] sm:w-[400px] sm:rounded-2xl sm:border sm:shadow-2xl"
        >
          <header className="flex items-center justify-between gap-3 border-b px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-3">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 font-display text-sm font-bold">
                <Sparkles className="h-4 w-4 text-highlight" aria-hidden="true" />
                Asistente ROJU
              </h2>
              <p className="text-xs text-muted-foreground">Consulta y actualiza el CRM escribiendo en lenguaje normal.</p>
            </div>
            <div className="flex shrink-0 gap-1">
              {chat.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setChat([])} disabled={pensando}>
                  Nueva
                </Button>
              )}
              <Button variant="ghost" size="icon" aria-label="Cerrar asistente" onClick={() => setAbierto(false)}>
                <X />
              </Button>
            </div>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            {chat.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Pídeme varias cosas a la vez: buscar clientes, crear tareas, mover etapas, agregar notas o resumir cómo van.
                  {DEMO && " En la vista previa no estoy conectado a la IA."}
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGERENCIAS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void enviar(s)}
                      className="rounded-full border px-3 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-accent"
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">No borra información: eso se hace desde la pantalla.</p>
              </div>
            )}
            {chat.map((b, i) => (
              <div key={i} className={cn("flex", b.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm [overflow-wrap:anywhere]",
                    b.role === "user" ? "bg-primary text-primary-foreground" : b.error ? "border border-status-late/40 bg-status-late/10 text-foreground" : "bg-card text-card-foreground",
                  )}
                >
                  <p className="whitespace-pre-wrap">{b.texto}</p>
                  {b.acciones && b.acciones.length > 0 && (
                    <ul className="mt-2 space-y-1 border-t pt-2 text-xs text-muted-foreground">
                      {b.acciones.map((a, j) => (
                        <li key={j} className="flex items-start gap-1.5">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-ok" aria-hidden="true" />
                          {a}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
            {pensando && <p className="text-xs text-muted-foreground">Pensando…</p>}
            <div ref={fin} />
          </div>

          <form onSubmit={onSubmit} className="flex items-end gap-2 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <label htmlFor="asistente-msg" className="sr-only">
              Mensaje para el asistente
            </label>
            <Textarea
              id="asistente-msg"
              ref={entrada}
              rows={2}
              maxLength={4000}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void enviar(texto);
                }
              }}
              placeholder="Escribe lo que necesitas…"
              className="max-h-40 min-h-[44px] resize-none"
            />
            <Button type="submit" size="icon" className="h-11 w-11 shrink-0" disabled={!texto.trim() || pensando} aria-label="Enviar">
              <Send />
            </Button>
          </form>
        </section>
      )}
    </>
  );
}
