"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_CARD_RAISED, ADMIN_FOCUS_RING } from "@/lib/admin-theme";

// Modale de confirmation générique — utilisée pour toute action critique de la fiche
// client (approuver, refuser, mettre en attente…) : cf. brief §20/§26, "chaque décision
// majeure doit être justifiable" implique aussi qu'elle ne parte jamais d'un simple clic
// accidentel. Composant local plutôt que le Dialog shadcn/ui (celui-ci porte les tokens
// clairs du thème client, ici on veut du dark premium cohérent avec le reste de l'admin).
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmer",
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Fermer"
        onClick={onCancel}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className={cn(ADMIN_CARD_RAISED, "relative z-10 w-full max-w-sm p-5")} role="alertdialog" aria-modal="true">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full",
              danger ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
            )}
          >
            <AlertTriangle className="size-4" />
          </div>
          <div>
            <h3 className="text-[13.5px] font-semibold text-foreground">{title}</h3>
            <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              "rounded-md px-3 py-1.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground",
              ADMIN_FOCUS_RING,
            )}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              "rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
              danger ? "bg-destructive text-white hover:bg-destructive/85" : "bg-primary text-primary-foreground hover:bg-chart-2",
              ADMIN_FOCUS_RING,
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
