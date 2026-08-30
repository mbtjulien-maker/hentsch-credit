import { Injectable, Logger } from '@nestjs/common';
import { AcceptedCurrency, Prisma } from '@prisma/client';
import {
  ExchangeRateUnavailableException,
  MarketDataUnavailableException,
} from '../common/exceptions/market-data.exceptions';
import {
  COINGECKO_IDS,
  HISTORY_CACHE_TTL_MS,
  HISTORY_PERIOD_DAYS,
  INDICATIVE_TARGET_APY_PCT,
  INDUSTRIAL_RWA_CURRENCIES,
  MARKET_OVERVIEW_IDS,
  PEGGED_CURRENCIES,
  PRICE_CACHE_TTL_MS,
  YIELD_ELIGIBLE_CURRENCIES,
} from './market-data.constants';

interface CoinGeckoMarketItem {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number | null;
  market_cap: number | null;
  total_volume: number | null;
  high_24h: number | null;
  low_24h: number | null;
  price_change_percentage_24h: number | null;
  sparkline_in_7d?: { price: number[] };
}

export interface MarketOverviewEntry {
  id: string;
  symbol: string;
  name: string;
  image: string;
  currency: AcceptedCurrency | null;
  isAcceptedForCredit: boolean;
  // Valorisé 1:1 USD dans le moteur de crédit, indépendamment du prix de marché réel
  // affiché ici (décision produit — cf. §2A).
  isPegged: boolean;
  // Génère un remboursement automatique du crédit par sa plus-value réelle, plafonné à
  // 60% du crédit émis (cf. CollateralYieldService, YIELD_REPAYMENT_CAP_PCT) — jamais
  // vrai pour un stablecoin (aucune plus-value possible, y compris USDT/USDC).
  isYieldEligible: boolean;
  // Objectif de rendement indicatif de la stratégie de trésorerie de la banque sur cet
  // actif (cf. INDICATIVE_TARGET_APY_PCT) — non null uniquement pour les métaux
  // industriels/matières premières tokenisés (INDUSTRIAL_RWA_CURRENCIES). Toujours un
  // objectif indicatif de la banque sur sa propre stratégie, jamais une garantie ni un
  // taux appliqué au calcul du crédit du client.
  targetApyRangePct: { min: number; max: number } | null;
  usdPrice: Prisma.Decimal | null;
  change24hPct: number | null;
  high24h: Prisma.Decimal | null;
  low24h: Prisma.Decimal | null;
  volume24h: Prisma.Decimal | null;
  marketCap: Prisma.Decimal | null;
  sparkline7d: number[];
}

interface MarketCache {
  items: Map<string, CoinGeckoMarketItem>;
  fetchedAt: number;
}

export interface AssetHistoryPoint {
  t: number;
  usd: number;
}

// Historique de prix sur HISTORY_PERIOD_DAYS jours pour un actif éligible au rendement
// (cf. page /rendement) — affiché comme "performance sur 12 mois", jamais "depuis le
// lancement" (cf. HISTORY_PERIOD_DAYS). `points` est sous-échantillonné pour rester léger
// à transporter/tracer (cf. downsample ci-dessous) ; `changePct`/`highUsd`/`lowUsd` sont
// calculés sur la série complète avant sous-échantillonnage, pour rester exacts.
export interface AssetHistoryEntry {
  currency: AcceptedCurrency;
  periodDays: number;
  points: AssetHistoryPoint[];
  changePct: number | null;
  highUsd: number | null;
  lowUsd: number | null;
}

interface HistoryCache {
  entries: AssetHistoryEntry[];
  fetchedAt: number;
}

// Ramène une série à au plus `target` points (premier et dernier toujours conservés) —
// suffisant pour un tracé lisible sur une carte de taille modeste, sans renvoyer 365
// points bruts par actif à chaque appel.
function downsample<T>(series: T[], target: number): T[] {
  if (series.length <= target) return series;
  const step = (series.length - 1) / (target - 1);
  const result: T[] = [];
  for (let i = 0; i < target; i++) {
    result.push(series[Math.round(i * step)]);
  }
  return result;
}

interface FxCache {
  eurPerUsd: Prisma.Decimal;
  fetchedAt: number;
}

const ALL_IDS = [
  ...Object.values(COINGECKO_IDS),
  ...Object.keys(MARKET_OVERVIEW_IDS),
];

