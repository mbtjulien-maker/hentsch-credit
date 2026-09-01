import { Prisma } from '@prisma/client';

// Panier d'actions cotées réelles pour le produit "investissement direct" (cf. §2H
// CLAUDE.md) — 5 sociétés larges, liquides, versant historiquement un dividende régulier
// ("des actions qui génèrent des revenus", demande explicite) : Apple, Microsoft,
// Johnson & Johnson, Procter & Gamble, Coca-Cola. Choix volontairement conservateur
// (blue chips, pas de small/mid cap) pour limiter la volatilité d'un produit qui reste
// documenté comme "réel mais indicatif" plutôt que couvert par une vraie stratégie de
// sélection active.
export const STOCK_BASKET_TICKERS = [
  'AAPL',
  'MSFT',
  'JNJ',
  'PG',
  'KO',
] as const;

export type StockTicker = (typeof STOCK_BASKET_TICKERS)[number];

// Rendement du dividende annuel indicatif du panier — une hypothèse de stratégie
// (moyenne historique approximative de ce type de panier blue chip), pas une donnée de
// marché en direct (Finnhub ne fournit pas de rendement de dividende en temps réel sur le
// plan gratuit) : affichée au client comme un objectif indicatif, jamais une garantie,
// exactement comme PILLAR_TARGET_APY_PCT pour la stratégie RWA (cf.
// treasury-bot.constants.ts). Combinée à la variation réelle du panier ce jour-là
// (marketSignalPct, cf. StockMarketDataService) pour produire le rendement quotidien
// appliqué aux positions STOCKS.
export const STOCK_BASKET_DIVIDEND_YIELD_PCT = new Prisma.Decimal('2.5');

// Contrairement aux 3 piliers de la stratégie RWA (qui n'exposent le capital notionnel
// qu'à une fraction du signal de marché, via arbitrage/prêt/liquidité — cf.
// PILLAR_MARKET_SENSITIVITY), un investissement direct en actions participe pleinement à
// la variation réelle du panier : sensibilité 1 (pas d'amortissement).
export const STOCK_MARKET_SENSITIVITY = new Prisma.Decimal('1');
