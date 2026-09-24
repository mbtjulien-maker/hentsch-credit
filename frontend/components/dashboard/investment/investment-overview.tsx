"use client";

import { useMemo, useState } from "react";
import { ArrowDownToLine, ArrowRight, Layers, Lock, TrendingDown, TrendingUp, Unlock, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvestment } from "@/components/dashboard/investment/investment-context";
import {
  ChartCard,
  MonthlyYieldChart,
  PortfolioValueChart,
  toPoints,
} from "@/components/dashboard/investment/investment-charts";
import { formatPercent, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

const PERIODS = [3, 6, 12] as const;
type Period = (typeof PERIODS)[number];

// Signe + icône + couleur : la variation ne dépend jamais de la couleur seule.
function Delta({ value, suffix }: { value: number; suffix?: string }) {
  const up = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-sm font-medium tabular-nums",
        up ? "text-[color:var(--spark-good)]" : "text-[color:var(--spark-critical)]",
      )}
    >
      {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
      {`${up ? "+" : ""}${formatUsd(value)}`}
      {suffix && <span className="font-normal text-muted-foreground">{suffix}</span>}
    </span>
  );
}

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  action,
}: {
  label: string;
  value: string;
  hint?: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex h-full flex-col justify-between gap-3 py-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <Icon className="size-4 text-muted-foreground/70" />
        </div>
        <div>
          <p className="font-heading text-2xl leading-none font-semibold xl:text-3xl">{value}</p>
          {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {action}
      </CardContent>
    </Card>
  );
}

// Vue d'ensemble — la page d'entrée de l'espace : un chiffre phare (valeur du portefeuille),
// le solde disponible et le capital investi, un filtre de période UNIQUE au-dessus des
// graphiques qu'il pilote (les deux se recalent sur la même tranche), puis les placements
// en cours. Rien n'est fabriqué : les courbes viennent du journal réel des transactions.
export function InvestmentOverview() {
  const t = useTranslations("Dashboard.investmentSpace.overview");
  const tInvest = useTranslations("Dashboard.investment");
  const inv = useInvestment();
  const [period, setPeriod] = useState<Period>(12);

  const allPoints = useMemo(() => (inv.performance ? toPoints(inv.performance.months) : []), [inv.performance]);
  const points = useMemo(() => allPoints.slice(-period), [allPoints, period]);

  const summary = useMemo(() => {
    if (allPoints.length === 0) return null;
    const yieldSum = points.reduce((sum, p) => sum + p.yieldUsd, 0);
    const deposits = points.reduce((sum, p) => sum + p.deposits, 0);
    // Sur 12 mois, la référence est celle du backend (valeur d'ouverture incluse) ; sur
    // une tranche plus courte, la valeur du portefeuille juste avant la tranche.
    let returnPct: number | null;
    if (period === 12) {
      returnPct = inv.performance?.totals.returnPct ?? null;
    } else {
      const startValue = allPoints[allPoints.length - period - 1]?.value ?? 0;
      const committed = startValue + deposits;
      returnPct = committed > 0 ? (yieldSum / committed) * 100 : null;
    }
    return { yieldSum, returnPct };
  }, [allPoints, points, period, inv.performance]);

  const cumulativePct = inv.investedCapital > 0 ? (inv.accruedYield / inv.investedCapital) * 100 : null;
  const activeCount =
    inv.activePositions.size + inv.fixedTermPositions.filter((p) => p.status === "ACTIVE").length;

  return (
    <div className="flex flex-col gap-6">
      {/* Chiffres clés */}
      <section
        aria-label={t("kpiAria")}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]"
      >
        <Card className="sm:col-span-2 lg:col-span-1">
          <CardContent className="flex h-full flex-col justify-between gap-4 py-1">
            <p className="text-xs font-medium text-muted-foreground">{t("heroLabel")}</p>
            <div>
              {/* Chiffre phare : proportionnel (pas de tabular-nums), même famille que le reste. */}
              <p className="font-heading text-5xl leading-none font-semibold tracking-tight">
                {formatUsd(inv.portfolioValue)}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                <Delta value={inv.accruedYield} suffix={t("cumulativeYield")} />
                {cumulativePct !== null && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatPercent(cumulativePct)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button nativeButton={false} render={<Link href="/dashboard/investissement/produits" />} size="sm">
                <Layers className="size-4" />
                {t("ctaInvest")}
              </Button>
              <Button nativeButton={false} render={<Link href="/dashboard/investissement/approvisionner" />} size="sm" variant="outline">
                <ArrowDownToLine className="size-4" />
                {t("ctaFund")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <StatTile
          label={t("walletLabel")}
          value={inv.walletBalance != null ? formatUsd(inv.walletBalance) : "—"}
          hint={t("walletHint")}
          icon={Wallet}
        />
        <StatTile
          label={t("investedLabel")}
          value={formatUsd(inv.investedCapital)}
          hint={t("investedHint", { count: activeCount })}
          icon={Layers}
        />
      </section>

      {/* Filtre de période : une seule rangée, au-dessus de ce qu'elle pilote */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">{t("periodLabel")}</span>
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
        </div>
        {summary && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="text-muted-foreground">{t("periodYield")}</span>
            <Delta value={summary.yieldSum} />
            {summary.returnPct !== null && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {`${formatPercent(summary.returnPct)} · ${t("periodReturnHint")}`}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Graphiques — deux, jamais un double axe */}
      {!inv.performance ? (
        <div className="grid gap-4">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      ) : (
        <div className="grid gap-4">
          <ChartCard title={t("valueTitle")} description={t("valueDescription")} points={points}>
            <PortfolioValueChart points={points} />
          </ChartCard>
          <ChartCard title={t("yieldTitle")} description={t("yieldDescription")} points={points}>
            <MonthlyYieldChart points={points} />
          </ChartCard>
        </div>
      )}

      {/* Aperçu des placements en cours */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">{t("placementsTitle")}</CardTitle>
          <Button nativeButton={false} render={<Link href="/dashboard/investissement/placements" />} variant="ghost" size="sm">
            {t("placementsAll")}
            <ArrowRight className="size-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {activeCount === 0 ? (
            <p className="py-3 text-center text-sm text-muted-foreground">{t("placementsEmpty")}</p>
          ) : (
            <>
              {[...inv.activePositions.values()].map((p) => {
                const value = Number(p.principalAmount) + Number(p.accruedYield);
                return (
                  <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
                    <div className="flex items-center gap-2.5">
                      <Unlock className="size-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">{tInvest(`basket.${p.basket}.title`)}</span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{formatUsd(value)}</span>
                  </div>
                );
              })}
              {inv.fixedTermPositions
                .filter((p) => p.status === "ACTIVE")
                .map((p) => {
                  const value = Number(p.principalAmount) + Number(p.accruedYield);
                  return (
                    <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/[0.03] px-3 py-2">
                      <div className="flex items-center gap-2.5">
                        <Lock className="size-3.5 text-amber-600 dark:text-amber-400" />
                        <span className="text-sm font-medium">{tInvest(`fixedTermPlans.plan.${p.plan}.title`)}</span>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">{formatUsd(value)}</span>
                    </div>
                  );
                })}
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-xs leading-relaxed text-muted-foreground">{t("disclaimer")}</p>
    </div>
  );
}
