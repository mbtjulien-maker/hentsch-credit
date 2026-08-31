"use client";

import { useEffect, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { PerformanceChart } from "@/components/marketing/performance-chart";
import { api, ApiError, type AssetHistoryEntry, type MarketOverviewEntry } from "@/lib/api";
import { formatPercent, formatPrice } from "@/lib/format";

// Historique réel sur 12 mois des actifs générateurs de rendement (cf.
// MarketDataService.getYieldAssetHistory côté backend) — 365 jours est le maximum
// disponible sur le plan gratuit CoinMarketCap : affiché honnêtement comme "performance
// sur 12 mois", jamais "depuis le lancement", quel que soit l'âge réel de chaque actif.
// Les logos/noms viennent de /market/prices (même appel que le reste de la vitrine)
// plutôt que d'être dupliqués ici.
export function YieldPerformanceHistory() {
  const t = useTranslations("YieldPerformanceHistory");
  const [history, setHistory] = useState<AssetHistoryEntry[] | null>(null);
  const [entries, setEntries] = useState<MarketOverviewEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    Promise.all([api.getYieldHistory(), api.getMarketPrices()])
      .then(([historyData, priceData]) => {
        if (ignore) return;
        setHistory(historyData);
        setEntries(priceData);
      })
      .catch((err: unknown) => {
        if (!ignore) setError(err instanceof ApiError ? err.message : t("unavailable"));
      });
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t est stable pour la durée du composant
  }, []);

  if (error) return <p className="text-sm text-destructive">{error}</p>;

  if (!history || !entries) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[220px] animate-pulse rounded-2xl border border-border/80 bg-card/60" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {history.map((asset) => {
        const entry = entries.find((e) => e.currency === asset.currency);
        const isUp = (asset.changePct ?? 0) >= 0;
        return (
          <div key={asset.currency} className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                {entry?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- logo distant CoinMarketCap
                  <img src={entry.image} alt="" className="size-7 rounded-full" />
                ) : (
                  <div className="size-7 rounded-full bg-muted" />
                )}
                <div>
                  <div className="text-sm font-semibold text-foreground">{entry?.symbol ?? asset.currency}</div>
                  <div className="text-xs text-muted-foreground/80">{entry?.name ?? asset.currency}</div>
                </div>
              </div>
              {asset.changePct !== null && (
                <span
                  className={`flex items-center gap-1 text-sm font-semibold tabular-nums ${
                    isUp ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {isUp ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                  {formatPercent(asset.changePct)}
                </span>
              )}
            </div>

            <div className="mt-3">
              <PerformanceChart points={asset.points} />
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground/80">
              <span>{t("low12m")} : {asset.lowUsd !== null ? formatPrice(asset.lowUsd) : t("unavailableValue")}</span>
              <span>{t("high12m")} : {asset.highUsd !== null ? formatPrice(asset.highUsd) : t("unavailableValue")}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
