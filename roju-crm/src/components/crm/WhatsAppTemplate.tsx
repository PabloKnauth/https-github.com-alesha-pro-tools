import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WHATSAPP_TEMPLATES, fillTemplate, whatsappMessageUrl, type Stage } from "@/lib/crm";

/** Abre WhatsApp con el mensaje sugerido para la etapa actual del cliente. */
export function WhatsAppTemplate({
  client,
}: {
  client: { name: string; contact?: string; phone: string; responsable: string; stage: string };
}) {
  const plantilla = WHATSAPP_TEMPLATES[client.stage as Stage];
  if (!plantilla) return null;
  const texto = fillTemplate(plantilla, client);
  const url = whatsappMessageUrl(client.phone, texto);
  return (
    <div className="rounded-xl border bg-surface p-4 sm:col-span-2">
      <p className="font-display text-sm font-bold">Mensaje sugerido para «{client.stage}»</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{texto}</p>
      <div className="mt-3">
        {url ? (
          <Button asChild size="sm" variant="outline">
            <a href={url} target="_blank" rel="noreferrer">
              <MessageCircle />
              Enviar por WhatsApp
            </a>
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">Agrega un teléfono con al menos 8 dígitos para enviarlo.</p>
        )}
      </div>
    </div>
  );
}
