"use client";

import { useEffect, useState } from "react";
import { LineChart, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { api, ApiError, type AcceptedCurrency, type MarketOverviewEntry, type StockMarketEntry } from "@/lib/api";
import { formatPercent } from "@/lib/format";

// Quatre paniers représentatifs du gradient de risque (mêmes clés que
// INVESTMENT_BASKETS côté page.tsx, cf. §2H CLAUDE.md entrée #27) — chacun mappé sur ses
// vrais actifs sous-jacents (devises RWA ou tickers actions) pour calculer une variation
// moyenne RÉELLE du jour, jamais un chiffre inventé. Mêmes sources publiques que
// YieldAssetGrid (crédit) et MarketView (dashboard) : GET /market/prices (RWA) et
// GET /market/stocks (actions), toutes deux non protégées par KycVerifiedGuard,
// contrairement à GET /investment/rates (réservé aux clients connectés) — c'est la seule
// donnée de marché en direct accessible depuis une page publique.
const BASKET_MARKET_KEYS = {
  rwa: { type: "currency", keys: ["XPT", "XPD", "XCU", "WTI"] as AcceptedCurrency[] },
  stocksConservative: { type: "ticker", keys: ["KO", "JNJ", "PG", "BRK.B"] },
  stocksTechAi: { type: "ticker", keys: ["NVDA", "AVGO", "META", "GOOGL"] },
  stocksMomentum: { type: "ticker", keys: ["MU", "SNDK", "DELL", "PLTR"] },
} as const;

type BasketKey = keyof typeof BASKET_MARKET_KEYS;

const BASKET_ORDER: BasketKey[] = ["rwa", "stocksConservative", "stocksTechAi", "stocksMomentum"];

// Noms réels des actifs/actions de chaque panier (retour client : "on ne voit pas le
// type d'investissement... spécifie bien les actifs et actions associés") — mêmes
// intitulés que la liste `BASKET_COMPOSITION` de /investissement-direct (page.tsx),
// dupliqués ici plutôt que partagés via un import : noms propres d'entreprises/métaux,
// invariants par langue, pas des chaînes à traduire. Ordre aligné sur
// BASKET_MARKET_KEYS.stocksConservative/stocksTechAi/stocksMomentum ci-dessus.
const BASKET_COMPOSITION: Record<BasketKey, string> = {
  rwa: "Platine, Palladium, Cuivre, Pétrole synthétique",
  stocksConservative: "Coca-Cola, Johnson & Johnson, Procter & Gamble, Berkshire Hathaway",
  stocksTechAi: "NVIDIA, Broadcom, Meta Platforms, Alphabet",
  stocksMomentum: "Micron, SanDisk, Dell Technologies, Palantir",
};

// Moyenne réelle des variations du jour pour les tickers/devises d'un panier — `null`
// uniquement si aucun actif du panier n'a de cours disponible (jamais 0 fabriqué),
// même principe que StockMarketDataService.getBasketMarketSignal côté backend.
function computeBasketSignal(
  basket: BasketKey,
  prices: MarketOverviewEntry[] | null,
  stocks: StockMarketEntry[] | null,
): number | null {
  const spec = BASKET_MARKET_KEYS[basket];
  const changes: number[] =
    spec.type === "currency"
      ? (prices ?? [])
          .filter((p) => p.currency && (spec.keys as readonly string[]).includes(p.currency))
          .map((p) => p.change24hPct)
          .filter((v): v is number => v !== null)
      : (stocks ?? [])
          .filter((s) => (spec.keys as readonly string[]).includes(s.ticker))
          .map((s) => s.changePct)
          .filter((v): v is number => v !== null);
  if (changes.length === 0) return null;
  return changes.reduce((sum, v) => sum + v, 0) / changes.length;
}

// Panneau "six stratégies" du hero investissement — pendant de YieldAssetGrid (hero
// crédit) : mêmes codes visuels (carte blanche, hover lift, badge, icône de tendance
// colorée) pour que les deux hero du carrousel d'accueil (cf. HeroCarousel) se sentent
// aussi vivants/interactifs l'un que l'autre, plutôt qu'un panneau statique à côté d'un
// panneau alimenté en direct. L'objectif indicatif (dividende/stratégie RWA, éditorial)
// reste affiché tel quel — seule la variation du jour est réellement mesurée en direct.
export function InvestmentPreviewGrid() {
  const t = useTranslations("Home.investmentHero");
  const tInvest = useTranslations("DirectInvestment");
  // Même message d'indisponibilité que YieldAssetGrid (hero crédit) — pas de doublon
  // retapé pour ce cas générique "cours indisponibles".
  const tYield = useTranslations("YieldShowcase");
  const [prices, setPrices] = useState<MarketOverviewEntry[] | null>(null);
  const [stocks, setStocks] = useState<StockMarketEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    Promise.all([api.getMarketPrices(), api.getMarketStocks()])
      .then(([priceEntries, stockEntries]) => {
        if (ignore) return;
        setPrices(priceEntries);
        setStocks(stockEntries);
      })
      .catch((err: unknown) => {
        if (!ignore) setError(err instanceof ApiError ? err.message : tYield("pricesUnavailable"));
      });
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t stable pour la durée du composant
  }, []);

  const loaded = prices !== null && stocks !== null;

  return (
    <div className="flex h-full flex-col rounded-3xl bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-white p-6 shadow-[0_8px_30px_-12px_rgba(16,185,129,0.25)] sm:p-7">
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-medium text-emerald-800">
        <LineChart className="size-3.5" />
        {t("basketsBadge")}
      </span>
      <h3 className="mt-3 text-xl font-semibold text-slate-900 sm:text-2xl">{t("basketsTitle")}</h3>
      <p className="mt-2 text-sm text-slate-600">{t("basketsSubtitle")}</p>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {!error && !loaded && (
        <div className="mt-5 grid grid-cols-2 gap-3">
          {BASKET_ORDER.map((key) => (
            <div key={key} className="h-[104px] animate-pulse rounded-2xl border border-emerald-200/50 bg-white/60" />
          ))}
        </div>
      )}

      {!error && loaded && (
        <div className="mt-5 grid grid-cols-2 gap-3">
          {BASKET_ORDER.map((key) => {
            const signal = computeBasketSignal(key, prices, stocks);
            const isUp = (signal ?? 0) >= 0;
            return (
              <div
                key={key}
                className="flex flex-col gap-1.5 rounded-2xl border border-emerald-200/70 bg-white p-3.5 shadow-sm transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-lg"
              >
                <span className="text-xs font-medium text-slate-500">{tInvest(`baskets.${key}.title`)}</span>
                <span className="text-[11px] leading-snug text-slate-400">{BASKET_COMPOSITION[key]}</span>
                <span className="text-sm font-semibold text-slate-900">{tInvest(`baskets.${key}.rate`)}</span>
                {signal !== null && (
                  <span
                    className={`flex items-center gap-1 text-xs font-medium tabular-nums ${
                      isUp ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {isUp ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                    {formatPercent(signal)} {t("basketsTodaySuffix")}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
