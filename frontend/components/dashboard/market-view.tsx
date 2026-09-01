"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Sparkline } from "@/components/dashboard/sparkline";
import { api, ApiError, type MarketOverviewEntry } from "@/lib/api";
import { formatCompactUsd, formatPercent, formatPrice, formatTime } from "@/lib/format";

const REFRESH_INTERVAL_MS = 45_000;

// Couleurs statut (good/critical) — jamais réutilisées comme identité catégorielle,
// toujours associées à une icône + le signe du chiffre (jamais la couleur seule).
function ChangeBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-muted-foreground">—</span>;
  const isUp = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 font-medium tabular-nums ${
        isUp ? "text-[#0ca30c] dark:text-[#34D399]" : "text-[#d03b3b] dark:text-[#EF4444]"
      }`}
    >
      {isUp ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
      {formatPercent(pct)}
    </span>
  );
}

// Attribution de la source de données (obligatoire pour l'usage de l'API publique
// CoinGecko) — logo en SVG pur (inline, aucune dépendance à une image externe), couleur
// de marque CoinGecko (#8dc63f), lien vers coingecko.com.
function DataProviderAttribution() {
  const t = useTranslations("Dashboard.marketView");
  return (
    <a
      href="https://www.coingecko.com"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-border dark:bg-transparent dark:text-muted-foreground dark:shadow-none dark:hover:border-primary/30 dark:hover:text-foreground"
    >
      <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden>
        <circle cx="12" cy="12" r="11" fill="#8dc63f" />
        <circle cx="8.7" cy="10.2" r="1.5" fill="#0d1a0a" />
        <path
          d="M6 15c1.9 1.6 3.9 2.1 6 2.1s4.1-.5 6-2.1"
          stroke="#0d1a0a"
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      {t("dataProvider")}
    </a>
  );
}

export function MarketView() {
  const t = useTranslations("Dashboard.marketView");
  const [entries, setEntries] = useState<MarketOverviewEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  useEffect(() => {
    let ignore = false;

    function load() {
      api
        .getMarketPrices()
        .then((data) => {
          if (ignore) return;
          setEntries(data);
          setRefreshedAt(new Date());
          setError(null);
        })
        .catch((err) => {
          if (!ignore) setError(err instanceof ApiError ? err.message : t("pricesUnavailable"));
        });
    }

    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [t]);

  const accepted = entries?.filter((e) => e.isAcceptedForCredit) ?? [];
  const others = entries?.filter((e) => !e.isAcceptedForCredit) ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <DataProviderAttribution />
          {refreshedAt && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className="size-3" />
              {formatTime(refreshedAt)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!error && !entries && <p className="text-sm text-muted-foreground">{t("loading")}</p>}
        {entries && (
          <div className="overflow-x-auto">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.asset")}</TableHead>
                  <TableHead className="text-right">{t("columns.price")}</TableHead>
                  <TableHead className="text-right">{t("columns.change24h")}</TableHead>
                  <TableHead className="text-right">{t("columns.high24h")}</TableHead>
                  <TableHead className="text-right">{t("columns.low24h")}</TableHead>
                  <TableHead className="text-right">{t("columns.volume24h")}</TableHead>
                  <TableHead className="text-right">{t("columns.marketCap")}</TableHead>
                  <TableHead className="text-right">{t("columns.sevenDays")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accepted.length > 0 && (
                  <TableRow key="section-accepted" className="hover:bg-transparent">
                    <TableCell colSpan={8} className="py-1.5 text-xs font-medium text-muted-foreground">
                      <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                        {t("acceptedSection.title")}
                        <span className="inline-flex items-center gap-1 font-normal normal-case text-muted-foreground/80">
                          ·{" "}
                          <Sparkles className="size-2.5 text-primary" />
                          {t("acceptedSection.yieldNote")}
                        </span>
                      </span>
                    </TableCell>
                  </TableRow>
                )}
                {accepted.map((entry) => (
                  <MarketRow key={entry.id} entry={entry} />
                ))}

                {others.length > 0 && (
                  <TableRow key="section-others" className="hover:bg-transparent">
                    <TableCell colSpan={8} className="py-1.5 text-xs font-medium text-muted-foreground">
                      {t("othersSection.title")}
                    </TableCell>
                  </TableRow>
                )}
                {others.map((entry) => (
                  <MarketRow key={entry.id} entry={entry} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MarketRow({ entry }: { entry: MarketOverviewEntry }) {
  const t = useTranslations("Dashboard.marketView");
  return (
    // Survol neutre — commun au dashboard/admin (gold/obsidian) et à la vitrine
    // (cyan/fuchsia) : ce composant est partagé, il ne doit porter l'identité visuelle
    // d'aucun des deux (cf. décision produit : langages visuels gardés séparés).
    <TableRow className="transition-colors duration-200 hover:bg-muted/40">
      <TableCell>
        <div className="flex items-center gap-2.5">
          {entry.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={entry.image} alt="" className="size-5 rounded-full" />
          ) : (
            <div className="size-5 rounded-full bg-muted" />
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-medium">{entry.symbol}</span>
              {entry.isAcceptedForCredit && (
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                  {entry.isPegged ? t("badges.acceptedPegged") : t("badges.acceptedSpot")}
                </Badge>
              )}
              {entry.isYieldEligible && (
                <Badge
                  variant="secondary"
                  className="h-4 gap-0.5 bg-primary/10 px-1.5 text-[10px] text-primary"
                  title={t("badges.yieldTitle")}
                >
                  <Sparkles className="size-2.5" />
                  {t("badges.yield")}
                </Badge>
              )}
              {entry.targetApyRangePct && (
                <Badge
                  variant="secondary"
                  className="h-4 px-1.5 text-[10px]"
                  title={t("badges.targetApyTitle")}
                >
                  {t("badges.targetApy", {
                    min: entry.targetApyRangePct.min,
                    max: entry.targetApyRangePct.max,
                  })}
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">{entry.name}</div>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {entry.usdPrice ? formatPrice(entry.usdPrice) : "—"}
      </TableCell>
      <TableCell className="text-right">
        <ChangeBadge pct={entry.change24hPct} />
      </TableCell>
      <TableCell className="text-right tabular-nums text-muted-foreground">
        {entry.high24h ? formatPrice(entry.high24h) : "—"}
      </TableCell>
      <TableCell className="text-right tabular-nums text-muted-foreground">
        {entry.low24h ? formatPrice(entry.low24h) : "—"}
      </TableCell>
      <TableCell className="text-right tabular-nums text-muted-foreground">
        {formatCompactUsd(entry.volume24h)}
      </TableCell>
      <TableCell className="text-right tabular-nums text-muted-foreground">
        {formatCompactUsd(entry.marketCap)}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end">
          <Sparkline data={entry.sparkline7d} />
        </div>
      </TableCell>
    </TableRow>
  );
}
