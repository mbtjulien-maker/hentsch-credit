import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AcceptedCurrency, Prisma } from '@prisma/client';
import {
  ExchangeRateUnavailableException,
  MarketDataUnavailableException,
} from '../common/exceptions/market-data.exceptions';
import {
  COINMARKETCAP_SLUGS,
  HISTORY_CACHE_TTL_MS,
  HISTORY_PERIOD_DAYS,
  INDICATIVE_TARGET_APY_PCT,
  INDUSTRIAL_RWA_CURRENCIES,
  MARKET_OVERVIEW_SLUGS,
  METADATA_CACHE_TTL_MS,
  PEGGED_CURRENCIES,
  PRICE_CACHE_TTL_MS,
  YIELD_ELIGIBLE_CURRENCIES,
} from './market-data.constants';

const CMC_API_BASE = 'https://pro-api.coinmarketcap.com';

// Forme (partielle) d'un élément de /v2/cryptocurrency/quotes/latest — un objet par
// actif, avec un sous-objet par devise de conversion demandée. Le plan gratuit
// CoinMarketCap ("Basic") limite chaque appel à UNE SEULE devise de conversion
// (`error_code 400 "Your plan is limited to 1 convert options"` si on en demande deux) :
// contrairement à l'idée initiale, EUR ne peut donc pas être demandé dans le même appel
// que USD pour tous les actifs — cf. getEurPerUsd, qui fait un second appel dédié, minimal
// (un seul actif), plutôt que d'élargir cet appel groupé à tous les actifs.
interface CoinMarketCapQuote {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  quote: {
    USD: {
      price: number | null;
      volume_24h: number | null;
      market_cap: number | null;
      percent_change_24h: number | null;
    };
    EUR?: {
      price: number | null;
    };
  };
}

// Forme (partielle) d'un élément de /v2/cryptocurrency/info — métadonnées statiques
// (id numérique, logo) qui ne changent essentiellement jamais, résolues séparément des
// prix (cf. METADATA_CACHE_TTL_MS) car cet endpoint ne renvoie pas de cours.
interface CoinMarketCapInfo {
  id: number;
  slug: string;
  logo: string;
}

interface AssetMetadata {
  id: number;
  logo: string;
}

// Forme (partielle) d'un point de /v3/cryptocurrency/quotes/historical.
interface CoinMarketCapHistoricalQuote {
  timestamp: string;
  quote: { USD: { price: number | null } };
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
  volume24h: Prisma.Decimal | null;
  marketCap: Prisma.Decimal | null;
}

interface MarketCache {
  items: Map<string, CoinMarketCapQuote>;
  fetchedAt: number;
}

interface MetadataCache {
  bySlug: Map<string, AssetMetadata>;
  fetchedAt: number;
}

interface FxCache {
  eurPerUsd: Prisma.Decimal;
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

interface HistoryCacheEntry {
  entry: AssetHistoryEntry;
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

const ALL_SLUGS = [
  ...Object.values(COINMARKETCAP_SLUGS),
  ...Object.keys(MARKET_OVERVIEW_SLUGS),
];

// Données de marché en direct (API CoinMarketCap, clé Basic gratuite requise — cf.
// COINMARKETCAP_API_KEY dans .env.example) : actifs acceptés en garantie + cryptos
// majeures, avec les statistiques usuelles d'une plateforme d'échange (variation 24h,
// volume, capitalisation). Remplace l'ancienne intégration CoinGecko (décision produit :
// rendu plus sobre, attribution texte seule au lieu d'un badge logo obligatoire) — deux
// champs perdus dans l'échange, documentés et acceptés au moment de la migration :
// pas de plus haut/bas 24h (absent de /quotes/latest côté CoinMarketCap, seulement
// disponible via un endpoint OHLCV séparé) et pas de mini-graphique 7 jours (aucun champ
// sparkline documenté dans l'API publique CoinMarketCap).
@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);
  private cache: MarketCache | null = null;
  private metadataCache: MetadataCache | null = null;
  private historyCache = new Map<AcceptedCurrency, HistoryCacheEntry>();
  private fxCache: FxCache | null = null;

  // configService optionnel uniquement pour permettre `new MarketDataService()` dans les
  // tests unitaires (cf. market-data.service.spec.ts) sans mock complet de la DI Nest ;
  // en usage réel, Nest l'injecte toujours (cf. MarketDataModule).
  constructor(@Optional() private readonly configService?: ConfigService) {}

