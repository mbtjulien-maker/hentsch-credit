import { AcceptedCurrency } from '@prisma/client';
import { Prisma } from '@prisma/client';

// SIMULATION UNIQUEMENT — aucun ordre réel n'est jamais passé, aucun fonds ne bouge.
// Panier d'actifs dont la variation quotidienne moyenne sert de "signal de marché" au
// calcul du rendement simulé (cf. TreasuryBotService) — les 4 métaux industriels/matières
// premières tokenisés de la feuille de route RWA (cf. INDUSTRIAL_RWA_CURRENCIES).
export const TREASURY_BOT_BASKET: AcceptedCurrency[] = [
  'XPT',
  'XPD',
  'XCU',
  'WTI',
];

// Capital notionnel simulé — reprend l'exemple chiffré déjà publié sur /strategie-rwa
// (étude de cas "10 M$ sur le Platine") pour rester cohérent avec ce que le client voit.
export const NOTIONAL_CAPITAL_USD = new Prisma.Decimal('10000000');

// Objectif annuel (%) au centre de la fourchette indicative de chaque pilier (cf.
// INDICATIVE_TARGET_APY_PCT côté market-data, et RwaStrategySection côté frontend) — sert
// de rendement de référence ("au repos", sans mouvement de marché) auquel s'ajoute la
// contribution du signal de marché réel du jour.
export const PILLAR_TARGET_APY_PCT = {
  A: new Prisma.Decimal('5.5'), // Arbitrage Cash & Carry : 4 à 7%
  B: new Prisma.Decimal('8.25'), // Collatéralisation & prêt triangulaire : 6,5 à 10%
  C: new Prisma.Decimal('12'), // Apport de liquidité sélectionné : 9 à 15%
} as const;

// Sensibilité de chaque pilier à la variation quotidienne réelle du panier RWA —
// croissante de A à C, reflet du risque croissant décrit dans la feuille de route
// (couverture neutre au prix -> effet de levier modéré -> exposition de market making).
export const PILLAR_MARKET_SENSITIVITY = {
  A: new Prisma.Decimal('0.05'),
  B: new Prisma.Decimal('0.15'),
  C: new Prisma.Decimal('0.35'),
} as const;
