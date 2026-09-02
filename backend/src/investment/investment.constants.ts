import { Prisma } from '@prisma/client';
import { PILLAR_TARGET_APY_PCT } from '../treasury-bot/treasury-bot.constants';
import { STOCK_BASKET_DIVIDEND_YIELD_PCT } from '../stock-market-data/stock-market-data.constants';

// Montant minimum d'un dépôt d'investissement direct — évite les positions "poussière"
// (quelques centimes) qui compliquent l'affichage sans utilité réelle pour le client.
export const MIN_INVESTMENT_AMOUNT_USD = new Prisma.Decimal('10');

// Objectif de rendement annuel indicatif affiché au client avant placement — jamais une
// garantie (même disclaimer que le rendement RWA indicatif du gage, cf. CLAUDE.md §2A),
// simplement une aide à la décision. RWA_STRATEGY reprend la moyenne des 3 piliers déjà
// documentée (8-14% APY, cf. §2A) ; STOCKS reprend le rendement de dividende indicatif du
// panier (cf. STOCK_BASKET_DIVIDEND_YIELD_PCT) — le rendement réellement appliqué inclut
// en plus la variation de marché réelle du jour, qui peut être négative.
export const INDICATIVE_ANNUAL_YIELD_PCT = {
  // Arrondi à 2 décimales pour l'affichage (la division par 3 produit sinon un
  // développement décimal interminable, ex. 8.58333...) — jamais utilisé dans un calcul
  // ultérieur, uniquement affiché au client (cf. GET /investment/rates).
  RWA_STRATEGY: PILLAR_TARGET_APY_PCT.A.plus(PILLAR_TARGET_APY_PCT.B)
    .plus(PILLAR_TARGET_APY_PCT.C)
    .dividedBy(3)
    .toDecimalPlaces(2),
  STOCKS: STOCK_BASKET_DIVIDEND_YIELD_PCT,
} as const;

// Classification indicative du risque (échelle 1-5, jamais un score calculé en direct à
// partir d'une volatilité mesurée — une hypothèse de stratégie éditoriale, comme
// INDICATIVE_ANNUAL_YIELD_PCT, affichée au client avant placement). RWA_STRATEGY combine
// 3 piliers d'amplitude de risque croissante (cf. PILLAR_MARKET_SENSITIVITY,
// treasury-bot.constants.ts) mais reste amortie (sensibilité 0,05 à 0,35 seulement) ;
// STOCKS participe pleinement (sensibilité 1, cf. STOCK_MARKET_SENSITIVITY) à la
// variation réelle d'un panier d'actions, donc plus exposé au jour le jour.
export const RISK_LEVEL: Record<'RWA_STRATEGY' | 'STOCKS', number> = {
  RWA_STRATEGY: 2,
  STOCKS: 4,
};