  private get apiKey(): string | undefined {
    return (
      this.configService?.get<string>('COINMARKETCAP_API_KEY') || undefined
    );
  }

  private authHeaders(): Record<string, string> {
    return this.apiKey ? { 'X-CMC_PRO_API_KEY': this.apiKey } : {};
  }

  // Historique de prix sur 12 mois pour les actifs générateurs de rendement (cf.
  // AssetHistoryEntry) — un appel CoinMarketCap par actif (pas de endpoint multi-actifs
  // pour quotes/historical). Mis en cache PAR ACTIF (Map), pas par lot : ce point vient
  // d'un bug corrigé — l'ancien cache stockait un seul tableau `entries` pour le dernier
  // appel reçu, partagé entre TOUS les appelants. Deux appelants avec des listes
  // différentes (ex. la vitrine "/rendement" avec 4 actifs vs le simulateur de crédit
  // client avec les 8 actifs éligibles au rendement, cf. YIELD_ELIGIBLE_CURRENCIES) se
  // volaient mutuellement le cache : le second appelant à écrire imposait sa liste à
  // l'autre jusqu'à expiration (6h), qui recevait alors soit des actifs manquants, soit
  // des actifs en trop, sans qu'aucune erreur ne le signale. Le cache par actif élimine
  // ce risque par construction et, en prime, mutualise les actifs communs aux deux appels
  // plutôt que de les refetcher deux fois.
  //
  // Une panne sur un actif ne bloque pas les autres : il revient simplement avec des
  // points vides plutôt que de faire échouer tout l'appel (même logique de dégradation
  // gracieuse que getMarketItems).
  async getYieldAssetHistory(
    currencies: AcceptedCurrency[],
  ): Promise<AssetHistoryEntry[]> {
    const metadata = await this.getAssetMetadata();
    const now = Date.now();
    const entries: AssetHistoryEntry[] = [];

    for (const currency of currencies) {
      const cached = this.historyCache.get(currency);
      if (cached && now - cached.fetchedAt < HISTORY_CACHE_TTL_MS) {
        entries.push(cached.entry);
        continue;
      }

      let entry: AssetHistoryEntry;
      try {
        const series = await this.fetchDailyHistory(currency, metadata);
        const values = series.map((p) => p.usd);
        const first = values[0];
        const last = values[values.length - 1];
        entry = {
          currency,
          periodDays: HISTORY_PERIOD_DAYS,
          points: downsample(series, 60),
          changePct:
            typeof first === 'number' && first !== 0
              ? ((last - first) / first) * 100
              : null,
          highUsd: values.length ? Math.max(...values) : null,
          lowUsd: values.length ? Math.min(...values) : null,
        };
      } catch (error) {
        this.logger.warn(
          `Échec de récupération de l'historique pour ${currency} : ${(error as Error).message}`,
        );
        entry = {
          currency,
          periodDays: HISTORY_PERIOD_DAYS,
          points: [],
          changePct: null,
          highUsd: null,
          lowUsd: null,
        };
      }

      this.historyCache.set(currency, { entry, fetchedAt: now });
      entries.push(entry);
    }

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
    try {
      const metadata = await this.getAssetMetadata();
      const series = await this.fetchDailyHistory(currency, metadata);
      const values = series.map((p) => p.usd);
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
    const [items, metadata] = await Promise.all([
      this.getMarketItems(),
      this.getAssetMetadata(),
    ]);
    const entries: MarketOverviewEntry[] = [];

    // Actifs acceptés d'abord (ordre stable, indépendant du classement CoinMarketCap).
    for (const [currency, slug] of Object.entries(COINMARKETCAP_SLUGS) as [
      AcceptedCurrency,
      string,
    ][]) {
      entries.push(
        this.toEntry(slug, items.get(slug), metadata.get(slug), currency),
      );
    }
    for (const slug of Object.keys(MARKET_OVERVIEW_SLUGS)) {
      entries.push(
        this.toEntry(slug, items.get(slug), metadata.get(slug), null),
      );
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
    const price = items.get(COINMARKETCAP_SLUGS[currency])?.quote.USD.price;
    if (typeof price !== 'number') {
      throw new MarketDataUnavailableException(currency);
    }
    return new Prisma.Decimal(price);
  }

  // Taux de change EUR/USD en direct — dérivé du prix du Tether (USDT) exprimé en USD
  // (déjà disponible via le cache principal, cf. getMarketItems) et en EUR (un second
  // appel minimal, un seul actif). Idée initiale abandonnée : demander USD et EUR en un
  // seul appel `convert=USD,EUR` pour tous les actifs — le plan gratuit CoinMarketCap
  // limite chaque appel à une seule devise de conversion (error_code 400 "Your plan is
  // limited to 1 convert options" sinon), cf. commentaire sur CoinMarketCapQuote. Mis en
  // cache séparément (cf. FxCache) avec la même dégradation gracieuse (stale-if-error) que
  // le reste du service. Utilisé pour convertir le crédit émis (USD) dans la devise
  // choisie par le client (§ structure de taux).
  async getEurPerUsd(): Promise<Prisma.Decimal> {
    if (
      this.fxCache &&
      Date.now() - this.fxCache.fetchedAt < PRICE_CACHE_TTL_MS
    ) {
      return this.fxCache.eurPerUsd;
    }

    try {
      const items = await this.getMarketItems();
      const usdValue = items.get(COINMARKETCAP_SLUGS.USDT)?.quote.USD.price;

      const url = `${CMC_API_BASE}/v2/cryptocurrency/quotes/latest?slug=${COINMARKETCAP_SLUGS.USDT}&convert=EUR`;
      const response = await fetch(url, {
        headers: this.authHeaders(),
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) {
        throw new Error(`CoinMarketCap a répondu ${response.status}`);
      }
      const payload = (await response.json()) as { data: unknown };
      const records = (
        Array.isArray(payload.data)
          ? payload.data
          : Object.values(payload.data ?? {})
      ) as CoinMarketCapQuote[];
      const eurValue = records[0]?.quote.EUR?.price;

      if (
        typeof usdValue !== 'number' ||
        typeof eurValue !== 'number' ||
        usdValue === 0
      ) {
        throw new Error('taux de change incomplet');
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
    slug: string,
    item: CoinMarketCapQuote | undefined,
    meta: AssetMetadata | undefined,
    currency: AcceptedCurrency | null,
  ): MarketOverviewEntry {
    const fallback = MARKET_OVERVIEW_SLUGS[slug];
    const decimal = (n: number | null | undefined) =>
      typeof n === 'number' ? new Prisma.Decimal(n) : null;
    const usd = item?.quote.USD;

    return {
      id: slug,
      symbol:
        item?.symbol?.toUpperCase() ?? fallback?.symbol ?? slug.toUpperCase(),
      name: item?.name ?? fallback?.name ?? slug,
      image: meta?.logo ?? '',
      currency,
      isAcceptedForCredit: currency !== null,
      isPegged: currency !== null && PEGGED_CURRENCIES.has(currency),
      isYieldEligible:
        currency !== null && YIELD_ELIGIBLE_CURRENCIES.has(currency),
      targetApyRangePct:
        currency !== null && INDUSTRIAL_RWA_CURRENCIES.has(currency)
          ? INDICATIVE_TARGET_APY_PCT
          : null,
      usdPrice: decimal(usd?.price ?? null),
      change24hPct: usd?.percent_change_24h ?? null,
      volume24h: decimal(usd?.volume_24h ?? null),
      marketCap: decimal(usd?.market_cap ?? null),
    };
  }

  private async getMarketItems(): Promise<Map<string, CoinMarketCapQuote>> {
    if (this.cache && Date.now() - this.cache.fetchedAt < PRICE_CACHE_TTL_MS) {
      return this.cache.items;
    }

    const url = `${CMC_API_BASE}/v2/cryptocurrency/quotes/latest?slug=${ALL_SLUGS.join(',')}&convert=USD`;

    let payload: { data: unknown };
    try {
      const response = await fetch(url, {
        headers: this.authHeaders(),
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) {
        throw new Error(`CoinMarketCap a répondu ${response.status}`);
      }
      payload = (await response.json()) as { data: unknown };
    } catch (error) {
      this.logger.warn(
        `Échec de récupération des données de marché CoinMarketCap : ${(error as Error).message}`,
      );
      // Stale-if-error : on préfère des données légèrement périmées à une panne totale.
      return this.cache?.items ?? new Map();
    }

    // La réponse /v2 est un objet indexé par id numérique (pas par slug) ; Object.values
    // s'en affranchit et fonctionne aussi si l'API renvoyait un tableau, sans code
    // séparé selon la forme exacte.
    const records = (
      Array.isArray(payload.data)
        ? payload.data
        : Object.values(payload.data ?? {})
    ) as CoinMarketCapQuote[];

    const items = new Map<string, CoinMarketCapQuote>(
      records.map((item) => [item.slug, item]),
    );
    this.cache = { items, fetchedAt: Date.now() };
    return items;
  }

  // Métadonnées statiques (id numérique + logo) par actif — résolues via
  // /v2/cryptocurrency/info (le seul endpoint acceptant un slug pour cette information ;
  // /quotes/historical n'accepte qu'un id ou un symbole, cf. fetchDailyHistory) et mises
  // en cache beaucoup plus longtemps que les prix (cf. METADATA_CACHE_TTL_MS) : un logo ou
  // un id CoinMarketCap ne change essentiellement jamais.
  private async getAssetMetadata(): Promise<Map<string, AssetMetadata>> {
    if (
      this.metadataCache &&
      Date.now() - this.metadataCache.fetchedAt < METADATA_CACHE_TTL_MS
    ) {
      return this.metadataCache.bySlug;
    }

    const url = `${CMC_API_BASE}/v2/cryptocurrency/info?slug=${ALL_SLUGS.join(',')}`;

    let payload: { data: unknown };
    try {
      const response = await fetch(url, {
        headers: this.authHeaders(),
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) {
        throw new Error(`CoinMarketCap a répondu ${response.status}`);
      }
      payload = (await response.json()) as { data: unknown };
    } catch (error) {
      this.logger.warn(
        `Échec de récupération des métadonnées CoinMarketCap (logos) : ${(error as Error).message}`,
      );
      return this.metadataCache?.bySlug ?? new Map();
    }

    const records = (
      Array.isArray(payload.data)
        ? payload.data
        : Object.values(payload.data ?? {})
    ) as CoinMarketCapInfo[];

    const bySlug = new Map<string, AssetMetadata>(
      records.map((info) => [info.slug, { id: info.id, logo: info.logo }]),
    );
    this.metadataCache = { bySlug, fetchedAt: Date.now() };
    return bySlug;
  }

  // Appel + parsing partagés entre getYieldAssetHistory (365 points sous-échantillonnés)
  // et getDailyReturnSeries (365 variations journalières, sans sous-échantillonnage) —
  // seule la mise en forme du résultat diffère entre les deux appelants. Nécessite l'id
  // numérique CoinMarketCap de l'actif (résolu via `metadata`, cf. getAssetMetadata) :
  // contrairement à /quotes/latest et /info, /quotes/historical n'accepte pas de slug.
  private async fetchDailyHistory(
    currency: AcceptedCurrency,
    metadata: Map<string, AssetMetadata>,
  ): Promise<AssetHistoryPoint[]> {
    const slug = COINMARKETCAP_SLUGS[currency];
    const id = metadata.get(slug)?.id;
    if (!id) {
      throw new Error(`id CoinMarketCap introuvable pour le slug "${slug}"`);
    }

    const timeEnd = new Date();
    const timeStart = new Date(
      timeEnd.getTime() - HISTORY_PERIOD_DAYS * 24 * 60 * 60 * 1000,
    );
    const params = new URLSearchParams({
      id: String(id),
      time_start: timeStart.toISOString().slice(0, 10),
      time_end: timeEnd.toISOString().slice(0, 10),
      interval: 'daily',
      convert: 'USD',
    });

    const response = await fetch(
      `${CMC_API_BASE}/v3/cryptocurrency/quotes/historical?${params.toString()}`,
      { headers: this.authHeaders(), signal: AbortSignal.timeout(8000) },
    );
    if (!response.ok) {
      throw new Error(`CoinMarketCap a répondu ${response.status}`);
    }
    const payload = (await response.json()) as { data: unknown };

    // Même précaution défensive que getMarketItems/getAssetMetadata : un seul actif
    // demandé par appel, donc un seul enregistrement quelle que soit sa forme exacte
    // (objet indexé par id ou tableau).
    const records = (
      Array.isArray(payload.data)
        ? payload.data
        : Object.values(payload.data ?? {})
    ) as { quotes: CoinMarketCapHistoricalQuote[] }[];

    const quotes = records[0]?.quotes ?? [];
    return quotes
      .filter((q) => typeof q.quote.USD.price === 'number')
      .map((q) => ({
        t: new Date(q.timestamp).getTime(),
        usd: q.quote.USD.price as number,
      }));
  }
}
