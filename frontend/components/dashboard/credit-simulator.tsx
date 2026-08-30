"use client";

import { useId, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatAccountCurrency, formatUsd } from "@/lib/format";
import { useCountUp } from "@/lib/use-count-up";
import type { AccountCurrency, CreditRatesResponse, LedgerBalance } from "@/lib/api";

// Exporté pour rester la seule source de vérité du taux de gage côté frontend — réutilisé
// par RepaymentProjection et InstallmentSchedule (cf. credit-form.tsx) pour dériver le
// crédit simulé sans dupliquer la constante.
export const CREDIT_RATIO = 3.5;
// Miroir de YIELD_REPAYMENT_CAP_PCT côté backend (cf. rate.constants.ts) — même plafond
// que le mécanisme réel de remboursement automatique, réutilisé tel quel par
// InstallmentSchedule plutôt que d'introduire un second sens à "60%".
export const YIELD_REPAYMENT_CAP_PCT = 60;
const CURRENCIES: AccountCurrency[] = ["USD", "EUR"];

// Palette catégorielle validée (dataviz skill, slots 1–3, all-pairs CVD-safe
// dans les deux thèmes) — portée localement au composant, jamais réutilisée
// pour du texte hors des swatches/segments. Suit le même mécanisme que le
// reste de l'app (classe .dark, cf. globals.css) plutôt que prefers-color-scheme
// directement — ce composant ne s'affiche aujourd'hui que dans l'espace client
// (toujours .dark, cf. app/dashboard/layout.tsx), mais reste synchronisé si un jour
// utilisé ailleurs. Palette Dark Luxury Fintech : ivoire (disponible) / champagne
// (gage — la couleur de la valeur mise en gage) / vert (crédit accordé, seul accent
// "positif" de la palette) — plus de bleu/orange décoratifs.
const SERIES_STYLE = `
  .credit-sim { --series-available: #2a78d6; --series-locked: #eb6834; --series-credit: #1baf7a; }
  .dark .credit-sim { --series-available: #A79E8E; --series-locked: #C9A876; --series-credit: #34D399; }
`;

