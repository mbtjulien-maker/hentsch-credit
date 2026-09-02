import { Prisma } from '@prisma/client';

// Rendement de dividende annuel indicatif PAR TICKER — approximation éditoriale du
// rendement de dividende réel de chaque titre (comme STOCK_SUB_BASKETS[basket]
// .dividendYieldPct, mais à la maille du ticker plutôt que du panier, pour pouvoir
// composer librement des paniers "plan à échéance fixe" qui mélangent des tickers de
// paniers différents, cf. FIXED_TERM_PLANS). Jamais une donnée de marché en direct
// (Finnhub ne fournit pas de rendement de dividende sur le plan gratuit).
export const TICKER_DIVIDEND_YIELD_PCT: Record<string, Prisma.Decimal> = {
  KO: new Prisma.Decimal('3.0'),
  PG: new Prisma.Decimal('2.4'),
  JNJ: new Prisma.Decimal('3.0'),
  'BRK.B': new Prisma.Decimal('0'),
  MSFT: new Prisma.Decimal('0.7'),
  AAPL: new Prisma.Decimal('0.5'),
  LLY: new Prisma.Decimal('0.7'),
  AMZN: new Prisma.Decimal('0'),
  NVDA: new Prisma.Decimal('0.03'),
  AVGO: new Prisma.Decimal('1.3'),
  META: new Prisma.Decimal('0.35'),
  GOOGL: new Prisma.Decimal('0.45'),
  MU: new Prisma.Decimal('0.45'),
  SNDK: new Prisma.Decimal('0'),
  DELL: new Prisma.Decimal('1.6'),
  PLTR: new Prisma.Decimal('0'),
};

// Plans d'investissement à échéance fixe (cf. §2H CLAUDE.md, entrée #29) — un DEUXIÈME
// mode de placement, purement illustratif (aucun dépôt réel, aucun effet sur le ledger),
// distinct des 6 paniers perpétuels (InvestmentPosition/InvestmentBasket) qui restent
// inchangés à côté. Chaque plan combine des tickers déjà couverts par
// TICKER_DIVIDEND_YIELD_PCT et/ou la stratégie RWA (`includesRwa`, qui réutilise
// INDICATIVE_ANNUAL_YIELD_PCT.RWA_STRATEGY et le signal réel de TreasuryBotRun plutôt que
// d'inventer un ticker "RWA-METALS" séparé — le projet ne suit que XPT/XPD/XCU/WTI, cf.
// TREASURY_BOT_BASKET, jamais d'aluminium ou d'énergie générique non intégrés).
//
// `riskScore` est une classification éditoriale (comme RISK_LEVEL), fournie par le
// client et conservée telle quelle. Le rendement affiché (`annualizedPct`/`periodPct`,
// cf. InvestmentService.getFixedTermPlans) N'EST PAS le chiffre fourni par le client —
// celui-ci était saisi à la main (jusqu'à 25%/an), recalculé ici à partir de la moyenne
// des rendements de dividende réels des composants du plan, jamais un objectif garanti.
export const FIXED_TERM_PLANS = {
  TREASURY_3M: {
    horizonMonths: 3,
    riskScore: 2.5,
    tickers: ['KO', 'PG', 'JNJ'] as const,
    includesRwa: true,
  },
  SEMICONDUCTORS_6M: {
    horizonMonths: 6,
    riskScore: 3.5,
    tickers: ['MU', 'SNDK', 'DELL'] as const,
    includesRwa: false,
  },
  CORE_BALANCED_12M: {
    horizonMonths: 12,
    riskScore: 2.0,
    tickers: ['MSFT', 'AAPL', 'LLY', 'BRK.B'] as const,
    includesRwa: false,
  },
  RWA_METALS_12M: {
    horizonMonths: 12,
    riskScore: 2.2,
    tickers: [] as const,
    includesRwa: true,
  },
  AI_MEGACAPS_12M: {
    horizonMonths: 12,
    riskScore: 4.0,
    tickers: ['NVDA', 'AVGO', 'META', 'GOOGL'] as const,
    includesRwa: false,
  },
  ALPHA_MOMENTUM_12M: {
    horizonMonths: 12,
    riskScore: 4.8,
    tickers: ['PLTR', 'DELL', 'MU', 'SNDK'] as const,
    includesRwa: false,
  },
} as const;

export type FixedTermPlanId = keyof typeof FIXED_TERM_PLANS;

export const FIXED_TERM_PLAN_IDS = Object.keys(
  FIXED_TERM_PLANS,
) as FixedTermPlanId[];
