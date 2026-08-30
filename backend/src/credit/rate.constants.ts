import { AccountCurrency, Prisma } from '@prisma/client';

// Structure de taux et revenus bancaires (scénario LTV 350%). Le sur-risque du LTV
// (350% au lieu de 50-80% classique en crypto) impose un taux composé de deux briques :
// un taux de référence monétaire + une prime de risque élevée.
//
// Taux de référence — approximation figée des niveaux de marché actuels (SOFR ≈ 5%,
// EURIBOR ≈ 3,5%). Ce ne sont PAS des flux temps réel (nécessiterait une clé API dédiée,
// ex: FRED pour SOFR) : à remplacer par un flux live si une source devient disponible.
export const BASE_RATE_PCT: Record<AccountCurrency, Prisma.Decimal> = {
  USD: new Prisma.Decimal('5.0'),
  EUR: new Prisma.Decimal('3.5'),
};

// Prime de risque fixe liée au sur-risque LTV 350% — calibrée pour retomber sur le taux
// cible du scénario V2 (USD : 5.0% + 8.5% = 13.5%/an). L'écart USD/EUR (base SOFR vs
// EURIBOR) est conservé tel quel, donnant 12.0%/an en EUR.
export const RISK_PREMIUM_PCT = new Prisma.Decimal('8.5');

export function getInterestRatePct(currency: AccountCurrency): Prisma.Decimal {
  return BASE_RATE_PCT[currency].plus(RISK_PREMIUM_PCT);
}

// Frais d'origination : prélevés immédiatement sur le solde disponible au verrouillage.
export const ORIGINATION_FEE_PCT = new Prisma.Decimal('2.0');

// Frais de garde du collatéral : taux annuel affiché/simulé. La facturation périodique
// réelle (accrual quotidien) n'est pas implémentée — nécessiterait une tâche planifiée,
// non construite dans cette étape.
export const CUSTODY_FEE_PCT = new Prisma.Decimal('0.5');

export const DEFAULT_TERM_MONTHS = 12;

// Structure de remboursement (CLAUDE.md §2) : au plus 60% du crédit émis sur une position
// peut être remboursé automatiquement par le rendement du gage (or/ETH, cf.
// CollateralYieldService et YIELD_ELIGIBLE_CURRENCIES) — les 40% restants doivent
// obligatoirement être remboursés par apport personnel du client (geste explicite via
// /credit/repay). Le plafond porte sur `creditIssued` à l'émission, jamais recalculé si
// le taux de crédit change ensuite (même principe de non-rétroactivité que CREDIT_RATIO).
export const YIELD_REPAYMENT_CAP_PCT = new Prisma.Decimal('60');

// Moteur de liquidation (cf. LiquidationService) — comble le vide identifié dans
// l'algorithme : jusqu'ici, rien ne réagissait si la valeur d'un gage volatil (métaux,
// ETH, RWA industriels) s'effondrait après verrouillage. Dépréciation mesurée par rapport
// à la valeur d'entrée du gage (collateralAmount, figée au verrouillage), pas par rapport
// au crédit utilisé — cohérent avec le principe déjà en vigueur (aucun recalcul rétroactif
// du crédit accordé). Seuil d'alerte strictement inférieur au seuil de déclenchement :
// laisse une marge d'observation avant l'action automatique.
export const LIQUIDATION_WARNING_DEPRECIATION_PCT = new Prisma.Decimal('30');
export const LIQUIDATION_TRIGGER_DEPRECIATION_PCT = new Prisma.Decimal('50');
