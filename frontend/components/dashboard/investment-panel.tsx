"use client";

import { useState } from "react";
import { Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MiniSparkline } from "@/components/marketing/performance-chart";
import { TermsAcceptance } from "@/components/dashboard/terms-acceptance";
import {
  type InvestmentBasket,
  type InvestmentBasketRate,
  type InvestmentPosition,
  type RwaBasketAsset,
  type StockBasketAsset,
} from "@/lib/api";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

const QUICK_FRACTIONS = [0.25, 0.5, 0.75, 1] as const;

// Convertit une série de rendements quotidiens réels (%) en indice de croissance
// cumulée (base 100) — MiniSparkline attend une progression de valeur, pas un
// pourcentage brut par point ; c'est la même composition que
// InvestmentService.accrueYieldForPosition côté backend (jamais un point fabriqué,
// seulement recalculé pour l'affichage à partir de vrais rendements déjà persistés).
function buildReturnIndex(points: { date: string; returnPct: string }[]) {
  let index = 100;
  return points.map((p) => {
    index = index * (1 + Number(p.returnPct) / 100);
    return { t: new Date(p.date).getTime(), usd: index };
  });
}

// Classification indicative (1-5, cf. RISK_LEVEL côté backend) — jamais un score calculé
// en direct, une hypothèse de stratégie éditoriale affichée à titre informatif. Seuil
// médian élargi à 3,5 (plutôt que l'égalité stricte === 3) depuis l'introduction des
// plans à échéance fixe (§2H CLAUDE.md entrée #29), dont les scores de risque (2,5/3,5)
// ne tombent pas exactement sur les paliers entiers des 6 paniers perpétuels.
export function riskLabel(level: number, t: ReturnType<typeof useTranslations>): string {
  if (level <= 2) return t("risk.low");
  if (level <= 3.5) return t("risk.medium");
  return t("risk.high");
}

// Palette partagée par les paniers perpétuels (BasketCard) et les plans à échéance fixe
// (FixedTermPlansSection) — un liseré de couleur à gauche de chaque carte plus un fond
// distinct pour le chiffre d'objectif indicatif, pour que le niveau de risque et le
// rendement se distinguent au premier coup d'œil dans une grille de plusieurs cartes
// serrées les unes contre les autres (retour client : "tout est très collé").
export function riskAccentClasses(level: number): {
  border: string;
  chipBg: string;
  chipText: string;
} {
  if (level <= 2) {
    return { border: "border-l-primary", chipBg: "bg-primary/10", chipText: "text-primary" };
  }
  if (level <= 3.5) {
    return {
      border: "border-l-amber-500",
      chipBg: "bg-amber-500/10",
      chipText: "text-amber-600 dark:text-amber-400",
    };
  }
  return { border: "border-l-destructive", chipBg: "bg-destructive/10", chipText: "text-destructive" };
}

export function RiskBadge({ level }: { level: number }) {
  const t = useTranslations("Dashboard.investment");
  const colorClass =
    level <= 2
      ? "border-primary/40 text-primary"
      : level <= 3.5
        ? "border-amber-500/40 text-amber-600 dark:text-amber-400"
        : "border-destructive/40 text-destructive";
  return (
    <Badge variant="outline" className={colorClass}>
      {t("risk.label", { level, max: 5, description: riskLabel(level, t) })}
    </Badge>
  );
}

