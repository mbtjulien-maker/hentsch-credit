import { Prisma } from '@prisma/client';

// Cinq paniers d'actions cotées réelles pour le produit "investissement direct" (cf. §2H
// CLAUDE.md). STOCKS est le panier d'origine (blue chips à dividende régulier) ; les 4
// autres ont été ajoutés à l'entrée #27 du journal, chacun avec un profil de risque
// distinct — un chevauchement de titres entre STOCKS et STOCKS_CONSERVATIVE (JNJ, PG, KO
// communs aux deux) est assumé, chaque panier reste une sélection indépendante plutôt
// qu'une hiérarchie entre eux.
//
// `dividendYieldPct` : hypothèse de stratégie éditoriale (rendement de dividende annuel
// moyen approximatif des titres du panier), pas une donnée de marché en direct (Finnhub
// ne fournit pas de rendement de dividende en temps réel sur le plan gratuit) — même
// principe que PILLAR_TARGET_APY_PCT pour la stratégie RWA (cf.
// treasury-bot.constants.ts). Combinée à la variation réelle du panier ce jour-là
// (marketSignalPct, cf. StockMarketDataService.getBasketMarketSignal) pour produire le
// rendement quotidien réellement appliqué aux positions de ce panier.
export const STOCK_SUB_BASKETS = {
  STOCKS: {
    tickers: ['AAPL', 'MSFT', 'JNJ', 'PG', 'KO'] as const,
    // Blue chips larges, versant historiquement un dividende régulier.
    dividendYieldPct: new Prisma.Decimal('2.5'),
  },
  STOCKS_CONSERVATIVE: {
    tickers: ['KO', 'JNJ', 'PG', 'BRK.B'] as const,
    // KO/JNJ/PG versent un dividende solide (~2,4-3,1 %) ; BRK.B n'en verse aucun —
    // moyenne des 4, arrondie.
    dividendYieldPct: new Prisma.Decimal('2.1'),
  },
  STOCKS_BALANCED: {
    tickers: ['MSFT', 'AAPL', 'LLY', 'AMZN'] as const,
    // MSFT/AAPL/LLY versent un dividende modeste ; AMZN n'en verse aucun.
    dividendYieldPct: new Prisma.Decimal('0.5'),
  },
  STOCKS_TECH_AI: {
    tickers: ['NVDA', 'AVGO', 'META', 'GOOGL'] as const,
    // AVGO seul verse un dividende notable ; NVDA/META/GOOGL, marginal ou récent.
    dividendYieldPct: new Prisma.Decimal('0.6'),
  },
  STOCKS_MOMENTUM: {
    tickers: ['MU', 'SNDK', 'DELL', 'PLTR'] as const,
    // DELL verse un dividende modeste ; MU marginal ; SNDK/PLTR n'en versent aucun.
    dividendYieldPct: new Prisma.Decimal('0.5'),
  },
} as const;

export type StockSubBasket = keyof typeof STOCK_SUB_BASKETS;

export const STOCK_SUB_BASKET_IDS = Object.keys(
  STOCK_SUB_BASKETS,
) as StockSubBasket[];

export type StockTicker =
  (typeof STOCK_SUB_BASKETS)[StockSubBasket]['tickers'][number];

// Noms affichables — jamais recalculés à partir du ticker, Finnhub ne renvoie pas de nom
// d'entreprise sur l'endpoint /quote du plan gratuit (seulement le cours). Utilisé par
// GET /investment/assets (cf. InvestmentController) pour le détail de chaque panier. Une
// seule table pour tous les paniers : un ticker partagé entre plusieurs paniers (ex. JNJ)
// n'a besoin que d'une entrée.
export const STOCK_NAMES: Record<StockTicker, string> = {
  AAPL: 'Apple',
  MSFT: 'Microsoft',
  JNJ: 'Johnson & Johnson',
  PG: 'Procter & Gamble',
  KO: 'Coca-Cola',
  'BRK.B': 'Berkshire Hathaway',
  LLY: 'Eli Lilly',
  AMZN: 'Amazon',
  NVDA: 'NVIDIA',
  AVGO: 'Broadcom',
  META: 'Meta Platforms',
  GOOGL: 'Alphabet',
  MU: 'Micron Technology',
  SNDK: 'SanDisk',
  DELL: 'Dell Technologies',
  PLTR: 'Palantir Technologies',
};

// Contrairement aux 3 piliers de la stratégie RWA (qui n'exposent le capital notionnel
// qu'à une fraction du signal de marché, via arbitrage/prêt/liquidité — cf.
// PILLAR_MARKET_SENSITIVITY), un investissement direct en actions participe pleinement à
// la variation réelle du panier, quel qu'il soit : sensibilité 1 (pas d'amortissement).
export const STOCK_MARKET_SENSITIVITY = new Prisma.Decimal('1');
