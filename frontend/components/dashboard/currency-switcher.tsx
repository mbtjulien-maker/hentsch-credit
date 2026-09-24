"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import type { DisplayCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const OPTIONS: DisplayCurrency[] = ["EUR", "USD"];

// Choix de la monnaie du compte (euro ou dollar) : le registre reste tenu en USD, cette
// préférence pilote l'affichage converti au taux du jour et la monnaie des relevés.
export function CurrencySwitcher() {
  const t = useTranslations("DashboardShell.currencySwitcher");
  const { displayCurrency, changeDisplayCurrency } = useDashboard();
  const [busy, setBusy] = useState(false);

  async function select(currency: DisplayCurrency) {
    if (busy || currency === displayCurrency) return;
    setBusy(true);
    try {
      await changeDisplayCurrency(currency);
    } catch {
      toast.error(t("error"));
      setBusy(false);
    }
  }

  return (
    <div
      role="group"
      aria-label={t("label")}
      title={t("hint")}
      className="inline-flex rounded-full border border-border bg-card p-0.5 text-xs font-semibold"
    >
      {OPTIONS.map((c) => (
        <button
          key={c}
          type="button"
          aria-pressed={displayCurrency === c}
          disabled={busy}
          onClick={() => select(c)}
          className={cn(
            "rounded-full px-2.5 py-1.5 tracking-wide transition-colors",
            displayCurrency === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
