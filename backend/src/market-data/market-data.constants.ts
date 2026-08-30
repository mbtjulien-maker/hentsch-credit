import { AcceptedCurrency } from '@prisma/client';

// Identifiants CoinGecko (API publique, sans clé) pour chaque actif accepté.
export const COINGECKO_IDS: Record<AcceptedCurrency, string> = {
  USDS: 'usds',
  DAI: 'dai',
  USDE: 'ethena-usde',
  PYUSD: 'paypal-usd',
  PAXG: 'pax-gold',
  XAUT: 'tether-gold',
  USDT: 'tether',
  USDC: 'usd-coin',
  // dEURO — stablecoin indexé sur l'euro, PAS 1:1 USD : exclu de PEGGED_CURRENCIES
  // ci-dessous, sa valeur USD est donc recalculée au prix spot CoinGecko (qui reflète
  // déjà la conversion EUR/USD), sans logique dédiée. Volontairement absent de
  // PRECIOUS_METAL_CURRENCIES plus bas : ce set gate spécifiquement le rendement indexé
  // sur la performance des métaux précieux (CollateralYieldService), pas la
  // revalorisation spot en général.
  DEURO: 'decentralized-euro',
  // ETH/SHIB — cryptomonnaies natives, aucun ancrage : comme les métaux précieux,
  // exclues de PEGGED_CURRENCIES, valorisées au prix spot CoinGecko. ETH est éligible au
  // rendement indexé (cf. YIELD_ELIGIBLE_CURRENCIES plus bas) sans faire partie de
  // PRECIOUS_METAL_CURRENCIES (réservé aux métaux) ; SHIB n'est pas éligible (trop volatil).
  ETH: 'ethereum',
  SHIB: 'shiba-inu',
  // KAG — argent tokenisé (Kinesis Silver), même principe que PAXG/XAUT pour l'or :
  // valorisé au cours spot en direct, éligible au rendement indexé.
  KAG: 'kinesis-silver',
  // XPT/XPD/XCU/WTI — métaux industriels et matières premières tokenisés (cf.
  // INDUSTRIAL_RWA_CURRENCIES). CoinGecko ne référence pas de token RWA "pur" pour ces
  // actifs (contrairement à PAXG/XAUT/KAG pour l'or/argent) : on s'appuie sur les
  // enveloppes tokenisées d'ETF physiques/indiciels (Dinari/Ondo), qui répliquent le cours
  // spot de l'actif sous-jacent et disposent d'un historique de prix en direct fiable.
  XPT: 'abrdn-physical-platinum-shares-etf-dinari-tokenized-etf', // Platine physique
  XPD: 'abrdn-physical-palladium-shares-etf-dinari-tokenized-etf', // Palladium physique
  XCU: 'us-copper-index-fund-ondo-tokenized', // Indice cuivre (futures)
  WTI: 'united-states-oil-fund-ondo-tokenized', // Pétrole (WTI, futures)
};

// Actifs valorisés 1:1 en USD dans le ledger (stablecoins indexés sur le dollar), quel
// que soit le prix de marché affiché à titre informatif. Les métaux précieux et DEURO ne
// sont PAS dans cette liste : leur valeur de gage est recalculée au prix spot en direct
// (cf. §2A, décision produit) — DEURO parce qu'il est indexé sur l'euro, pas le dollar.
export const PEGGED_CURRENCIES: ReadonlySet<AcceptedCurrency> = new Set([
  'USDS',
  'DAI',
  'USDE',
  'PYUSD',
  'USDT',
  'USDC',
]);

// Métaux précieux tokenisés — or (PAXG, XAUT) et argent (KAG). Nom volontairement
// générique (pas "GOLD_CURRENCIES") depuis l'ajout de l'argent : toute future extension à
// un autre métal précieux passe par ce set.
export const PRECIOUS_METAL_CURRENCIES: ReadonlySet<AcceptedCurrency> = new Set(
  ['PAXG', 'XAUT', 'KAG'],
);

