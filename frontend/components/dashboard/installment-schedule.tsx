"use client";

import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { formatUsd } from "@/lib/format";
import { computeAmortizedPayment } from "@/lib/amortization";
import { CREDIT_RATIO, YIELD_REPAYMENT_CAP_PCT } from "@/components/dashboard/credit-simulator";
import type { AcceptedCurrency } from "@/lib/api";

const DURATION_OPTIONS = [6, 12, 24, 36] as const;

// Premier versement — dès le mois suivant l'émission du crédit (convention standard d'un
// prêt à échéances fixes : le décaissement a lieu au verrouillage du gage, le premier
// remboursement un mois plus tard). Calculé ici plutôt que laissé à deviner par le
// client, comme le reste de cette simulation.
function firstPaymentLabel(locale: string): string {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(date);
}

// Amortissement classique (mensualité fixe) — l'alternative "échéances fixes" au
// remboursement flexible de RepaymentProjection (contribuer ce qu'on veut, voir la durée
// qui en résulte). Ici c'est l'inverse : le client choisit une durée, on calcule la
// mensualité brute constante qui rembourse creditIssued sur cette durée à
// annualInterestRatePct. Le rendement estimé du gage (même saisie libre et non garantie
// que RepaymentProjection) réduit cette mensualité, plafonné au MÊME taux que le
// mécanisme réel de remboursement automatique (YIELD_REPAYMENT_CAP_PCT, 60%) — jamais un
// second sens différent de "60%".
function computeSchedule({
  creditIssued,
  annualInterestRatePct,
  durationMonths,
  annualYieldPct,
}: {
  creditIssued: number;
  annualInterestRatePct: number;
  durationMonths: number;
  annualYieldPct: number;
}) {
  if (creditIssued <= 0 || durationMonths <= 0) {
    return { grossMonthlyPayment: 0, yieldReductionUsd: 0, netMonthlyPayment: 0, totalInterest: 0 };
  }

  const grossMonthlyPayment = computeAmortizedPayment(creditIssued, annualInterestRatePct, durationMonths);

  // Rendement mensuel estimé du gage — même hypothèse libre que RepaymentProjection,
  // appliquée ici au montant du gage plutôt qu'au crédit émis (le rendement porte sur
  // l'actif déposé, pas sur le crédit débloqué).
  const collateralAmount = creditIssued / CREDIT_RATIO;
  const monthlyYieldUsd = (collateralAmount * annualYieldPct) / 100 / 12;
  const yieldReductionUsd = Math.min(
    Math.max(monthlyYieldUsd, 0),
    grossMonthlyPayment * (YIELD_REPAYMENT_CAP_PCT / 100),
  );
  const netMonthlyPayment = Math.max(grossMonthlyPayment - yieldReductionUsd, 0);
  const totalInterest = grossMonthlyPayment * durationMonths - creditIssued;

  return { grossMonthlyPayment, yieldReductionUsd, netMonthlyPayment, totalInterest };
}

export function InstallmentSchedule({
  creditIssued,
  annualInterestRatePct,
  estimatedYieldPct,
  yieldAssetTicker,
}: {
  creditIssued: number;
  annualInterestRatePct: number | null;
  // Calculé par le calculateur (cf. useEstimatedYield) — c'est l'algorithme qui détermine
  // cette hypothèse, jamais le client : affiché en lecture seule, pas un champ de
  // formulaire (cf. décision produit du 30 août 2026, revenant sur le champ modifiable
  // introduit précédemment).
  estimatedYieldPct: number | null;
  // Actif de gage sur lequel estimatedYieldPct est basé (cf. YieldAssetPicker,
  // credit-simulator.tsx) — `null` = moyenne des 8 actifs éligibles (cf.
  // resolveEstimatedYield). Uniquement pour affichage.
  yieldAssetTicker: AcceptedCurrency | null;
}) {
  const t = useTranslations("Dashboard.installmentSchedule");
  const locale = useLocale();
  const [durationMonths, setDurationMonths] = useState<(typeof DURATION_OPTIONS)[number]>(12);
  const yieldPct = estimatedYieldPct !== null ? estimatedYieldPct.toFixed(1) : "0";

  const schedule = useMemo(
    () =>
      computeSchedule({
        creditIssued,
        annualInterestRatePct: annualInterestRatePct ?? 0,
        durationMonths,
        annualYieldPct: Math.max(Number(yieldPct) || 0, 0),
      }),
    [creditIssued, annualInterestRatePct, durationMonths, yieldPct],
  );

  if (creditIssued <= 0) return null;

  return (
    <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-3.5">
      <h4 className="text-sm font-medium">{t("title")}</h4>
      <p className="mt-1 text-xs text-muted-foreground">
        {t("intro", { cap: YIELD_REPAYMENT_CAP_PCT })}
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label className="text-xs">{t("durationLabel")}</Label>
          <div className="flex flex-wrap gap-1.5">
            {DURATION_OPTIONS.map((months) => (
              <button
                key={months}
                type="button"
                onClick={() => setDurationMonths(months)}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                  durationMonths === months
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("monthsCount", { months })}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs">{t("estimatedYieldLabel")}</Label>
          <div className="flex h-8 items-center rounded-md border border-input bg-background px-3 text-sm font-medium tabular-nums">
            {yieldPct}%
          </div>
          <p className="text-[11px] text-muted-foreground">
            {estimatedYieldPct === null
              ? t("yieldComputing")
              : yieldAssetTicker
                ? t("yieldComputedNoteAsset", { asset: yieldAssetTicker })
                : t("yieldComputedNote")}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div className="rounded-md bg-background px-3 py-2">
          <div className="text-[11px] text-muted-foreground">{t("grossPayment")}</div>
          <div className="font-semibold tabular-nums">{formatUsd(schedule.grossMonthlyPayment)}</div>
        </div>
        <div className="rounded-md bg-background px-3 py-2">
          <div className="text-[11px] text-muted-foreground">{t("estimatedReduction")}</div>
          <div className="font-semibold tabular-nums text-emerald-600 dark:text-primary">
            − {formatUsd(schedule.yieldReductionUsd)}
          </div>
        </div>
        <div className="rounded-md bg-background px-3 py-2">
          <div className="text-[11px] text-muted-foreground">{t("netPayment")}</div>
          <div className="font-semibold tabular-nums">{formatUsd(schedule.netMonthlyPayment)}</div>
        </div>
        <div className="rounded-md bg-background px-3 py-2">
          <div className="text-[11px] text-muted-foreground">{t("firstPayment")}</div>
          <div className="font-semibold tabular-nums capitalize">{firstPaymentLabel(locale)}</div>
        </div>
      </div>

      <p className="mt-2.5 flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        {t("totalInterestNote", { months: durationMonths, amount: formatUsd(schedule.totalInterest) })}
      </p>
      <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        {t("creditLineNote")}
      </p>
    </div>
  );
}