// Simulateur purement hypothétique : l'accès au crédit passe désormais par une demande
// (cf. CreditRequestPanel), pas par un verrouillage instantané d'un solde déjà présent —
// le montant simulé n'est donc plus plafonné par `balance.availableBalance` et reste
// utilisable à zéro. Le client explore ce qu'il obtiendrait AVANT de soumettre sa demande.
export function CreditSimulator({
  balance,
  amount,
  onAmountChange,
  currency,
  onCurrencyChange,
  rates,
}: {
  balance: LedgerBalance;
  amount: string;
  onAmountChange: (value: string) => void;
  currency: AccountCurrency;
  onCurrencyChange: (currency: AccountCurrency) => void;
  rates: CreditRatesResponse | null;
}) {
  const inputId = useId();
  const availableBalance = Number(balance.availableBalance);
  const lockedCollateral = Number(balance.lockedCollateral);
  const grantedCredit = Number(balance.grantedCredit);
  const usedCredit = Number(balance.usedCredit);

  const simulatedAmount = Math.max(Number(amount) || 0, 0);

  const simulated = useMemo(() => {
    const creditIssued = simulatedAmount * CREDIT_RATIO;
    const newAvailable = availableBalance - simulatedAmount;
    const newLocked = lockedCollateral + simulatedAmount;
    const newGrantedCredit = grantedCredit + creditIssued;
    const grossPower = newAvailable + newLocked + newGrantedCredit;
    const totalPurchasingPower = grossPower - usedCredit;
    const currentTotalPurchasingPower =
      availableBalance + lockedCollateral + grantedCredit - usedCredit;
    return {
      creditIssued,
      newAvailable,
      newLocked,
      newGrantedCredit,
      grossPower,
      totalPurchasingPower,
      delta: totalPurchasingPower - currentTotalPurchasingPower,
    };
  }, [availableBalance, lockedCollateral, grantedCredit, usedCredit, simulatedAmount]);

  const rateInfo = rates?.rates[currency] ?? null;
  const eurPerUsd = rates?.eurPerUsd ? Number(rates.eurPerUsd) : null;
  // Le ledger reste en USD ; en EUR on convertit au cours en direct pour montrer au
  // client ce qu'il verra réellement facturé dans sa devise (miroir de
  // `creditIssuedInCurrency` calculé côté backend au verrouillage). Si le cours est
  // indisponible, on retombe sur l'affichage USD plutôt que de bloquer le simulateur.
  const canConvertToEur = currency === "EUR" && eurPerUsd !== null;
  const fxRateMissing = currency === "EUR" && eurPerUsd === null;
  const displayCurrency: "USD" | "EUR" = canConvertToEur ? "EUR" : "USD";
  const toDisplay = (usdValue: number) =>
    canConvertToEur ? usdValue * eurPerUsd : usdValue;
  const formatCredit = (usdValue: number) =>
    formatAccountCurrency(toDisplay(usdValue), displayCurrency);

  const originationFee = rateInfo
    ? (simulated.creditIssued * Number(rateInfo.originationFeePct)) / 100
    : null;

  // Le montant simulé n'est plus plafonné par le solde disponible (demande hypothétique) :
  // au-delà de ce solde, "disponible restant" n'a plus de sens négatif — on l'affiche à
  // zéro et on signale plutôt ce qu'il reste à déposer pour honorer ce montant.
  const depositShortfall = Math.max(simulatedAmount - availableBalance, 0);

  // Défilement fluide des chiffres à chaque changement du montant simulé —
  // requestAnimationFrame natif (cf. useCountUp), pas de dépendance JS d'animation.
  const displayedCreditIssued = useCountUp(simulated.creditIssued);
  const displayedAvailable = useCountUp(Math.max(simulated.newAvailable, 0));
  const displayedLocked = useCountUp(simulated.newLocked);
  const displayedGrantedTotal = useCountUp(simulated.newGrantedCredit);

  const segments = [
    {
      key: "available",
      label: "Disponible restant",
      value: Math.max(simulated.newAvailable, 0),
      displayValue: displayedAvailable,
      color: "var(--series-available)",
    },
    {
      key: "locked",
      label: "Gage envisagé",
      value: simulated.newLocked,
      displayValue: displayedLocked,
      color: "var(--series-locked)",
    },
    {
      key: "credit",
      label: "Crédit accordé (total)",
      value: simulated.newGrantedCredit,
      displayValue: displayedGrantedTotal,
      color: "var(--series-credit)",
    },
  ] as const;

  return (
    <div className="credit-sim flex flex-col gap-4 rounded-lg border bg-muted/30 p-4">
      <style>{SERIES_STYLE}</style>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={inputId} className="text-sm font-medium">
          Montant de gage envisagé (USD)
        </Label>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border p-0.5">
            {CURRENCIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onCurrencyChange(c)}
                className={cn(
                  "rounded-[5px] px-2 py-0.5 text-xs font-medium transition-colors",
                  currency === c
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            Solde actuel {formatUsd(availableBalance)}
          </span>
        </div>
      </div>

      <Input
        id={inputId}
        inputMode="decimal"
        placeholder="0.00"
        value={amount}
        onChange={(e) => onAmountChange(e.target.value)}
        className="tabular-nums"
        aria-label="Montant simulé"
      />

      {/* Réponse directe et immédiate à "combien de crédit pour ce montant ?" —
          le taux du gage n'est volontairement pas affiché sur le dashboard (décision
          produit), seul le résultat chiffré est montré. Pas le total cumulé (détaillé
          dans la barre plus bas). */}
      <div className="flex items-center justify-between rounded-lg bg-[color-mix(in_srgb,var(--series-credit)_12%,transparent)] px-3 py-2.5">
        <span className="text-sm text-muted-foreground">
          Crédit accordé pour ce montant
        </span>
        <span
          className="text-lg font-semibold tabular-nums"
          style={{ color: "var(--series-credit)" }}
        >
          {formatCredit(displayedCreditIssued)}
        </span>
      </div>

      {rateInfo && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-dashed px-3 py-2.5 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Taux d&apos;intérêt annuel ({currency})</span>
            <span className="font-medium tabular-nums text-foreground">
              {rateInfo.interestRatePct}%/an
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Frais d&apos;origination (prélevés à l&apos;émission)</span>
            <span className="font-medium tabular-nums text-foreground">
              {originationFee !== null ? formatCredit(originationFee) : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Frais de garde du collatéral</span>
            <span className="font-medium tabular-nums text-foreground">
              {rateInfo.custodyFeePct}%/an
            </span>
          </div>
          {fxRateMissing && (
            <p className="pt-1 text-[11px] italic">
              Cours EUR/USD indisponible pour l&apos;instant, montants affichés en
              USD.
            </p>
          )}
        </div>
      )}

      {/* Barre de composition — part-à-tout du pouvoir d'achat brut (avant déduction du
          crédit utilisé). Remplissage plein par segment, sans dégradé ni halo — sobriété
          "private banking" plutôt qu'un effet énergique/néon. */}
      <div>
        <div className="flex h-6 w-full gap-0.5 overflow-hidden rounded-full bg-background">
            {segments.map((seg, i) => {
              // Dénominateur basé sur les valeurs affichées (donc déjà planchées à zéro) :
              // les pourcentages restent cohérents même quand le montant simulé dépasse le
              // solde disponible (cf. depositShortfall ci-dessus).
              const displayGrossPower = segments.reduce((sum, s) => sum + s.value, 0);
              const pct = displayGrossPower > 0 ? (seg.value / displayGrossPower) * 100 : 0;
              return (
                <div
                  key={seg.key}
                  title={`${seg.label} : ${formatUsd(seg.value)}`}
                  className={`h-full transition-all duration-500 ease-in-out ${i === 0 ? "rounded-l-full" : ""} ${i === segments.length - 1 ? "rounded-r-full" : ""}`}
                  style={{
                    width: `${pct}%`,
                    minWidth: pct > 0 ? "2px" : 0,
                    backgroundColor: seg.color,
                  }}
                />
              );
            })}
        </div>

        <div className="mt-2.5 grid grid-cols-3 gap-2">
          {segments.map((seg) => (
            <div key={seg.key} className="flex items-start gap-1.5">
              <span
                className="mt-1 size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: seg.color }}
                aria-hidden
              />
              <div className="min-w-0">
                <div className="truncate text-[11px] leading-tight text-muted-foreground">
                  {seg.label}
                </div>
                <div className="text-sm font-medium tabular-nums leading-tight">
                  {formatUsd(seg.displayValue)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {depositShortfall > 0 && (
          <p className="mt-2.5 text-xs text-muted-foreground">
            Il vous manque {formatUsd(depositShortfall)} par rapport à votre solde actuel
            pour atteindre ce montant, à déposer une fois la demande approuvée.
          </p>
        )}
      </div>

      {usedCredit > 0 && (
        <div className="flex items-center justify-between border-t pt-3 text-sm text-muted-foreground">
          <span>− Crédit utilisé</span>
          <span className="tabular-nums">{formatUsd(usedCredit)}</span>
        </div>
      )}

      <div className="flex items-center justify-between border-t pt-3">
        <span className="text-sm font-medium">
          {simulatedAmount > 0 ? "Pouvoir d'achat simulé" : "Pouvoir d'achat actuel"}
        </span>
        <div className="flex items-baseline gap-2">
          {simulated.delta > 0 && (
            <span className="text-xs font-medium text-[#006300] dark:text-[#34D399]">
              +{formatUsd(simulated.delta)}
            </span>
          )}
          <span className="text-lg font-semibold tabular-nums">
            {formatUsd(simulated.totalPurchasingPower)}
          </span>
        </div>
      </div>
      {simulatedAmount === 0 && (
        <p className="-mt-2 text-xs text-muted-foreground">
          Aucun montant simulé pour l&apos;instant : ceci est votre pouvoir d&apos;achat
          actuel (disponible + gage + crédit accordé − crédit utilisé). Tapez un montant
          ci-dessus, même sans solde disponible, pour voir ce qu&apos;une demande de
          crédit vous permettrait d&apos;obtenir.
        </p>
      )}
    </div>
  );
}
