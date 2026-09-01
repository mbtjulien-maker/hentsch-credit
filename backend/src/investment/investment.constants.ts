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
