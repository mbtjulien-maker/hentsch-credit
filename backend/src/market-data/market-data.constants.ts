import { AcceptedCurrency } from '@prisma/client';

// Slugs CoinMarketCap (API Pro, clé gratuite requise — cf. COINMARKETCAP_API_KEY) pour
// chaque actif accepté. Remplace l'ancienne intégration CoinGecko (identique
// fonctionnellement — mêmes actifs couverts, même logique de dégradation gracieuse dans
// MarketDataService — changée pour son rendu plus sobre : attribution texte seule au lieu
// d'un badge logo obligatoire, cf. décision produit "remplacer CoinGecko par un autre plus
// esthétique"). Slugs vérifiés un par un sur coinmarketcap.com/currencies/<slug>/ avant
// migration, pas devinés : plusieurs diffèrent des identifiants CoinGecko équivalents
// (ex. KAG → "silver", pas "kinesis-silver").
export const COINMARKETCAP_SLUGS: Record<AcceptedCurrency, string> = {
  USDS: 'usds',
  // Piège trouvé en vérifiant en direct après obtention d'une clé API réelle : le slug
  // "dai" tout court résout vers SAI (Single Collateral DAI), un token abandonné
  // remplacé par Multi-Collateral DAI en 2019 — jamais le vrai DAI actuel. Le bon slug
  // CoinMarketCap pour le DAI actuel est "multi-collateral-dai" (symbole toujours "DAI").
  DAI: 'multi-collateral-dai',
  USDE: 'ethena-usde',
  PYUSD: 'paypal-usd',
  PAXG: 'pax-gold',
  XAUT: 'tether-gold',
  USDT: 'tether',
  USDC: 'usd-coin',
  // dEURO — stablecoin indexé sur l'euro, PAS 1:1 USD : exclu de PEGGED_CURRENCIES
  // ci-dessous, sa valeur USD est donc recalculée au prix spot CoinMarketCap (qui reflète
  // déjà la conversion EUR/USD), sans logique dédiée. Volontairement absent de
  // PRECIOUS_METAL_CURRENCIES plus bas : ce set gate spécifiquement le rendement indexé
  // sur la performance des métaux précieux (CollateralYieldService), pas la
  // revalorisation spot en général.
  DEURO: 'decentralized-euro',
  // ETH/SHIB — cryptomonnaies natives, aucun ancrage : comme les métaux précieux,
  // exclues de PEGGED_CURRENCIES, valorisées au prix spot CoinMarketCap. ETH est éligible
  // au rendement indexé (cf. YIELD_ELIGIBLE_CURRENCIES plus bas) sans faire partie de
  // PRECIOUS_METAL_CURRENCIES (réservé aux métaux) ; SHIB n'est pas éligible (trop volatil).
  ETH: 'ethereum',
  SHIB: 'shiba-inu',
  // KAG — argent tokenisé (Kinesis Silver), même principe que PAXG/XAUT pour l'or :
  // valorisé au cours spot en direct, éligible au rendement indexé. Slug CoinMarketCap
  // "silver" (pas "kinesis-silver" comme sur CoinGecko).
  KAG: 'silver',
  // XPT/XPD/XCU/WTI — métaux industriels et matières premières tokenisés (cf.
  // INDUSTRIAL_RWA_CURRENCIES). Ni CoinGecko ni CoinMarketCap ne référencent de token RWA
  // "pur" pour ces actifs (contrairement à PAXG/XAUT/KAG pour l'or/argent) : on s'appuie
  // sur les enveloppes tokenisées d'ETF physiques/indiciels (Dinari/Ondo), qui répliquent
  // le cours spot de l'actif sous-jacent et disposent d'un historique de prix en direct
  // fiable, listées sur CoinMarketCap sous ces mêmes émetteurs.
  XPT: 'abrdn-physical-platinum-shares-tokenized-etf-dinari', // Platine physique
  XPD: 'abrdn-physical-palladium-shares-tokenized-etf-dinari', // Palladium physique
  // Écart assumé par rapport à l'ancien mapping CoinGecko : CoinGecko référençait un
  // wrapper Ondo sur l'indice futures cuivre pur (US Copper Index Fund / CPER). Aucun
  // équivalent direct trouvé sur CoinMarketCap au moment de la migration ; on utilise à la
  // place le wrapper Ondo sur l'ETF actions de mineurs de cuivre (Global X Copper Miners
  // ETF / COPX) — exposition corrélée mais économiquement différente (actions de
  // producteurs, pas le métal lui-même). Documenté ici et dans le journal d'audit
  // (CLAUDE.md §6) : à surveiller si l'écart de corrélation devient significatif pour le
  // calcul du rendement indexé (CollateralYieldService).
  XCU: 'global-x-copper-miners-tokenized-etf-ondo', // ETF mineurs de cuivre (substitut)
  WTI: 'united-states-oil-tokenized-fund-ondo', // Pétrole (WTI, futures)
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

// Métadonnées statiques par actif (id numérique CoinMarketCap + logo) — résolues une fois
// via /v2/cryptocurrency/info (le seul endpoint acceptant un slug pour cette information)
// puis mises en cache très longtemps : un logo ou un id CoinMarketCap ne change
// essentiellement jamais, inutile de le redemander toutes les 30s comme le prix. Séparé de
// PRICE_CACHE_TTL_MS pour limiter la consommation de crédits API (plan gratuit : 15 000
// crédits/mois, cf. .env.example).
export const METADATA_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Historique de prix (cf. MarketDataService.getYieldAssetHistory, page /rendement) — 365
// jours est le maximum accessible sur le plan gratuit de CoinMarketCap (comme sur
// l'ancien plan public CoinGecko) : on l'affiche honnêtement comme "performance sur 12
// mois", jamais comme "depuis le lancement", que ces actifs soient plus anciens ou non.
// Cache plus long que PRICE_CACHE_TTL_MS : un historique quotidien n'a pas besoin d'être
// rafraîchi à la minute, et cela limite le nombre d'appels à l'API (une requête par actif,
// contrairement à getMarketOverview qui couvre tous les actifs en un seul appel).
export const HISTORY_PERIOD_DAYS = 365;
export const HISTORY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

// Cryptos majeures affichées à titre informatif dans la vue "marché" façon plateforme
// d'échange (OKX, Binance…), en plus des actifs acceptés en garantie. Non liées au
// moteur de crédit — purement pour donner au client une vue d'ensemble du marché.
// "ethereum" n'y figure plus : ETH est désormais un actif accepté (cf. COINMARKETCAP_SLUGS
// ci-dessus) — le lister ici aussi dupliquerait la ligne dans getMarketOverview(). Clés en
// slugs CoinMarketCap : "bnb" et "xrp" diffèrent des identifiants CoinGecko équivalents
// ("binancecoin", "ripple"). Chaque slug vérifié en direct avec une vraie clé API avant
// de figer ce mapping (cf. CLAUDE.md §6, entrée 15) : "binance-coin" (identifiant utilisé
// jusqu'ici) répond bien mais CoinMarketCap le renvoie systématiquement sous le slug
// canonique "bnb" — utilisé ici directement pour éviter tout risque de désynchronisation
// entre le slug demandé et le slug réellement renvoyé par l'API.
export const MARKET_OVERVIEW_SLUGS: Record<
  string,
  { symbol: string; name: string }
> = {
  bitcoin: { symbol: 'BTC', name: 'Bitcoin' },
  solana: { symbol: 'SOL', name: 'Solana' },
  bnb: { symbol: 'BNB', name: 'BNB' },
  xrp: { symbol: 'XRP', name: 'XRP' },
  cardano: { symbol: 'ADA', name: 'Cardano' },
  dogecoin: { symbol: 'DOGE', name: 'Dogecoin' },
  tron: { symbol: 'TRX', name: 'Tron' },
  avalanche: { symbol: 'AVAX', name: 'Avalanche' },
  chainlink: { symbol: 'LINK', name: 'Chainlink' },
};