// Détail des actifs réellement impliqués dans le panier — au-delà du rendement agrégé
// affiché plus bas, pour que le client voie concrètement la composition de la stratégie
// avant de placer des fonds (cf. §2H CLAUDE.md, GET /investment/assets). Un actif sans
// cours disponible pour l'instant (prix null) affiche "—" plutôt que d'être masqué : la
// composition du panier reste stable même si sa cotation manque temporairement.
function AssetsTable({ assets }: { assets: (RwaBasketAsset | StockBasketAsset)[] }) {
  const t = useTranslations("Dashboard.investment");
  if (assets.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full min-w-[280px] text-left text-xs">
        <thead>
          <tr className="border-b border-border/60 text-[10.5px] uppercase tracking-wide text-muted-foreground/80">
            <th className="px-2.5 py-1.5 font-medium">{t("assetsTable.asset")}</th>
            <th className="px-2.5 py-1.5 text-right font-medium">{t("assetsTable.price")}</th>
            <th className="px-2.5 py-1.5 text-right font-medium">{t("assetsTable.change")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40 tabular-nums">
          {assets.map((asset) => {
            const key = "currency" in asset ? asset.currency : asset.ticker;
            const image = "image" in asset ? asset.image : null;
            const changePct = asset.changePct;
            const isNegative = changePct != null && changePct < 0;
            return (
              <tr key={key}>
                <td className="flex items-center gap-1.5 px-2.5 py-1.5">
                  {image && (
                    // eslint-disable-next-line @next/next/no-img-element -- même logo CDN CoinMarketCap que market-view.tsx, hors du domaine autorisé par next/image
                    <img src={image} alt="" className="size-4 rounded-full" />
                  )}
                  <span className="truncate">{asset.name}</span>
                </td>
                <td className="px-2.5 py-1.5 text-right">
                  {asset.price != null ? formatUsd(asset.price) : "—"}
                </td>
                <td
                  className={`px-2.5 py-1.5 text-right font-medium ${
                    changePct == null ? "text-muted-foreground" : isNegative ? "text-destructive" : "text-primary"
                  }`}
                >
                  {changePct != null ? `${isNegative ? "" : "+"}${changePct.toFixed(2)}%` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Un seul panneau par panier — dernier rendement quotidien réel affiché (peut être
// négatif, cf. InvestmentService.accrueYieldForPosition), jamais masqué comme une erreur :
// un placement réel porte un vrai risque de perte, contrairement au rendement indexé du
// gage (§2A) qui ne rembourse jamais que sur plus-value.
export function BasketCard({
  basket,
  rate,
  assets,
  history,
  position,
  availableBalance,
  busy,
  onDeposit,
  onWithdraw,
}: {
  basket: InvestmentBasket;
  rate: InvestmentBasketRate | null;
  assets: (RwaBasketAsset | StockBasketAsset)[];
  history: { date: string; returnPct: string }[];
  position: InvestmentPosition | null;
  availableBalance: number | null;
  busy: boolean;
  onDeposit: (basket: InvestmentBasket, amount: string) => Promise<void>;
  onWithdraw: (basket: InvestmentBasket) => Promise<void>;
}) {
  const t = useTranslations("Dashboard.investment");
  const [amount, setAmount] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const dailyPct =
    basket === "RWA_STRATEGY" ? rate?.latestDailyReturnPct : rate?.latestMarketSignalPct;
  const dailyPctIsNegative = dailyPct != null && Number(dailyPct) < 0;

  const principal = position ? Number(position.principalAmount) : 0;
  const accruedYield = position ? Number(position.accruedYield) : 0;
  const totalValue = principal + accruedYield;

  const parsedAmount = Number(amount);
  const minAmount = 10;
  const exceedsBalance = availableBalance != null && parsedAmount > availableBalance;
  const belowMinimum = amount.trim() !== "" && parsedAmount > 0 && parsedAmount < minAmount;
  const isValidAmount = parsedAmount > 0 && !exceedsBalance && !belowMinimum;

  const sparklinePoints = buildReturnIndex(history);

  async function handleConfirm() {
    if (!acceptedTerms) return;
    setConfirming(false);
    await onDeposit(basket, amount);
    setAmount("");
    setAcceptedTerms(false);
  }

  const accent = riskAccentClasses(rate?.riskLevel ?? 3);

  return (
    <Card className={cn("border-l-4", accent.border)}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{t(`basket.${basket}.title`)}</CardTitle>
          {rate && <RiskBadge level={rate.riskLevel} />}
        </div>
        <CardDescription>{t(`basket.${basket}.description`)}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {/* Info capitale de la carte, mise en avant en tête plutôt que noyée dans une
            liste de lignes toutes au même poids visuel (retour client : "tout est très
            collé, fais varier les couleurs pour bien sortir les infos capitales"). */}
        <div className={cn("flex items-center justify-between rounded-lg px-3 py-2.5", accent.chipBg)}>
          <span className="text-xs font-medium text-muted-foreground">{t("indicativeAnnual")}</span>
          <span className={cn("text-xl font-bold tabular-nums", accent.chipText)}>
            {rate ? `${rate.indicativeAnnualPct}%/an` : "—"}
          </span>
        </div>

        {dailyPct != null && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("latestDaily")}</span>
            <div className="flex items-center gap-2">
              {sparklinePoints.length >= 2 && (
                <MiniSparkline points={sparklinePoints} width={56} height={22} />
              )}
              <span
                className={`flex items-center gap-1 font-semibold tabular-nums ${
                  dailyPctIsNegative ? "text-destructive" : "text-primary"
                }`}
              >
                {dailyPctIsNegative ? (
                  <TrendingDown className="size-3.5" />
                ) : (
                  <TrendingUp className="size-3.5" />
                )}
                {dailyPct}%
              </span>
            </div>
          </div>
        )}

        <div className="border-t border-border/60 pt-4">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t("assetsTable.title")}</p>
          <AssetsTable assets={assets} />
        </div>

        {position && (
          <div className="flex flex-col gap-1 rounded-lg border border-border/60 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("principal")}</span>
              <span className="font-medium tabular-nums">{formatUsd(principal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("accruedYield")}</span>
              <span
                className={`font-medium tabular-nums ${
                  accruedYield < 0 ? "text-destructive" : "text-primary"
                }`}
              >
                {formatUsd(accruedYield)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between border-t border-border/60 pt-1.5 text-sm">
              <span className="font-medium">{t("totalValue")}</span>
              <span className="font-semibold tabular-nums">{formatUsd(totalValue)}</span>
            </div>
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

            {/* Raccourcis 25/50/75/MAX — calculés sur le vrai solde disponible du client
                (cf. availableBalance, passé par InvestmentPanel), jamais une valeur devinée. */}
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

            {exceedsBalance && (
              <p className="text-xs text-destructive">{t("insufficientBalance")}</p>
            )}
            {belowMinimum && (
              <p className="text-xs text-destructive">{t("belowMinimum", { min: minAmount })}</p>
            )}
          </div>
        ) : (
          // Étape de confirmation explicite — la case CGU n'apparaît qu'ici, une fois que
          // le client a manifesté l'intention de placer un montant précis, jamais avant
          // (demande client) : même principe que la confirmation de blocage des plans à
          // échéance fixe (FixedTermPlansSection), adapté ici à un placement librement
          // retirable plutôt qu'à un blocage.
          <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <p className="text-xs leading-relaxed text-foreground">
              {t("confirmDepositRecap", { amount: formatUsd(parsedAmount), basket: t(`basket.${basket}.title`) })}
            </p>
            <TermsAcceptance variant="investment" accepted={acceptedTerms} onAcceptedChange={setAcceptedTerms} disabled={busy} />
            <div className="flex gap-2">
              <Button type="button" size="sm" disabled={busy || !acceptedTerms} onClick={() => void handleConfirm()}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : t("confirmDeposit")}
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

        {position && (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => {
              void onWithdraw(basket);
            }}
          >
            {t("withdrawAll")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
