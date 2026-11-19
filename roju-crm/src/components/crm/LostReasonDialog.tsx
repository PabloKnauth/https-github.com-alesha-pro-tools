import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LOST_REASONS } from "@/lib/crm";
import { ChoiceSelect, Field } from "./ui-bits";

/** Al mover un cliente a «Perdido» se pregunta el motivo. */
export function LostReasonDialog({
  clientName,
  open,
  onCancel,
  onConfirm,
}: {
  clientName: string;
  open: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState<string>(LOST_REASONS[0]);
  useEffect(() => {
    if (open) setReason(LOST_REASONS[0]);
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">¿Por qué se perdió {clientName}?</DialogTitle>
          <DialogDescription>El motivo alimenta el resumen de «Hoy y esta semana».</DialogDescription>
        </DialogHeader>
        <Field label="Motivo" htmlFor="lost-reason">
          <ChoiceSelect id="lost-reason" value={reason} onChange={setReason} options={LOST_REASONS} />
        </Field>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => onConfirm(reason)}>
            Mover a Perdido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
