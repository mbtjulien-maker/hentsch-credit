"use client";

import { useId, useMemo, useState } from "react";
import { Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatUsd } from "@/lib/format";
import { computeAmortizedPayment } from "@/lib/amortization";

// Durée contractuelle par défaut d'une position de crédit — DEFAULT_TERM_MONTHS côté
// backend (cf. backend/src/credit/rate.constants.ts). Purement informatif ici (aucune
// pénalité n'est appliquée à l'échéance côté moteur actuellement) : sert seulement à
// signaler quand la projection dépasse la durée contractuelle.
const CONTRACTUAL_TERM_MONTHS = 12;
const MAX_PROJECTION_MONTHS = 240; // 20 ans — garde-fou contre une boucle infinie/absurde.

type MonthRow = { month: number; contribution: number; interest: number; remaining: number };

// Le remboursement se fait par deux canaux (règle métier) : (1) les profits générés par
// les actifs mis en gage (rendement estimé, non garanti) et (2) des apports externes —
// dépôts ou virements. Simulation mensuelle en intérêt simple (cohérente avec le calcul
// réel côté backend, cf. CreditEngineService.calculateAccruedInterest : intérêt = tranche
// remboursée × taux annuel × jours écoulés / 365), agrégée au mois plutôt qu'au jour ici
// pour rester lisible. Purement illustratif — jamais présenté comme un engagement.
function simulateRepayment({
  creditIssued,
  collateralAmount,
  annualInterestRatePct,
  annualYieldPct,
  monthlyExternalRepayment,
}: {
  creditIssued: number;
  collateralAmount: number;
  annualInterestRatePct: number;
  annualYieldPct: number;
  monthlyExternalRepayment: number;
}) {
  const monthlyYield = (collateralAmount * annualYieldPct) / 100 / 12;
  const monthlyContribution = monthlyYield + monthlyExternalRepayment;

  if (monthlyContribution <= 0 || creditIssued <= 0) {
    return { monthlyYield, monthlyContribution, rows: [] as MonthRow[], totalInterest: 0, monthsToRepay: null as number | null };
  }

  let remaining = creditIssued;
  let totalInterest = 0;
  const rows: MonthRow[] = [];
  let month = 0;

  while (remaining > 0.01 && month < MAX_PROJECTION_MONTHS) {
    month += 1;
    const contribution = Math.min(monthlyContribution, remaining);
    const daysElapsed = month * 30;
    const interest = (contribution * annualInterestRatePct * daysElapsed) / 100 / 365;
    totalInterest += interest;
    remaining -= contribution;
    rows.push({ month, contribution, interest, remaining });
  }

  return {
    monthlyYield,
    monthlyContribution,
    rows,
    totalInterest,
    monthsToRepay: remaining <= 0.01 ? month : null,
  };
}

