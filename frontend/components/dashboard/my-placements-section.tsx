"use client";

import { Lock, Unlock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FixedTermPlan, FixedTermPosition, InvestmentBasket, InvestmentPosition } from "@/lib/api";
import { formatDate, formatUsd } from "@/lib/format";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysRemaining(maturityDate: string): number {
  return Math.max(0, Math.ceil((new Date(maturityDate).getTime() - Date.now()) / MS_PER_DAY));
}

// Suivi consolidé de tous les placements en cours (cf. demande client) — paniers
// perpétuels ET plans à échéance fixe, dans une seule vue, distingués par un cadenas :
// un panier reste librement retirable (aucun verrou), un plan à échéance fixe est bloqué
// jusqu'à sa date de maturité (§2H CLAUDE.md entrée #30). Le "rendement estimé" d'un plan
// reprend l'objectif indicatif déjà affiché sur sa carte (periodPct, cf.
// FixedTermPlanService.getFixedTermPlans) — jamais un nouveau chiffre inventé ici.
function BasketPlacementRow({ basket, position }: { basket: InvestmentBasket; position: InvestmentPosition }) {
  const t = useTranslations("Dashboard.investment");
  const principal = Number(position.principalAmount);
  const accruedYield = Number(position.accruedYield);
  const totalValue = principal + accruedYield;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
      <div className="flex items-center gap-2.5">
        <Unlock className="size-3.5 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground">{t(`basket.${basket}.title`)}</p>
          <p className="text-xs text-muted-foreground">{t("myPlacements.freeWithdrawal")}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold tabular-nums">{formatUsd(totalValue)}</p>
        <p className={`text-xs tabular-nums ${accruedYield < 0 ? "text-destructive" : "text-primary"}`}>
          {accruedYield >= 0 ? "+" : ""}
          {formatUsd(accruedYield)}
        </p>
      </div>
    </div>
  );
}

function FixedTermPlacementRow({ plan, position }: { plan: FixedTermPlan | undefined; position: FixedTermPosition }) {
  const t = useTranslations("Dashboard.investment");
  const locale = useLocale();
  const principal = Number(position.principalAmount);
  const accruedYield = Number(position.accruedYield);
  const totalValue = principal + accruedYield;
  const remaining = daysRemaining(position.maturityDate);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.03] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Lock className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {t(`fixedTermPlans.plan.${position.plan}.title`)}
            </p>
            {position.status === "ACTIVE" ? (
              <p className="text-xs text-muted-foreground">
                {t("myPlacements.daysRemaining", { days: remaining })}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t("fixedTermPlans.maturedAt")} {formatDate(position.maturedAt!, locale)}
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold tabular-nums">{formatUsd(totalValue)}</p>
          <p className={`text-xs tabular-nums ${accruedYield < 0 ? "text-destructive" : "text-primary"}`}>
            {accruedYield >= 0 ? "+" : ""}
            {formatUsd(accruedYield)}
          </p>
        </div>
      </div>
      {position.status === "ACTIVE" && (
        <div className="flex items-center justify-between border-t border-amber-500/20 pt-2 text-xs text-muted-foreground">
          <span>{t("myPlacements.maturityDate")}</span>
          <span>{formatDate(position.maturityDate, locale)}</span>
        </div>
      )}
      {position.status === "ACTIVE" && plan && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t("myPlacements.estimatedReturn")}</span>
          <span className="font-medium text-foreground">{plan.periodPct}%</span>
        </div>
      )}
    </div>
  );
}

export function MyPlacementsSection({
  basketPositions,
  fixedTermPositions,
  fixedTermPlans,
}: {
  basketPositions: Map<InvestmentBasket, InvestmentPosition>;
  fixedTermPositions: FixedTermPosition[];
  fixedTermPlans: FixedTermPlan[] | null;
}) {
  const t = useTranslations("Dashboard.investment");

  const activeFixedTerm = fixedTermPositions.filter((p) => p.status === "ACTIVE");
  const maturedFixedTerm = fixedTermPositions.filter((p) => p.status === "MATURED");
  const hasAny = basketPositions.size > 0 || fixedTermPositions.length > 0;

  const planById = new Map((fixedTermPlans ?? []).map((p) => [p.id, p]));

  if (!hasAny) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          {t("myPlacements.empty")}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("myPlacements.title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2.5">
          {[...basketPositions.entries()].map(([basket, position]) => (
            <BasketPlacementRow key={basket} basket={basket} position={position} />
          ))}
          {activeFixedTerm.map((position) => (
            <FixedTermPlacementRow key={position.id} plan={planById.get(position.plan)} position={position} />
          ))}
        </CardContent>
      </Card>

      {maturedFixedTerm.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("myPlacements.maturedTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            {maturedFixedTerm.map((position) => (
              <FixedTermPlacementRow key={position.id} plan={planById.get(position.plan)} position={position} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
