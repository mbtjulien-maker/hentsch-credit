"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskBadge } from "@/components/dashboard/investment-panel";
import type { FixedTermPlan } from "@/lib/api";

// Plans à échéance fixe (cf. §2H CLAUDE.md entrée #29) — un DEUXIÈME mode de placement,
// purement illustratif : à la différence des paniers ci-dessus (dépôt/retrait réels), ces
// cartes n'ont volontairement aucun bouton de dépôt — aucun produit à échéance fixe n'est
// réellement proposé au dépôt à ce stade (cf. GET /investment/fixed-term-plans, jamais de
// position persistée). Le rendement affiché est recalculé côté backend à partir des
// rendements de dividende réels des composants du plan, jamais le chiffre initialement
// envisagé (jusqu'à 25 %/an) — la mention "illustratif" ci-dessous n'est pas cosmétique.
function horizonLabel(months: number, t: ReturnType<typeof useTranslations>): string {
  return months === 12 ? t("fixedTermPlans.horizon.year") : t("fixedTermPlans.horizon.months", { months });
}

function PlanCard({ plan }: { plan: FixedTermPlan }) {
  const t = useTranslations("Dashboard.investment");
  const latestSignal = plan.latestSignalPct != null ? Number(plan.latestSignalPct) : null;

  return (
    <Card>
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
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {t("fixedTermPlans.periodReturn", { horizon: horizonLabel(plan.horizonMonths, t) })}
          </span>
          <span className="font-semibold tabular-nums">{plan.periodPct}%</span>
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
      </CardContent>
    </Card>
  );
}

export function FixedTermPlansSection({ plans }: { plans: FixedTermPlan[] | null }) {
  const t = useTranslations("Dashboard.investment");

  if (!plans || plans.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">{t("fixedTermPlans.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("fixedTermPlans.intro")}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>
    </div>
  );
}
