"use client";

import { useEffect, type FormEvent, type ReactNode } from "react";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_BTN_PRIMARY, ADMIN_CARD_RAISED, ADMIN_FOCUS_RING, ADMIN_INPUT, ADMIN_LABEL } from "@/lib/admin-theme";

// Coquille de formulaire d'édition — même famille visuelle que ConfirmDialog (fond
// obsidian, bordure champagne), mais avec un corps scrollable pour des formulaires plus
// longs (finances, adresses...). Utilisée par toutes les éditions de la fiche client
// réelle (cf. lib/api.ts updateAdminClient*) — jamais affichée pour un client de
// démonstration (pas de userId, cf. PersonalTab/FinancialTab).
export function AdminFormDialog({
  open,
  title,
  description,
  onClose,
  onSubmit,
  submitting,
  error,
  children,
  submitLabel = "Enregistrer",
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
  children: ReactNode;
  submitLabel?: string;
}) {
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!submitting) onSubmit();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <button type="button" aria-label="Fermer" onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <form
        onSubmit={handleSubmit}
        className={cn(ADMIN_CARD_RAISED, "relative z-10 flex max-h-full w-full max-w-lg flex-col overflow-hidden")}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-foreground/[0.07] px-5 py-3.5">
          <div>
            <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
            {description && <p className="mt-0.5 text-[11.5px] text-muted-foreground">{description}</p>}
          </div>
          <button
            type="button"
            aria-label="Fermer"
            onClick={onClose}
            className={cn("flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground", ADMIN_FOCUS_RING)}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-4">{children}</div>
          {error && <p className="mt-4 text-[12.5px] text-destructive">{error}</p>}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-foreground/[0.07] px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className={cn("rounded-md px-3 py-1.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground", ADMIN_FOCUS_RING)}
          >
            Annuler
          </button>
          <button type="submit" disabled={submitting} className={ADMIN_BTN_PRIMARY}>
            {submitting && <Loader2 className="size-3.5 animate-spin" />}
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

// Champs réutilisés par tous les formulaires d'édition — libellé discret + input sombre,
// cohérents avec ADMIN_INPUT déjà utilisé ailleurs dans l'admin.
export function FormField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className={ADMIN_LABEL}>{label}</span>
      {children}
    </div>
  );
}

export function FormInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(ADMIN_INPUT, props.className)} />;
}

export function FormSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(ADMIN_INPUT, "appearance-none", props.className)} />;
}
