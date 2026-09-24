"use client";

import { LineChart } from "lucide-react";
import { useTranslations } from "next-intl";
import { InvestmentSectionNav } from "@/components/dashboard/investment/investment-section-nav";

// En-tête commun à toutes les sous-pages de l'espace Investissement : identifie la
// section (titre + une phrase) puis pose la navigation locale. Le solde et les chiffres
// clés vivent dans les sous-pages, pas ici — l'en-tête reste identique partout.
export function InvestmentSectionHeader() {
  const t = useTranslations("Dashboard.investmentSpace");
  return (
    <header className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
          <LineChart className="size-5" />
        </span>
        <div>
          <h1 className="font-heading text-2xl leading-tight font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>
      <InvestmentSectionNav />
    </header>
  );
}
