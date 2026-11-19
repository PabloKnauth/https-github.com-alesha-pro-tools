import { useProfiles } from "@/hooks/use-crm";
import { cn } from "@/lib/utils";

export const COLORES_PERFIL: Record<string, string> = {
  azul: "#1E46A0",
  naranja: "#E85D04",
  verde: "#1F8A5B",
  rosa: "#C2417A",
  amarillo: "#B88300",
  gris: "#4B5563",
};

export function iniciales(nombre: string) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => Array.from(p)[0]?.toUpperCase() ?? "")
    .join("");
}

/** Foto de perfil o iniciales con el color elegido por la persona. */
export function Avatar({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  const profiles = useProfiles();
  const p = profiles.data?.find((x) => x.user === name);
  const estilo = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.42)) };
  if (p?.avatar)
    return <img src={p.avatar} alt="" width={size} height={size} style={estilo} className={cn("shrink-0 rounded-full object-cover", className)} />;
  return (
    <span
      aria-hidden="true"
      style={{ ...estilo, background: COLORES_PERFIL[p?.color ?? ""] ?? COLORES_PERFIL["azul"] }}
      className={cn("flex shrink-0 items-center justify-center rounded-full font-bold text-white", className)}
    >
      {iniciales(name)}
    </span>
  );
}

export function useApodo(name: string) {
  const profiles = useProfiles();
  return profiles.data?.find((x) => x.user === name)?.nickname || name.split(" ")[0] || name;
}
