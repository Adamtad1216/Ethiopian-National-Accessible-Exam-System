import React, { useState } from "react";
import { useConfirmation } from "@/contexts/ConfirmationContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export function ConfirmationModal() {
  const { state, close } = useConfirmation();
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await state.onConfirm?.();
    } finally {
      setIsLoading(false);
      close();
    }
  };

  const handleCancel = () => {
    state.onCancel?.();
    close();
  };

  const isDanger = state.variant === "danger";

  const icon =
    state.icon || isDanger ? (
      <AlertCircle className="h-6 w-6 text-red-600" />
    ) : (
      <CheckCircle2 className="h-6 w-6 text-blue-600" />
    );

  return (
    <Dialog open={state.isOpen} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">{icon}</div>
            <div className="flex-1">
              <DialogTitle className="text-lg">{state.title}</DialogTitle>
              {state.description && (
                <DialogDescription className="mt-2 text-sm">
                  {state.description}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            className="px-4"
          >
            {state.cancelLabel || "Cancel"}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className={
              isDanger
                ? "bg-red-600 hover:bg-red-700 text-white px-4"
                : "bg-gradient-primary px-4"
            }
          >
            {isLoading ? (
              <>
                <span className="inline-block mr-2 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {state.confirmLabel || "Confirm"}
              </>
            ) : (
              state.confirmLabel || "Confirm"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
