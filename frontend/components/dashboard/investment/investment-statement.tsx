"use client";

import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const PERIODS = [3, 6, 12] as const;
type Period = (typeof PERIODS)[number];

// Relevé d'opérations d'investissement (PDF) — synthèse des placements, des rendements et
// des opérations sur la période choisie. Téléchargé par un vrai lien (navigation) et non un
// fetch : le cookie de session est SameSite=Lax, qui ne suit qu'une navigation de premier
// niveau (cf. §6 entrée #36). Le PDF n'existe qu'en français et en anglais : les autres
// langues reçoivent la version anglaise.
export function InvestmentStatementCard({ className }: { className?: string }) {
  const t = useTranslations("Dashboard.investmentSpace.statement");
  const locale = useLocale();
  const { selectedUserId, displayCurrency } = useDashboard();
  const [period, setPeriod] = useState<Period>(12);

  if (!selectedUserId) return null;
  const href = api.getInvestmentStatementUrl(selectedUserId, period, locale === "fr" ? "fr" : "en", displayCurrency);

  return (
    <Card className={className}>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span aria-hidden className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileText className="size-4" />
          </span>
          <div>
            <p className="text-sm font-medium">{t("title")}</p>
            <p className="mt-0.5 max-w-md text-xs text-muted-foreground">{t("description")}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:shrink-0 sm:flex-nowrap">
          <div role="group" aria-label={t("periodLabel")} className="inline-flex rounded-lg bg-muted p-[3px] text-sm font-medium">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={period === p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "rounded-md px-3 py-1 whitespace-nowrap transition-colors",
                  period === p ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(`period.m${p}`)}
              </button>
            ))}
          </div>
          <Button nativeButton={false} render={<a href={href} />} size="sm">
            <Download className="size-4" />
            {t("download")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