// Métaux industriels et matières premières tokenisés — Platine (XPT), Palladium (XPD),
// Cuivre (XCU) et pétrole synthétique (WTI). Distinct de PRECIOUS_METAL_CURRENCIES (or et
// argent) : ce set porte spécifiquement les actifs issus de la feuille de route "Stratégie
// d'Investissement & Rendements RWA Métaux" (stratégie de trésorerie propre à la banque —
// arbitrage cash & carry, collatéralisation DeFi, market making), auxquels s'ajoute un
// objectif de rendement indicatif propre à la banque (cf. INDICATIVE_TARGET_APY_PCT),
// sans effet sur le calcul du crédit du client (même mécanique de plus-value que les
// autres actifs éligibles au rendement, cf. YIELD_ELIGIBLE_CURRENCIES ci-dessous).
export const INDUSTRIAL_RWA_CURRENCIES: ReadonlySet<AcceptedCurrency> = new Set(
  ['XPT', 'XPD', 'XCU', 'WTI'],
);

// Objectif de rendement indicatif de la stratégie de trésorerie de la banque sur les
// actifs INDUSTRIAL_RWA_CURRENCIES (moyenne pondérée des trois piliers de la feuille de
// route : arbitrage cash & carry 4-7% APY, collatéralisation/prêt triangulaire 6.5-10%
// APY, apport de liquidité sélectionné 9-15% APY). Affiché au client à titre indicatif
// uniquement (cf. MarketOverviewEntry.targetApyRangePct) : un objectif de la banque sur sa
// propre stratégie, jamais une garantie, et sans aucun effet sur le crédit du client (qui
// reste régi par le mécanisme réel de plus-value du gage, cf. YIELD_REPAYMENT_CAP_PCT).
export const INDICATIVE_TARGET_APY_PCT: Readonly<{ min: number; max: number }> =
  { min: 8, max: 14 };

// Actifs dont le prix spot bouge réellement, donc capables de générer une plus-value
// exploitable pour un remboursement automatique du crédit (cf. CollateralYieldService) —
// les métaux précieux (PRECIOUS_METAL_CURRENCIES), ETH, et les métaux industriels /
// matières premières tokenisés (INDUSTRIAL_RWA_CURRENCIES). Sur-ensemble de ces deux sets :
// toute future extension de l'éligibilité au rendement passe par ce set. Les stablecoins
// restent 1:1 (aucune plus-value possible, y compris USDT) ; SHIB en est volontairement
// exclu (trop volatil pour asseoir un remboursement récurrent).
export const YIELD_ELIGIBLE_CURRENCIES: ReadonlySet<AcceptedCurrency> = new Set(
  [...PRECIOUS_METAL_CURRENCIES, 'ETH', ...INDUSTRIAL_RWA_CURRENCIES],
);

export const PRICE_CACHE_TTL_MS = 30_000;

// Historique de prix (cf. MarketDataService.getYieldAssetHistory, page /rendement) — 365
// jours est le maximum accessible sans clé API sur le plan public CoinGecko (days > 365
// répond 401) : on l'affiche honnêtement comme "performance sur 12 mois", jamais comme
// "depuis le lancement", que ces actifs soient plus anciens ou non. Cache plus long que
// PRICE_CACHE_TTL_MS : un historique quotidien n'a pas besoin d'être rafraîchi à la minute,
// et cela limite le nombre d'appels à l'API publique (une requête par actif, contrairement
// à getMarketOverview qui couvre tous les actifs en un seul appel).
export const HISTORY_PERIOD_DAYS = 365;
export const HISTORY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

// Cryptos majeures affichées à titre informatif dans la vue "marché" façon plateforme
// d'échange (OKX, Binance…), en plus des actifs acceptés en garantie. Non liées au
// moteur de crédit — purement pour donner au client une vue d'ensemble du marché.
// "ethereum" n'y figure plus : ETH est désormais un actif accepté (cf. COINGECKO_IDS
// ci-dessus) — le lister ici aussi dupliquerait la ligne dans getMarketOverview().
export const MARKET_OVERVIEW_IDS: Record<
  string,
  { symbol: string; name: string }
> = {
  bitcoin: { symbol: 'BTC', name: 'Bitcoin' },
  solana: { symbol: 'SOL', name: 'Solana' },
  binancecoin: { symbol: 'BNB', name: 'BNB' },
  ripple: { symbol: 'XRP', name: 'XRP' },
  cardano: { symbol: 'ADA', name: 'Cardano' },
  dogecoin: { symbol: 'DOGE', name: 'Dogecoin' },
  tron: { symbol: 'TRX', name: 'Tron' },
  'avalanche-2': { symbol: 'AVAX', name: 'Avalanche' },
  chainlink: { symbol: 'LINK', name: 'Chainlink' },
};
