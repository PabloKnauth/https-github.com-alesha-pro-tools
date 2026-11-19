import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useProfiles, useSaveProfile } from "@/hooks/use-crm";
import { USUARIOS } from "@/lib/api";
import { ChoiceSelect, Field } from "./ui-bits";
import { COLORES_PERFIL, iniciales } from "./Avatar";

const COLORES = Object.keys(COLORES_PERFIL);
const NOMBRE_COLOR: Record<string, string> = { azul: "Azul", naranja: "Naranja", verde: "Verde", rosa: "Rosa", amarillo: "Amarillo", gris: "Gris" };

/** Reduce la foto a 256 × 256 (recorte centrado) para que pese poco y cargue rápido. */
async function reducirImagen(archivo: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(archivo.type) && !/\.(jpe?g|png|webp|heic)$/i.test(archivo.name))
    throw new Error("Elige una imagen JPG, PNG o WEBP");
  const bitmap = await createImageBitmap(archivo).catch(() => {
    throw new Error("No se pudo leer la imagen; prueba con JPG o PNG");
  });
  const lado = Math.min(bitmap.width, bitmap.height);
  const lienzo = document.createElement("canvas");
  lienzo.width = lienzo.height = 256;
  const ctx = lienzo.getContext("2d");
  if (!ctx) throw new Error("Tu navegador no permite procesar la imagen");
  ctx.drawImage(bitmap, (bitmap.width - lado) / 2, (bitmap.height - lado) / 2, lado, lado, 0, 0, 256, 256);
  return lienzo.toDataURL("image/jpeg", 0.85);
}

export function ProfileDialog({ open, onOpenChange, user }: { open: boolean; onOpenChange: (o: boolean) => void; user: string }) {
  const profiles = useProfiles();
  const save = useSaveProfile();
  const [quien, setQuien] = useState(user);
  const [nickname, setNickname] = useState("");
  const [title, setTitle] = useState("");
  const [color, setColor] = useState("azul");
  const [avatar, setAvatar] = useState<string | null>(null);
  const archivoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setQuien(user);
  }, [open, user]);
  useEffect(() => {
    const p = profiles.data?.find((x) => x.user === quien);
    setNickname(p?.nickname ?? "");
    setTitle(p?.title ?? "");
    setColor(p?.color || "azul");
    setAvatar(p?.avatar || null);
  }, [quien, profiles.data, open]);

  async function elegirFoto(f: File | undefined) {
    if (!f) return;
    try {
      setAvatar(await reducirImagen(f));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo usar esa imagen");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Perfil</DialogTitle>
          <DialogDescription>La foto, el apodo y el color se ven en el CRM para Pablo y Kevin.</DialogDescription>
        </DialogHeader>
        <Field label="Perfil de" htmlFor="p-quien">
          <ChoiceSelect id="p-quien" value={quien} onChange={setQuien} options={USUARIOS} />
        </Field>
        <div className="flex items-center gap-4">
          {avatar ? (
            <img src={avatar} alt="Foto de perfil" className="h-20 w-20 shrink-0 rounded-full object-cover" />
          ) : (
            <span
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full font-display text-2xl font-bold text-white"
              style={{ background: COLORES_PERFIL[color] }}
              aria-hidden="true"
            >
              {iniciales(quien)}
            </span>
          )}
          <div className="flex flex-wrap gap-2">
            <input
              ref={archivoRef}
              id="p-foto"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              className="sr-only"
              onChange={(e) => {
                void elegirFoto(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => archivoRef.current?.click()}>
              <ImagePlus />
              {avatar ? "Cambiar foto" : "Subir foto"}
            </Button>
            {avatar && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setAvatar(null)}>
                <Trash2 />
                Quitar
              </Button>
            )}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Apodo" htmlFor="p-apodo" hint="Cómo te saluda el CRM.">
            <Input id="p-apodo" maxLength={40} value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder={quien.split(" ")[0]} />
          </Field>
          <Field label="Puesto" htmlFor="p-puesto">
            <Input id="p-puesto" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej.: Director creativo" />
          </Field>
        </div>
        <Field label="Color" htmlFor="p-color" hint="Se usa en tus iniciales cuando no hay foto.">
          <ChoiceSelect id="p-color" value={color} onChange={setColor} options={COLORES.map((c) => ({ value: c, label: NOMBRE_COLOR[c] ?? c }))} />
        </Field>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={save.isPending}
            onClick={() =>
              save.mutate(
                { user: quien, nickname: nickname.trim(), title: title.trim(), color, avatar },
                {
                  onSuccess: () => {
                    toast.success("Perfil guardado");
                    onOpenChange(false);
                  },
                },
              )
            }
          >
            {save.isPending ? "Guardando..." : "Guardar perfil"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
