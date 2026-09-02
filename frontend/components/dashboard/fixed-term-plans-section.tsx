"use client";

import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { riskAccentClasses, RiskBadge } from "@/components/dashboard/investment-panel";
import { TermsAcceptance } from "@/components/dashboard/terms-acceptance";
import type { FixedTermPlan, FixedTermPosition } from "@/lib/api";
import { formatDate, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

const QUICK_FRACTIONS = [0.25, 0.5, 0.75, 1] as const;
const MIN_AMOUNT = 10;

// Plans à échéance fixe (cf. §2H CLAUDE.md entrée #30) — DEUXIÈME mode de placement,
// réellement souscriptible (contrairement à la version illustrative de l'entrée #29) mais
// **bloqué jusqu'à l'échéance dès la confirmation** : aucun retrait anticipé n'existe côté
// backend. D'où l'étape de confirmation explicite ci-dessous plutôt qu'un bouton "Placer"
// immédiat comme sur les paniers perpétuels (BasketCard) — le client doit voir la date de
// blocage avant de valider, pas la découvrir après coup.
function horizonLabel(months: number, t: ReturnType<typeof useTranslations>): string {
  return months === 12 ? t("fixedTermPlans.horizon.year") : t("fixedTermPlans.horizon.months", { months });
}

function computeMaturityPreview(horizonMonths: number): Date {
  const date = new Date();
  date.setMonth(date.getMonth() + horizonMonths);
  return date;
}

function PositionRow({ position }: { position: FixedTermPosition }) {
  const t = useTranslations("Dashboard.investment");
  const locale = useLocale();
  const principal = Number(position.principalAmount);
  const accruedYield = Number(position.accruedYield);
  const totalValue = principal + accruedYield;

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border/60 p-2.5 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-medium text-foreground">{formatUsd(totalValue)}</span>
        <Badge
          variant="outline"
          className={
            position.status === "ACTIVE"
              ? "border-amber-500/40 text-amber-600 dark:text-amber-400"
              : "border-primary/40 text-primary"
          }
        >
          {position.status === "ACTIVE" ? t("fixedTermPlans.positionActive") : t("fixedTermPlans.positionMatured")}
        </Badge>
      </div>
      <div className="flex items-center justify-between text-muted-foreground">
        <span>{t("principal")}</span>
        <span className="tabular-nums">{formatUsd(principal)}</span>
      </div>
      <div className="flex items-center justify-between text-muted-foreground">
        <span>{t("accruedYield")}</span>
        <span className={`tabular-nums ${accruedYield < 0 ? "text-destructive" : ""}`}>
          {formatUsd(accruedYield)}
        </span>
      </div>
      <div className="flex items-center justify-between text-muted-foreground">
        <span>{position.status === "ACTIVE" ? t("fixedTermPlans.maturityDate") : t("fixedTermPlans.maturedAt")}</span>
        <span>{formatDate(position.status === "ACTIVE" ? position.maturityDate : position.maturedAt!, locale)}</span>
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  positions,
  availableBalance,
  busy,
  onDeposit,
}: {
  plan: FixedTermPlan;
  positions: FixedTermPosition[];
  availableBalance: number | null;
  busy: boolean;
  onDeposit: (plan: FixedTermPlan["id"], amount: string) => Promise<void>;
}) {
  const t = useTranslations("Dashboard.investment");
  const locale = useLocale();
  const [amount, setAmount] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const latestSignal = plan.latestSignalPct != null ? Number(plan.latestSignalPct) : null;
  const parsedAmount = Number(amount);
  const exceedsBalance = availableBalance != null && parsedAmount > availableBalance;
  const belowMinimum = amount.trim() !== "" && parsedAmount > 0 && parsedAmount < MIN_AMOUNT;
  const isValidAmount = parsedAmount > 0 && !exceedsBalance && !belowMinimum;
  const maturityPreview = computeMaturityPreview(plan.horizonMonths);

  async function handleConfirm() {
    if (!acceptedTerms) return;
    setConfirming(false);
    await onDeposit(plan.id, amount);
    setAmount("");
    setAcceptedTerms(false);
  }

  const accent = riskAccentClasses(plan.riskScore);

  return (
    <Card className={cn("border-l-4", accent.border)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{t(`fixedTermPlans.plan.${plan.id}.title`)}</CardTitle>
          <RiskBadge level={plan.riskScore} />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-border/60 text-muted-foreground">
            {horizonLabel(plan.horizonMonths, t)}
          </Badge>
        </div>
        <CardDescription>{t(`fixedTermPlans.plan.${plan.id}.description`)}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Info capitale mise en avant — même traitement que BasketCard (retour client :
            "tout est très collé, fais varier les couleurs pour bien sortir les infos
            capitales sur chaque plan"). */}
        <div className={cn("flex items-center justify-between rounded-lg px-3 py-2.5", accent.chipBg)}>
          <span className="text-xs font-medium text-muted-foreground">
            {t("fixedTermPlans.periodReturn", { horizon: horizonLabel(plan.horizonMonths, t) })}
          </span>
          <span className={cn("text-xl font-bold tabular-nums", accent.chipText)}>{plan.periodPct}%</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("fixedTermPlans.annualizedEquivalent")}</span>
          <span className="font-medium tabular-nums text-muted-foreground">{plan.annualizedPct}%/an</span>
        </div>
        {latestSignal != null && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("latestDaily")}</span>
            <span
              className={`font-medium tabular-nums ${latestSignal < 0 ? "text-destructive" : "text-primary"}`}
            >
              {latestSignal >= 0 ? "+" : ""}
              {latestSignal.toFixed(2)}%
            </span>
          </div>
        )}

        {positions.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">{t("fixedTermPlans.yourPositions")}</p>
            {positions.map((position) => (
              <PositionRow key={position.id} position={position} />
            ))}
          </div>
        )}

        {!confirming ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder={t("amountPlaceholder")}
                value={amount}
                disabled={busy}
                onChange={(e) => setAmount(e.target.value)}
              />
              <Button type="button" disabled={busy || !isValidAmount} onClick={() => setConfirming(true)}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : t("deposit")}
              </Button>
            </div>

            {availableBalance != null && availableBalance > 0 && (
              <div className="flex gap-1.5">
                {QUICK_FRACTIONS.map((fraction) => (
                  <button
                    key={fraction}
                    type="button"
                    disabled={busy}
                    onClick={() => setAmount((availableBalance * fraction).toFixed(2))}
                    className="rounded-md border border-border/60 px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                  >
                    {fraction === 1 ? t("quickMax") : `${fraction * 100}%`}
                  </button>
                ))}
              </div>
            )}

            {exceedsBalance && <p className="text-xs text-destructive">{t("insufficientBalance")}</p>}
            {belowMinimum && <p className="text-xs text-destructive">{t("belowMinimum", { min: MIN_AMOUNT })}</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
            <div className="flex items-start gap-2">
              <Lock className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-xs leading-relaxed text-foreground">
                {t("fixedTermPlans.lockWarning", {
                  amount: formatUsd(parsedAmount),
                  date: formatDate(maturityPreview.toISOString(), locale),
                })}
              </p>
            </div>
            <TermsAcceptance variant="investment" accepted={acceptedTerms} onAcceptedChange={setAcceptedTerms} disabled={busy} />
            <div className="flex gap-2">
              <Button type="button" size="sm" disabled={busy || !acceptedTerms} onClick={() => void handleConfirm()}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : t("fixedTermPlans.confirmLock")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setConfirming(false);
                  setAcceptedTerms(false);
                }}
              >
                {t("fixedTermPlans.cancel")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function FixedTermPlansSection({
  plans,
  positions,
  availableBalance,
  busyPlan,
  onDeposit,
}: {
  plans: FixedTermPlan[] | null;
  positions: FixedTermPosition[];
  availableBalance: number | null;
  busyPlan: FixedTermPlan["id"] | null;
  onDeposit: (plan: FixedTermPlan["id"], amount: string) => Promise<void>;
}) {
  const t = useTranslations("Dashboard.investment");

  if (!plans || plans.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">{t("fixedTermPlans.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("fixedTermPlans.intro")}</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            positions={positions.filter((p) => p.plan === plan.id)}
            availableBalance={availableBalance}
            busy={busyPlan === plan.id}
            onDeposit={onDeposit}
          />
        ))}
      </div>
    </div>
  );
}