// Données de marché en direct (API publique CoinGecko, sans clé) : actifs acceptés en
// garantie + cryptos majeures, avec les statistiques usuelles d'une plateforme d'échange
// (variation 24h, plus haut/bas, volume, capitalisation, tendance 7 jours).
@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);
  private cache: MarketCache | null = null;
  private fxCache: FxCache | null = null;
  private historyCache: HistoryCache | null = null;

  // Historique de prix sur 12 mois pour les actifs générateurs de rendement affichés sur
  // la page /rendement (cf. AssetHistoryEntry) — un appel CoinGecko par actif (pas de
  // endpoint multi-actifs pour /market_chart), donc mis en cache plus longtemps que le
  // reste du service (cf. HISTORY_CACHE_TTL_MS). Une panne sur un actif ne bloque pas les
  // autres : il revient simplement avec des points vides plutôt que de faire échouer tout
  // l'appel (même logique de dégradation gracieuse que getMarketItems).
  async getYieldAssetHistory(
    currencies: AcceptedCurrency[],
  ): Promise<AssetHistoryEntry[]> {
    if (
      this.historyCache &&
      Date.now() - this.historyCache.fetchedAt < HISTORY_CACHE_TTL_MS
    ) {
      return this.historyCache.entries;
    }

    const entries: AssetHistoryEntry[] = [];
    for (const currency of currencies) {
      const id = COINGECKO_IDS[currency];
      try {
        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${HISTORY_PERIOD_DAYS}`,
          { signal: AbortSignal.timeout(8000) },
        );
        if (!response.ok) {
          throw new Error(`CoinGecko a répondu ${response.status}`);
        }
        const payload = (await response.json()) as {
          prices: [number, number][];
        };
        const series = payload.prices.map(([t, usd]) => ({ t, usd }));
        const values = series.map((p) => p.usd);
        const first = values[0];
        const last = values[values.length - 1];
        entries.push({
          currency,
          periodDays: HISTORY_PERIOD_DAYS,
          points: downsample(series, 60),
          changePct:
            typeof first === 'number' && first !== 0
              ? ((last - first) / first) * 100
              : null,
          highUsd: values.length ? Math.max(...values) : null,
          lowUsd: values.length ? Math.min(...values) : null,
        });
      } catch (error) {
        this.logger.warn(
          `Échec de récupération de l'historique pour ${currency} : ${(error as Error).message}`,
        );
        entries.push({
          currency,
          periodDays: HISTORY_PERIOD_DAYS,
          points: [],
          changePct: null,
          highUsd: null,
          lowUsd: null,
        });
      }
    }

    this.historyCache = { entries, fetchedAt: Date.now() };
    return entries;
  }

  // Série de variations journalières (%) sur 365 jours pour UN actif — utilisée
  // exclusivement par TreasuryBotService.backfillHistory pour reconstituer un historique
  // de simulation ancré sur de vraies variations de marché plutôt que sur des données
  // fabriquées. Volontairement séparée de getYieldAssetHistory (granularité et cache
  // différents : ici pas de sous-échantillonnage car chaque jour doit produire une
  // variation, et pas de cache car appelée rarement, à la demande). Retourne un tableau
  // vide en cas d'échec (dégradation gracieuse, cf. logique similaire ailleurs dans ce
  // service) plutôt que de faire échouer tout le backfill pour un seul actif indisponible.
  async getDailyReturnSeries(currency: AcceptedCurrency): Promise<number[]> {
    const id = COINGECKO_IDS[currency];
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${HISTORY_PERIOD_DAYS}`,
        { signal: AbortSignal.timeout(8000) },
      );
      if (!response.ok) {
        throw new Error(`CoinGecko a répondu ${response.status}`);
      }
      const payload = (await response.json()) as { prices: [number, number][] };
      const values = payload.prices.map(([, usd]) => usd);
      const returns: number[] = [];
      for (let i = 1; i < values.length; i++) {
        const prev = values[i - 1];
        returns.push(prev !== 0 ? ((values[i] - prev) / prev) * 100 : 0);
      }
      return returns;
    } catch (error) {
      this.logger.warn(
        `Échec de récupération des variations journalières pour ${currency} : ${(error as Error).message}`,
      );
      return [];
    }
  }

  async getMarketOverview(): Promise<MarketOverviewEntry[]> {
    const items = await this.getMarketItems();
    const entries: MarketOverviewEntry[] = [];

    // Actifs acceptés d'abord (ordre stable, indépendant du classement CoinGecko).
    for (const [currency, id] of Object.entries(COINGECKO_IDS) as [
      AcceptedCurrency,
      string,
    ][]) {
      entries.push(this.toEntry(id, items.get(id), currency));
    }
    for (const id of Object.keys(MARKET_OVERVIEW_IDS)) {
      entries.push(this.toEntry(id, items.get(id), null));
    }

    return entries;
  }

  // Convertit une quantité de token en USD pour le moteur de crédit. 1:1 pour les
  // stablecoins ; prix spot en direct pour l'or. Lève une exception plutôt que de
  // retomber silencieusement sur une estimation si le prix de l'or est indisponible.
  async getUsdValue(
    currency: AcceptedCurrency,
    tokenAmount: Prisma.Decimal,
  ): Promise<Prisma.Decimal> {
    const price = await this.getSpotPriceUsd(currency);
    return tokenAmount.times(price);
  }

  // Prix spot en direct d'une unité de l'actif, en USD — 1 pour les stablecoins (pegged),
  // cours de marché en direct pour l'or (PAXG/XAUT). Réutilisé par getUsdValue
  // (conversion d'un dépôt) et par CollateralYieldService (capture du prix d'entrée au
  // verrouillage, puis ré-évaluation périodique pour le rendement indexé sur la
  // performance réelle du gage, cf. credit-engine.service.ts).
  async getSpotPriceUsd(currency: AcceptedCurrency): Promise<Prisma.Decimal> {
    if (PEGGED_CURRENCIES.has(currency)) {
      return new Prisma.Decimal(1);
    }

    const items = await this.getMarketItems();
    const price = items.get(COINGECKO_IDS[currency])?.current_price;
    if (typeof price !== 'number') {
      throw new MarketDataUnavailableException(currency);
    }
    return new Prisma.Decimal(price);
  }

  // Taux de change EUR/USD en direct (API publique CoinGecko /exchange_rates — même
  // source que le reste du service, "au pire les mêmes taux qu'une plateforme d'échange
  // comme OKX" : dérivé du prix du Bitcoin dans chaque devise, technique standard pour
  // obtenir un taux fiat/fiat sans dépendre d'une API forex dédiée). Utilisé pour
  // convertir le crédit émis (USD) dans la devise choisie par le client (§ structure de taux).
  async getEurPerUsd(): Promise<Prisma.Decimal> {
    if (
      this.fxCache &&
      Date.now() - this.fxCache.fetchedAt < PRICE_CACHE_TTL_MS
    ) {
      return this.fxCache.eurPerUsd;
    }

    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/exchange_rates',
        {
          signal: AbortSignal.timeout(8000),
        },
      );
      if (!response.ok) {
        throw new Error(`CoinGecko a répondu ${response.status}`);
      }
      const payload = (await response.json()) as {
        rates: Record<string, { value: number }>;
      };
      const usdValue = payload.rates.usd?.value;
      const eurValue = payload.rates.eur?.value;
      if (
        typeof usdValue !== 'number' ||
        typeof eurValue !== 'number' ||
        usdValue === 0
      ) {
        throw new Error('réponse CoinGecko incomplète');
      }

      const eurPerUsd = new Prisma.Decimal(eurValue).dividedBy(usdValue);
      this.fxCache = { eurPerUsd, fetchedAt: Date.now() };
      return eurPerUsd;
    } catch (error) {
      this.logger.warn(
        `Échec de récupération du taux de change EUR/USD : ${(error as Error).message}`,
      );
      // Stale-if-error : on préfère un taux légèrement périmé à une panne totale.
      if (this.fxCache) {
        return this.fxCache.eurPerUsd;
      }
      throw new ExchangeRateUnavailableException();
    }
  }

  private toEntry(
    id: string,
    item: CoinGeckoMarketItem | undefined,
    currency: AcceptedCurrency | null,
  ): MarketOverviewEntry {
    const fallback = MARKET_OVERVIEW_IDS[id];
    const decimal = (n: number | null | undefined) =>
      typeof n === 'number' ? new Prisma.Decimal(n) : null;

    return {
      id,
      symbol:
        item?.symbol?.toUpperCase() ?? fallback?.symbol ?? id.toUpperCase(),
      name: item?.name ?? fallback?.name ?? id,
      image: item?.image ?? '',
      currency,
      isAcceptedForCredit: currency !== null,
      isPegged: currency !== null && PEGGED_CURRENCIES.has(currency),
      isYieldEligible:
        currency !== null && YIELD_ELIGIBLE_CURRENCIES.has(currency),
      targetApyRangePct:
        currency !== null && INDUSTRIAL_RWA_CURRENCIES.has(currency)
          ? INDICATIVE_TARGET_APY_PCT
          : null,
      usdPrice: decimal(item?.current_price ?? null),
      change24hPct: item?.price_change_percentage_24h ?? null,
      high24h: decimal(item?.high_24h ?? null),
      low24h: decimal(item?.low_24h ?? null),
      volume24h: decimal(item?.total_volume ?? null),
      marketCap: decimal(item?.market_cap ?? null),
      sparkline7d: item?.sparkline_in_7d?.price ?? [],
    };
  }

  private async getMarketItems(): Promise<Map<string, CoinGeckoMarketItem>> {
    if (this.cache && Date.now() - this.cache.fetchedAt < PRICE_CACHE_TTL_MS) {
      return this.cache.items;
    }

    const url =
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ALL_IDS.join(',')}` +
      `&sparkline=true&price_change_percentage=24h`;

    let payload: CoinGeckoMarketItem[];
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) {
        throw new Error(`CoinGecko a répondu ${response.status}`);
      }
      payload = (await response.json()) as CoinGeckoMarketItem[];
    } catch (error) {
      this.logger.warn(
        `Échec de récupération des données de marché CoinGecko : ${(error as Error).message}`,
      );
      // Stale-if-error : on préfère des données légèrement périmées à une panne totale.
      return this.cache?.items ?? new Map();
    }

    const items = new Map<string, CoinGeckoMarketItem>(
      payload.map((item) => [item.id, item]),
    );
    this.cache = { items, fetchedAt: Date.now() };
    return items;
  }
}
