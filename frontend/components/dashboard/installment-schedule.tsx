"use client";

import { useId, useMemo, useState } from "react";
import { Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatUsd } from "@/lib/format";
import { computeAmortizedPayment } from "@/lib/amortization";
import { CREDIT_RATIO, YIELD_REPAYMENT_CAP_PCT } from "@/components/dashboard/credit-simulator";

const DURATION_OPTIONS = [6, 12, 24, 36] as const;

const monthYearFormatter = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

// Premier versement — dès le mois suivant l'émission du crédit (convention standard d'un
// prêt à échéances fixes : le décaissement a lieu au verrouillage du gage, le premier
// remboursement un mois plus tard). Calculé ici plutôt que laissé à deviner par le
// client, comme le reste de cette simulation.
function firstPaymentLabel(): string {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return monthYearFormatter.format(date);
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
}: {
  creditIssued: number;
  annualInterestRatePct: number | null;
  // Calculé par le calculateur (cf. useEstimatedYield, moyenne réelle sur 12 mois des
  // actifs générateurs de rendement) — pré-rempli automatiquement, jamais laissé à zéro
  // en attendant que le client devine un chiffre. Reste modifiable ci-dessous.
  estimatedYieldPct: number | null;
}) {
  const yieldInputId = useId();
  const [durationMonths, setDurationMonths] = useState<(typeof DURATION_OPTIONS)[number]>(12);
  // null = pas encore modifié par le client : affiche alors la valeur calculée
  // automatiquement (cf. estimatedYieldPct), dérivée directement au rendu plutôt que
  // synchronisée via un effet.
  const [manualYieldPct, setManualYieldPct] = useState<string | null>(null);
  const yieldPct = manualYieldPct ?? (estimatedYieldPct !== null ? estimatedYieldPct.toFixed(1) : "0");

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
      <h4 className="text-sm font-medium">Simulation à échéances fixes</h4>
      <p className="mt-1 text-xs text-muted-foreground">
        Calculée automatiquement à partir du rendement réel estimé : intérêts générés, mensualité
        à votre charge et date du premier remboursement. Le rendement réduit la mensualité,
        plafonné à {YIELD_REPAYMENT_CAP_PCT}% (le même plafond que le remboursement automatique
        réel) ; ajustable ci-dessous si vous visez une hypothèse différente.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label className="text-xs">Durée</Label>
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
                {months} mois
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={yieldInputId} className="text-xs">
            Rendement annuel estimé (%)
          </Label>
          <Input
            id={yieldInputId}
            inputMode="decimal"
            placeholder="0"
            value={yieldPct}
            onChange={(e) => setManualYieldPct(e.target.value)}
            className="h-8 text-sm"
          />
          <p className="text-[11px] text-muted-foreground">
            {estimatedYieldPct !== null
              ? "Calculé à partir de la performance réelle sur 12 mois, modifiable."
              : "Calcul en cours…"}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div className="rounded-md bg-background px-3 py-2">
          <div className="text-[11px] text-muted-foreground">Mensualité brute</div>
          <div className="font-semibold tabular-nums">{formatUsd(schedule.grossMonthlyPayment)}</div>
        </div>
        <div className="rounded-md bg-background px-3 py-2">
          <div className="text-[11px] text-muted-foreground">Réduction estimée</div>
          <div className="font-semibold tabular-nums text-emerald-600 dark:text-primary">
            − {formatUsd(schedule.yieldReductionUsd)}
          </div>
        </div>
        <div className="rounded-md bg-background px-3 py-2">
          <div className="text-[11px] text-muted-foreground">Mensualité nette estimée</div>
          <div className="font-semibold tabular-nums">{formatUsd(schedule.netMonthlyPayment)}</div>
        </div>
        <div className="rounded-md bg-background px-3 py-2">
          <div className="text-[11px] text-muted-foreground">1er remboursement</div>
          <div className="font-semibold tabular-nums capitalize">{firstPaymentLabel()}</div>
        </div>
      </div>

      <p className="mt-2.5 flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        Intérêts totaux sur {durationMonths} mois (avant réduction) :{" "}
        {formatUsd(schedule.totalInterest)}. Estimation non garantie, à titre indicatif
        uniquement : le remboursement réel reste flexible (cf. simulation ci-dessus).
      </p>
      <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        Cette simulation suppose que vous utilisez l&apos;intégralité du crédit dès son émission
        (scénario prudent, servant de base au calcul ci-dessus). En pratique, tant que vous
        n&apos;utilisez pas votre crédit (carte), aucun remboursement ni intérêt n&apos;est dû :
        c&apos;est une ligne de crédit, pas un prêt versé en une fois.
      </p>
    </div>
  );
}
