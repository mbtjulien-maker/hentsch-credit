"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, Sparkles, TrendingDown, TrendingUp, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PerformanceChart } from "@/components/marketing/performance-chart";
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

type TabKey = "accepted" | "others" | "stocks";

export function MarketView() {
  const t = useTranslations("Dashboard.marketView");
  const [entries, setEntries] = useState<MarketOverviewEntry[] | null>(null);
  const [stocks, setStocks] = useState<StockMarketEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const [trends, setTrends] = useState<Map<AcceptedCurrency, AssetHistoryEntry["points"]>>(new Map());
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey | null>(null);

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
          // Purement informatif — l'onglet Actions reste simplement absent si
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
  // source que useEstimatedYield (simulateurs de crédit) : de vrais points de cours,
  // désormais affichés en grand (PerformanceChart, même composant que /rendement) plutôt
  // qu'un sparkline discret de cellule de tableau — l'API CoinMarketCap gratuite ne
  // fournit pas nativement de mini-graphique (contrairement à l'ancienne intégration
  // CoinGecko, cf. journal des modifications), ces points sont donc de vraies valeurs
  // recalculées à partir de l'historique déjà récupéré pour d'autres usages (simulateurs
  // de crédit), jamais une courbe fabriquée.
  useEffect(() => {
    let ignore = false;
    api
      .getYieldHistoryFull()
      .then((history) => {
        if (ignore) return;
        setTrends(new Map(history.map((h) => [h.currency, h.points])));
      })
      .catch(() => {
        // Purement décoratif — la carte retombe sur "Historique indisponible" pour ces
        // lignes, le reste (prix, variation, volumes) reste pleinement utilisable.
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

  // Onglets calculés sur les listes NON filtrées : la présence/absence d'un onglet ne
  // doit pas dépendre de la recherche en cours (un onglet ne doit pas disparaître pendant
  // que le client tape), seul son contenu réagit à la recherche.
  const acceptedAll = useMemo(() => entries?.filter((e) => e.isAcceptedForCredit) ?? [], [entries]);
  const othersAll = useMemo(() => entries?.filter((e) => !e.isAcceptedForCredit) ?? [], [entries]);
  const availableTabs = useMemo<TabKey[]>(() => {
    const list: TabKey[] = [];
    if (acceptedAll.length > 0) list.push("accepted");
    if (othersAll.length > 0) list.push("others");
    if ((stocks?.length ?? 0) > 0) list.push("stocks");
    return list;
  }, [acceptedAll, othersAll, stocks]);

  // Onglet effectif dérivé au rendu plutôt qu'assigné dans un effet (évite un
  // setState synchrone en effet, cascade de rendus déconseillée par
  // react-hooks/set-state-in-effect) : l'état ne retient que le choix explicite du
  // client, la valeur par défaut/de repli (premier onglet disponible) est recalculée
  // à chaque rendu si ce choix est absent ou n'est plus valide (ex. les actions
  // cotées, choisies puis devenues indisponibles après une panne Finnhub).
  const resolvedTab = useMemo<TabKey | null>(() => {
    if (activeTab !== null && availableTabs.includes(activeTab)) return activeTab;
    return availableTabs[0] ?? null;
  }, [activeTab, availableTabs]);

  const currentAccepted = useMemo(() => filteredEntries.filter((e) => e.isAcceptedForCredit), [filteredEntries]);
  const currentOthers = useMemo(() => filteredEntries.filter((e) => !e.isAcceptedForCredit), [filteredEntries]);

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
            réels, indépendant de la recherche/des onglets ci-dessous (comme un vrai
            bandeau boursier, jamais filtré). Contenu dupliqué une fois pour boucler sans
            accroc (cf. .ticker-track, app/globals.css) ; en pause au survol. */}
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

        {entries && availableTabs.length > 0 && resolvedTab && (
          <div className="flex flex-col gap-4">
            <Tabs value={resolvedTab} onValueChange={(value) => setActiveTab(value as TabKey)}>
              <TabsList>
                {availableTabs.includes("accepted") && (
                  <TabsTrigger value="accepted">{t("tabs.accepted")}</TabsTrigger>
                )}
                {availableTabs.includes("others") && (
                  <TabsTrigger value="others">{t("tabs.others")}</TabsTrigger>
                )}
                {availableTabs.includes("stocks") && (
                  <TabsTrigger value="stocks">{t("tabs.stocks")}</TabsTrigger>
                )}
              </TabsList>
            </Tabs>

            {/* Rendu conditionnel manuel plutôt que <TabsContent> (Base UI Panel) : la
                détection de fin de transition de la bibliothèque n'aboutit jamais en
                l'absence de transition CSS réelle sur le panneau, ce qui laisse le
                panneau précédent monté indéfiniment (même bug déjà rencontré et
                contourné sur investment-panel.tsx, cf. §6 CLAUDE.md entrée #37). */}
            {resolvedTab === "accepted" && (
              <div className="flex flex-col gap-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Sparkles className="size-3.5 text-primary" />
                  {t("acceptedSection.yieldNote")}
                </p>
                {currentAccepted.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">{t("noResults", { query })}</p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {currentAccepted.map((entry) => (
                      <AssetCard
                        key={entry.id}
                        entry={entry}
                        trendPoints={entry.currency ? trends.get(entry.currency) : undefined}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {resolvedTab === "others" && (
              <div className="flex flex-col gap-3">
                {currentOthers.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">{t("noResults", { query })}</p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {currentOthers.map((entry) => (
                      <AssetCard
                        key={entry.id}
                        entry={entry}
                        trendPoints={entry.currency ? trends.get(entry.currency) : undefined}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {resolvedTab === "stocks" && (
              <div className="flex flex-col gap-3">
                {filteredStocks.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">{t("noResults", { query })}</p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredStocks.map((stock) => (
                      <StockCard key={stock.ticker} stock={stock} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {entries && availableTabs.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("noResults", { query })}</p>
        )}
      </CardContent>
    </Card>
  );
}

// Carte d'un actif accepté/autre crypto — remplace la ligne de tableau par une vraie
// courbe de tendance (PerformanceChart, même composant que la page /rendement) plutôt
// qu'un sparkline discret : plus lisible, plus "app boursière", et cohérent avec la
// mise en avant visuelle déjà appliquée aux paniers d'investissement (§6 CLAUDE.md
// entrée #37 — liseré/bloc coloré pour les infos capitales).
function AssetCard({
  entry,
  trendPoints,
}: {
  entry: MarketOverviewEntry;
  trendPoints?: AssetHistoryEntry["points"];
}) {
  const t = useTranslations("Dashboard.marketView");
  const hasChart = trendPoints !== undefined && trendPoints.length >= 2;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-md">
      <div className="flex items-center gap-2.5">
        {entry.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.image} alt="" className="size-9 shrink-0 rounded-full ring-1 ring-border/50" />
        ) : (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
            {entry.symbol.slice(0, 3)}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold">{entry.symbol}</span>
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
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px]" title={t("badges.targetApyTitle")}>
                {t("badges.targetApy", { min: entry.targetApyRangePct.min, max: entry.targetApyRangePct.max })}
              </Badge>
            )}
          </div>
          <div className="truncate text-xs text-muted-foreground">{entry.name}</div>
        </div>
      </div>

      <div className="h-16">
        {hasChart ? (
          <PerformanceChart points={trendPoints!} height={64} />
        ) : (
          <div className="flex h-full items-center justify-center rounded-md bg-muted/30 text-[11px] text-muted-foreground/60">
            {t("chartUnavailable")}
          </div>
        )}
      </div>

      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-lg font-semibold tabular-nums">
            {entry.usdPrice ? formatPrice(entry.usdPrice) : "—"}
          </div>
          <ChangeBadge pct={entry.change24hPct} />
        </div>
        <div className="text-right text-[11px] leading-tight text-muted-foreground tabular-nums">
          <div>
            {t("columns.volume24h")} · {formatCompactUsd(entry.volume24h)}
          </div>
          <div>
            {t("columns.marketCap")} · {formatCompactUsd(entry.marketCap)}
          </div>
        </div>
      </div>
    </div>
  );
}

// Carte compacte pour une action cotée — pas d'historique disponible pour ce type
// d'actif côté API (Finnhub, plan gratuit : pas d'endpoint dédié équivalent à
// /market/yield-history-full), donc pas de bloc graphique ici plutôt qu'un graphique
// fabriqué ou dupliqué depuis une autre source.
function StockCard({ stock }: { stock: StockMarketEntry }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-md">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
          {stock.ticker.slice(0, 3)}
        </div>
        <div className="min-w-0">
          <div className="font-semibold">{stock.ticker}</div>
          <div className="truncate text-xs text-muted-foreground">{stock.name}</div>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="font-semibold tabular-nums">{stock.price !== null ? formatPrice(stock.price) : "—"}</div>
        <ChangeBadge pct={stock.changePct} />
      </div>
    </div>
  );
}
