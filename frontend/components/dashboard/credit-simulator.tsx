"use client";

import { useId, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatAccountCurrency, formatPercent, formatUsd } from "@/lib/format";
import { useCountUp } from "@/lib/use-count-up";
import type { AcceptedCurrency, AccountCurrency, CreditRatesResponse, LedgerBalance } from "@/lib/api";
import type { AssetYieldEstimate } from "@/lib/use-estimated-yield";

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
  const t = useTranslations("Dashboard.creditSimulator");
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
      label: t("segments.available"),
      value: Math.max(simulated.newAvailable, 0),
      displayValue: displayedAvailable,
      color: "var(--series-available)",
    },
    {
      key: "locked",
      label: t("segments.locked"),
      value: simulated.newLocked,
      displayValue: displayedLocked,
      color: "var(--series-locked)",
    },
    {
      key: "credit",
      label: t("segments.credit"),
      value: simulated.newGrantedCredit,
      displayValue: displayedGrantedTotal,
      color: "var(--series-credit)",
    },
  ];

  return (
    <div className="credit-sim flex flex-col gap-4 rounded-lg border bg-muted/30 p-4">
      <style>{SERIES_STYLE}</style>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={inputId} className="text-sm font-medium">
          {t("amountLabel")}
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
            {t("currentBalance", { amount: formatUsd(availableBalance) })}
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
        aria-label={t("amountAriaLabel")}
      />

      {/* Réponse directe et immédiate à "combien de crédit pour ce montant ?" —
          le taux du gage n'est volontairement pas affiché sur le dashboard (décision
          produit), seul le résultat chiffré est montré. Pas le total cumulé (détaillé
          dans la barre plus bas). */}
      <div className="flex items-center justify-between rounded-lg bg-[color-mix(in_srgb,var(--series-credit)_12%,transparent)] px-3 py-2.5">
        <span className="text-sm text-muted-foreground">{t("creditForAmount")}</span>
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
            <span>{t("annualInterestRate", { currency })}</span>
            <span className="font-medium tabular-nums text-foreground">
              {t("perYear", { rate: rateInfo.interestRatePct })}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>{t("originationFee")}</span>
            <span className="font-medium tabular-nums text-foreground">
              {originationFee !== null ? formatCredit(originationFee) : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>{t("custodyFee")}</span>
            <span className="font-medium tabular-nums text-foreground">
              {t("perYear", { rate: rateInfo.custodyFeePct })}
            </span>
          </div>
          {fxRateMissing && <p className="pt-1 text-[11px] italic">{t("fxRateMissing")}</p>}
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
            {t("depositShortfall", { amount: formatUsd(depositShortfall) })}
          </p>
        )}
      </div>

      {usedCredit > 0 && (
        <div className="flex items-center justify-between border-t pt-3 text-sm text-muted-foreground">
          <span>− {t("usedCredit")}</span>
          <span className="tabular-nums">{formatUsd(usedCredit)}</span>
        </div>
      )}

      <div className="flex items-center justify-between border-t pt-3">
        <span className="text-sm font-medium">
          {simulatedAmount > 0 ? t("simulatedPurchasingPower") : t("currentPurchasingPower")}
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
        <p className="-mt-2 text-xs text-muted-foreground">{t("noAmountSimulatedNote")}</p>
      )}
    </div>
  );
}

// Sélecteur de l'actif de gage utilisé pour l'estimation de rendement (RepaymentProjection
// / InstallmentSchedule) — distinct du choix USD/EUR ci-dessus (devise de règlement du
// crédit, pas l'actif physiquement déposé). L'actif réel n'est choisi qu'au moment du
// dépôt (cf. wallet-actions.tsx), après l'approbation de la demande ; ce sélecteur ne sert
// qu'à affiner la simulation en amont, sur la base de la performance réelle sur 12 mois de
// CET actif précis plutôt qu'une moyenne opaque des 8 actifs éligibles (cf.
// useEstimatedYield). Chaque option affiche son propre pourcentage : c'est exactement le
// "rendement calculé sur l'actif mis en gage" qui manquait — plus une boîte noire.
export function YieldAssetPicker({
  perAsset,
  value,
  onChange,
}: {
  perAsset: AssetYieldEstimate[];
  value: AcceptedCurrency | null;
  onChange: (value: AcceptedCurrency | null) => void;
}) {
  const t = useTranslations("Dashboard.creditSimulator");

  function pillClass(active: boolean, disabled: boolean) {
    return cn(
      "rounded-md border px-2.5 py-1 text-xs font-medium tabular-nums transition-colors",
      disabled
        ? "cursor-not-allowed border-border/60 text-muted-foreground/50"
        : active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:text-foreground",
    );
  }

  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{t("yieldAssetLabel")}</Label>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={() => onChange(null)} className={pillClass(value === null, false)}>
          {t("yieldAssetBlended")}
        </button>
        {perAsset.map((asset) => (
          <button
            key={asset.currency}
            type="button"
            onClick={() => onChange(asset.currency)}
            disabled={asset.changePct === null}
            className={pillClass(value === asset.currency, asset.changePct === null)}
          >
            {asset.currency} {formatPercent(asset.changePct)}
          </button>
        ))}
      </div>
    </div>
  );
}
