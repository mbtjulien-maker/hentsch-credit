const currencyFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatUsd(value: string | number): string {
  return currencyFormatter.format(Number(value));
}

const eurFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Le ledger interne reste toujours en USD (cf. CLAUDE.md §3/§4) ; ce formateur ne sert
// qu'à afficher, dans la devise choisie par le client, les montants propres à une position
// de crédit (crédit accordé, frais d'origination) — en miroir de `creditIssuedInCurrency`
// calculé côté backend au verrouillage.
export function formatAccountCurrency(
  value: string | number,
  currency: "USD" | "EUR",
): string {
  return currency === "EUR"
    ? eurFormatter.format(Number(value))
    : currencyFormatter.format(Number(value));
}

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  DEPOSIT: "Dépôt",
  COLLATERAL_LOCK: "Mise en gage",
  CREDIT_ISSUED: "Crédit émis",
  CARD_PAYMENT: "Paiement carte",
  REPAYMENT: "Remboursement",
  WITHDRAWAL: "Retrait",
  ORIGINATION_FEE: "Frais d'origination",
  INTEREST_PAYMENT: "Intérêts payés",
  CARD_TOPUP: "Recharge par carte",
  YIELD_REPAYMENT: "Remboursement par rendement du gage",
};

export const TRANSACTION_STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  COMPLETED: "Complétée",
  FAILED: "Échouée",
};

export const CREDIT_REQUEST_STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente de validation",
  APPROVED: "Approuvée",
  REJECTED: "Rejetée",
  FULFILLED: "Crédit émis",
};

export const CARD_STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  ACTIVE: "Active",
  BLOCKED: "Bloquée",
  CLOSED: "Clôturée",
};

export const KYC_STATUS_LABELS: Record<string, string> = {
  PENDING: "KYC en attente",
  VERIFIED: "KYC vérifié",
  REJECTED: "KYC rejeté",
};

// Seul Ethereum est proposé pour l'instant — décision produit : tous les actifs
// affichés au dépôt/retrait (cf. CURRENCY_GROUPS) n'y sont disponibles que sur cette
// chaîne, plus de choix multi-EVM (Polygon/Arbitrum retirés du sélecteur).
export const EVM_CHAINS = ["ETHEREUM"] as const;

export const CHAIN_LABELS: Record<string, string> = {
  ETHEREUM: "Ethereum",
  POLYGON: "Polygon",
  ARBITRUM: "Arbitrum",
  TRON: "Tron",
  SOLANA: "Solana",
};

export const CURRENCY_LABELS: Record<string, string> = {
  USDS: "USDS",
  DAI: "DAI",
  USDE: "USDe",
  PYUSD: "PYUSD",
  PAXG: "PAXG (or)",
  XAUT: "XAUT (or)",
  USDT: "USDT",
  USDC: "USDC",
  DEURO: "dEURO",
  ETH: "ETH",
  SHIB: "SHIB",
  KAG: "KAG (argent)",
  XPT: "Platine tokenisé",
  XPD: "Palladium tokenisé",
  XCU: "Cuivre tokenisé",
  WTI: "Pétrole synthétique (WTI)",
};

// Réseaux disponibles pour chaque actif — détermine les options du sélecteur de réseau
// une fois l'actif choisi (pas l'inverse). Tous les actifs proposés (cf. CURRENCY_GROUPS)
// ne sont disponibles que sur Ethereum pour l'instant.
export const CURRENCY_CHAINS: Record<string, readonly (typeof EVM_CHAINS)[number][]> = {
  DAI: EVM_CHAINS,
  USDC: EVM_CHAINS,
  USDT: EVM_CHAINS,
  DEURO: EVM_CHAINS,
  XAUT: EVM_CHAINS,
  ETH: EVM_CHAINS,
  SHIB: EVM_CHAINS,
  KAG: EVM_CHAINS,
  XPT: EVM_CHAINS,
  XPD: EVM_CHAINS,
  XCU: EVM_CHAINS,
  WTI: EVM_CHAINS,
};

// Regroupements affichés dans les sélecteurs — reflètent la logique de valorisation
// réelle de chaque actif (miroir de PEGGED_CURRENCIES/PRECIOUS_METAL_CURRENCIES/
// INDUSTRIAL_RWA_CURRENCIES côté backend, cf. market-data.constants.ts), pas un simple
// rapprochement visuel : un groupe = une seule et même règle de calcul de la valeur en USD.
// USDS/USDE/PYUSD/PAXG existent toujours côté backend pour ne pas invalider les comptes
// existants, mais ne sont plus proposés au choix ici — décision produit, tous disponibles
// uniquement sur Ethereum (cf. CURRENCY_CHAINS). Métaux précieux (XAUT/KAG), ETH et métaux
// industriels/matières premières tokenisés (XPT/XPD/XCU/WTI) regroupés à part : ce sont
// les seuls actifs générateurs de rendement automatique (cf. YIELD_ELIGIBLE_CURRENCIES),
// mis en avant dans le sélecteur comme sur la vue Marché (cf. market-view.tsx). Les métaux
// industriels/matières premières portent en plus un objectif de rendement indicatif de la
// stratégie de trésorerie de la banque (cf. targetApyRangePct, jamais une garantie) — voir
// la section "Notre stratégie d'investissement RWA" de la page d'accueil pour le détail.
export const CURRENCY_GROUPS: { label: string; currencies: readonly string[] }[] = [
  { label: "Stablecoins USD (valorisés 1:1)", currencies: ["DAI", "USDC", "USDT"] },
  { label: "Stablecoin EUR (cours spot en direct)", currencies: ["DEURO"] },
  { label: "Métaux précieux (génèrent un rendement)", currencies: ["XAUT", "KAG"] },
  { label: "Cryptomonnaies (ETH génère un rendement)", currencies: ["ETH", "SHIB"] },
  {
    label: "Métaux industriels & matières premières tokenisés (objectif indicatif 8-14% APY)",
    currencies: ["XPT", "XPD", "XCU", "WTI"],
  },
];

const priceFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

export function formatPrice(value: string | number): string {
  return priceFormatter.format(Number(value));
}

const timeFormatter = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

export function formatTime(value: string | Date): string {
  return timeFormatter.format(new Date(value));
}

const compactUsdFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2,
});

// Volumes / capitalisations façon plateforme d'échange : 69,9 Md$US plutôt que
// 69 948 254 539,00 $US.
export function formatCompactUsd(value: string | number | null): string {
  if (value === null) return "—";
  return compactUsdFormatter.format(Number(value));
}

const percentFormatter = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "always",
});

export function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return percentFormatter.format(value / 100);
}