export function RepaymentProjection({
  creditIssued,
  collateralAmount,
  annualInterestRatePct,
  estimatedYieldPct,
}: {
  creditIssued: number;
  collateralAmount: number;
  annualInterestRatePct: number | null;
  // Calculé par le calculateur (cf. useEstimatedYield, moyenne réelle sur 12 mois des
  // actifs générateurs de rendement) — c'est l'algorithme qui détermine cette hypothèse,
  // jamais le client : affiché en lecture seule, pas un champ de formulaire (cf. décision
  // produit du 30 août 2026, revenant sur le champ modifiable introduit précédemment).
  // L'apport externe, lui, reste un vrai choix du client (cf. externalInputId plus bas) :
  // suggéré automatiquement (cf. suggestedExternal) pour rester dans la durée
  // contractuelle, mais librement ajustable.
  estimatedYieldPct: number | null;
}) {
  const externalInputId = useId();
  const yieldPct = estimatedYieldPct !== null ? estimatedYieldPct.toFixed(1) : "0";

  // Apport externe suggéré automatiquement : le complément nécessaire, au-delà du
  // rendement estimé, pour rembourser dans la durée contractuelle standard (12 mois) —
  // plutôt que de laisser 0 par défaut et surprendre le client avec une durée de
  // plusieurs années dès l'ouverture du simulateur. Reste modifiable ci-dessous (à la
  // baisse pour explorer un remboursement plus lent, purement par le rendement).
  const monthlyYieldEstimate = (collateralAmount * (Number(yieldPct) || 0)) / 100 / 12;
  const requiredMonthlyTotal = computeAmortizedPayment(
    creditIssued,
    annualInterestRatePct ?? 0,
    CONTRACTUAL_TERM_MONTHS,
  );
  const suggestedExternal = Math.max(requiredMonthlyTotal - monthlyYieldEstimate, 0);
  const [manualExternal, setManualExternal] = useState<string | null>(null);
  const monthlyExternal = manualExternal ?? suggestedExternal.toFixed(2);

  const result = useMemo(
    () =>
      simulateRepayment({
        creditIssued,
        collateralAmount,
        annualInterestRatePct: annualInterestRatePct ?? 0,
        annualYieldPct: Math.max(Number(yieldPct) || 0, 0),
        monthlyExternalRepayment: Math.max(Number(monthlyExternal) || 0, 0),
      }),
    [creditIssued, collateralAmount, annualInterestRatePct, yieldPct, monthlyExternal],
  );

  // Points de contrôle affichés dans le mini-tableau : jusqu'à 5, répartis sur la durée
  // projetée, plus toujours le dernier mois (remboursement complet).
  const checkpoints = useMemo(() => {
    if (result.rows.length === 0) return [];
    const last = result.rows[result.rows.length - 1];
    if (result.rows.length <= 5) return result.rows;
    const step = Math.ceil(result.rows.length / 4);
    const picked = result.rows.filter((_, i) => i % step === 0);
    return picked[picked.length - 1] === last ? picked : [...picked, last];
  }, [result.rows]);

  if (creditIssued <= 0) return null;

  return (
    <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-3.5">
      <div className="flex items-center gap-1.5">
        <h4 className="text-sm font-medium">Projection de remboursement à long terme</h4>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Remboursement combiné : rendement moyen réel des actifs générateurs de rendement
        (calculé automatiquement) + apport externe suggéré pour rester dans la durée
        contractuelle (celui-ci modifiable). Estimation non garantie, à titre indicatif
        uniquement.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label className="text-xs">Rendement annuel estimé (%)</Label>
          <div className="flex h-8 items-center rounded-md border border-input bg-background px-3 text-sm font-medium tabular-nums">
            {yieldPct}%
          </div>
          <p className="text-[11px] text-muted-foreground">
            {estimatedYieldPct !== null
              ? "Calculé automatiquement à partir de la performance réelle sur 12 mois."
              : "Calcul en cours…"}
          </p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={externalInputId} className="text-xs">
            Remboursement externe mensuel ($)
          </Label>
          <Input
            id={externalInputId}
            inputMode="decimal"
            placeholder="0"
            value={monthlyExternal}
            onChange={(e) => setManualExternal(e.target.value)}
            className="h-8 text-sm"
          />
          <p className="text-[11px] text-muted-foreground">
            Suggéré pour rembourser en {CONTRACTUAL_TERM_MONTHS} mois, modifiable (réduisez-le
            pour explorer un remboursement plus lent, porté par le seul rendement).
          </p>
        </div>
      </div>

      {result.monthlyContribution <= 0 ? (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          Renseignez un rendement estimé ou un remboursement mensuel pour projeter une
          durée de remboursement.
        </p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-md bg-background px-3 py-2">
              <div className="text-[11px] text-muted-foreground">Durée estimée</div>
              <div className="font-semibold tabular-nums">
                {result.monthsToRepay
                  ? `${result.monthsToRepay} mois${result.monthsToRepay >= 12 ? ` (≈ ${(result.monthsToRepay / 12).toFixed(1)} ans)` : ""}`
                  : `> ${MAX_PROJECTION_MONTHS} mois`}
              </div>
            </div>
            <div className="rounded-md bg-background px-3 py-2">
              <div className="text-[11px] text-muted-foreground">Intérêts totaux estimés</div>
              <div className="font-semibold tabular-nums">{formatUsd(result.totalInterest)}</div>
            </div>
          </div>

          {result.monthsToRepay && result.monthsToRepay > CONTRACTUAL_TERM_MONTHS && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-700 dark:text-primary">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              Cette projection dépasse la durée contractuelle habituelle de{" "}
              {CONTRACTUAL_TERM_MONTHS} mois. Augmentez le rendement estimé ou le
              remboursement mensuel pour rester dans les temps.
            </p>
          )}

          {checkpoints.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="pb-1 font-normal">Mois</th>
                    <th className="pb-1 text-right font-normal">Versement</th>
                    <th className="pb-1 text-right font-normal">Solde restant</th>
                  </tr>
                </thead>
                <tbody>
                  {checkpoints.map((row) => (
                    <tr key={row.month} className="border-t border-border/60">
                      <td className="py-1 tabular-nums">{row.month}</td>
                      <td className="py-1 text-right tabular-nums text-muted-foreground">
                        {formatUsd(row.contribution)}
                      </td>
                      <td className="py-1 text-right font-medium tabular-nums">
                        {formatUsd(row.remaining)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
