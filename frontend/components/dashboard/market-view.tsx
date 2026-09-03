"use client";

import { useEffect, useMemo, useState } from "react";
import { LineChart, RefreshCw, Search, Sparkles, TrendingDown, TrendingUp, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MiniSparkline } from "@/components/marketing/performance-chart";
import {
  api,
  ApiError,
  type AcceptedCurrency,
  type AssetHistoryEntry,
  type MarketOverviewEntry,
  type StockMarketEntry,
} from "@/lib/api";
import { formatCompactUsd, formatPercent, formatPrice, formatTime } from "@/lib/format";

function matchesQuery(query: string, ...fields: string[]): boolean {
  if (query.trim() === "") return true;
  const needle = query.trim().toLowerCase();
  return fields.some((field) => field.toLowerCase().includes(needle));
}

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

// Attribution de la source de données (obligatoire, cf. conditions d'usage de l'API
// gratuite CoinMarketCap) — texte seul avec lien, sans logo imposé : plus sobre que le
// badge logo obligatoire de l'ancienne intégration CoinGecko (décision produit).
function DataProviderAttribution() {
  const t = useTranslations("Dashboard.marketView");
  return (
    <a
      href="https://coinmarketcap.com"
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs font-medium text-muted-foreground/80 underline underline-offset-2 hover:text-foreground"
    >
      {t("dataProvider")}
    </a>
  );
}

export function MarketView() {
  const t = useTranslations("Dashboard.marketView");
  const [entries, setEntries] = useState<MarketOverviewEntry[] | null>(null);
  const [stocks, setStocks] = useState<StockMarketEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const [trends, setTrends] = useState<Map<AcceptedCurrency, AssetHistoryEntry["points"]>>(new Map());
  const [query, setQuery] = useState("");

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

  // Actions cotées (retour client : "je veux l'affichage des actions de bourse aussi") —
  // même rythme de rafraîchissement que les cryptos/RWA ci-dessus, source réelle Finnhub
  // (cf. GET /market/stocks, union des 5 paniers du produit "investissement direct").
  useEffect(() => {
    let ignore = false;

    function load() {
      api
        .getMarketStocks()
        .then((data) => {
          if (!ignore) setStocks(data);
        })
        .catch(() => {
          // Purement informatif — la section actions reste simplement masquée si
          // indisponible, le reste de la page (cryptos/RWA) demeure pleinement utilisable.
        });
    }

    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, []);

  // Tendance 12 mois — chargée une seule fois (pas à chaque cycle de 45s comme les prix
  // en direct ci-dessus : un historique annuel n'a pas besoin de cette fraîcheur, et
  // l'endpoint est déjà mis en cache 6h côté backend, cf. HISTORY_CACHE_TTL_MS). Même
  // source que useEstimatedYield (simulateurs de crédit) : de vrais points de cours, pas
  // un sparkline fabriqué — l'API CoinMarketCap gratuite n'en fournit pas nativement,
  // contrairement à l'ancienne intégration CoinGecko (cf. journal des modifications).
  useEffect(() => {
    let ignore = false;
    api
      .getYieldHistoryFull()
      .then((history) => {
        if (ignore) return;
        setTrends(new Map(history.map((h) => [h.currency, h.points])));
      })
      .catch(() => {
        // Purement décoratif — la colonne Tendance retombe sur "—" pour ces lignes,
        // le reste du tableau (prix, variation, volumes) reste pleinement utilisable.
      });
    return () => {
      ignore = true;
    };
  }, []);

  const filteredEntries = useMemo(
    () => entries?.filter((e) => matchesQuery(query, e.symbol, e.name)) ?? [],
    [entries, query],
  );
  const filteredStocks = useMemo(
    () => stocks?.filter((s) => matchesQuery(query, s.ticker, s.name)) ?? [],
    [stocks, query],
  );
  const accepted = filteredEntries.filter((e) => e.isAcceptedForCredit);
  const others = filteredEntries.filter((e) => !e.isAcceptedForCredit);
  const hasAnyResult = accepted.length > 0 || others.length > 0 || filteredStocks.length > 0;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
      <CardContent className="flex flex-col gap-4">
        {/* Bandeau défilant des cours boursiers (retour client, croquis fourni : bande de
            cours qui défile en haut, puis "Actifs" en dessous) — toujours les 16 tickers
            réels, indépendant de la recherche ci-dessous (comme un vrai bandeau boursier,
            jamais filtré). Contenu dupliqué une fois pour boucler sans accroc (cf.
            .ticker-track, app/globals.css) ; en pause au survol pour rester lisible. */}
        {stocks && stocks.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border/60 bg-muted/20 py-2">
            <div className="ticker-track flex w-max gap-8">
              {[...stocks, ...stocks].map((stock, i) => (
                <span key={`${stock.ticker}-${i}`} className="flex shrink-0 items-center gap-2 px-2 text-xs whitespace-nowrap">
                  <span className="font-semibold text-foreground">{stock.ticker}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {stock.price !== null ? formatPrice(stock.price) : "—"}
                  </span>
                  <ChangeBadge pct={stock.changePct} />
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-9 pr-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label={t("clearSearch")}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {!error && !entries && <p className="text-sm text-muted-foreground">{t("loading")}</p>}

        {entries && !hasAnyResult && (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("noResults", { query })}</p>
        )}

        {entries && (accepted.length > 0 || others.length > 0) && (
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase">
              <LineChart className="size-3.5 text-primary" />
              {t("assetsLabel")}
            </p>
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <Table className="min-w-[560px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("columns.asset")}</TableHead>
                    <TableHead className="text-right">{t("columns.price")}</TableHead>
                    <TableHead className="text-right">{t("columns.change24h")}</TableHead>
                    <TableHead className="text-right">{t("columns.volume24h")}</TableHead>
                    <TableHead className="text-right">{t("columns.marketCap")}</TableHead>
                    <TableHead className="text-right">{t("columns.trend12m")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accepted.length > 0 && (
                    <TableRow key="section-accepted" className="hover:bg-transparent">
                      <TableCell colSpan={6} className="py-1.5 text-xs font-medium text-muted-foreground">
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
                    <MarketRow
                      key={entry.id}
                      entry={entry}
                      trendPoints={entry.currency ? trends.get(entry.currency) : undefined}
                    />
                  ))}

                  {others.length > 0 && (
                    <TableRow key="section-others" className="hover:bg-transparent">
                      <TableCell colSpan={6} className="py-1.5 text-xs font-medium text-muted-foreground">
                        {t("othersSection.title")}
                      </TableCell>
                    </TableRow>
                  )}
                  {others.map((entry) => (
                    <MarketRow
                      key={entry.id}
                      entry={entry}
                      trendPoints={entry.currency ? trends.get(entry.currency) : undefined}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MarketRow({
  entry,
  trendPoints,
}: {
  entry: MarketOverviewEntry;
  trendPoints?: AssetHistoryEntry["points"];
}) {
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
        {formatCompactUsd(entry.volume24h)}
      </TableCell>
      <TableCell className="text-right tabular-nums text-muted-foreground">
        {formatCompactUsd(entry.marketCap)}
      </TableCell>
      <TableCell className="text-right">
        {entry.isYieldEligible ? (
          <div className="flex justify-end">
            <MiniSparkline points={trendPoints ?? []} />
          </div>
        ) : (
          <span className="text-xs text-muted-foreground/50">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}
