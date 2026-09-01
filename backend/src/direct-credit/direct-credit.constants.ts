import { AccountCurrency, Prisma } from '@prisma/client';
import { BASE_RATE_PCT } from '../credit/rate.constants';

// Crédit direct — non gagé, réservé aux comptes BUSINESS (cf. AccountType, CLAUDE.md
// §2). Cinq critères déclaratifs, tous obligatoires (pas de scoring pondéré : plus
// simple à expliquer et à tester qu'un modèle à points, cohérent avec la transparence
// déjà appliquée ailleurs sur ce produit — ex. /admin/algorithme). Toutes les données
// évaluées sont auto-déclarées par le client, jamais vérifiées par un tiers (aucun
// fournisseur de vérification de revenus ou de registre du commerce n'est branché à ce
// stade) — documenté ici et rappelé dans l'interface client.

// Ancienneté minimale de l'entreprise — volontairement basse (3 mois, pas 12+) pour ne
// pas exclure d'office les startups explicitement visées par ce produit (cf. décision
// produit) : le filtre réel contre les projets "stade idée" est le revenu mensuel minimum
// ci-dessous, pas l'ancienneté.
export const MIN_COMPANY_SENIORITY_MONTHS = 3;

// Revenu mensuel déclaré minimum, par devise — seuil distinct par devise (pas de
// conversion live appliquée au seuil lui-même, même simplification que BASE_RATE_PCT).
export const MIN_MONTHLY_REVENUE: Record<AccountCurrency, Prisma.Decimal> = {
  USD: new Prisma.Decimal('3000'),
  EUR: new Prisma.Decimal('2800'),
};

// Montant demandé plafonné à un multiple du revenu mensuel déclaré — garde-fou contre un
// montant démesuré par rapport à l'activité déclarée, même si le reste des critères
// passerait autrement.
export const MAX_REQUEST_TO_MONTHLY_REVENUE_MULTIPLE = new Prisma.Decimal('8');

// Ratio d'endettement — la mensualité estimée du crédit direct ne doit pas dépasser cette
// part du revenu net mensuel déclaré (revenu − charges). Un revenu net nul ou négatif
// échoue automatiquement ce critère (pas de division par zéro, pas de ratio négatif
// "accepté" par erreur de signe).
export const MAX_DEBT_SERVICE_RATIO_PCT = new Prisma.Decimal('35');

// Garantie de remboursement — le client doit proposer une garantie couvrant au moins
// cette part du montant demandé (espèces, actif professionnel, caution personnelle...).
// Contrairement au crédit gagé crypto, cette garantie n'est ni verrouillée ni vérifiée
// automatiquement à ce stade (aucun flux de dépôt de garantie n'est encore construit) :
// c'est une déclaration prise en compte dans la décision, pas un actif bloqué.
export const MIN_GUARANTEE_COVERAGE_PCT = new Prisma.Decimal('20');

// Taux d'intérêt — même brique que le crédit gagé (taux de référence SOFR/EURIBOR figé,
// cf. rate.constants.ts BASE_RATE_PCT) mais une prime de risque plus élevée : l'absence
// de collatéral verrouillé est un risque strictement supérieur à un LTV 350%, même avec
// une garantie déclarative. USD : 5,0 % + 10,0 % = 15,0 %/an. EUR : 3,5 % + 10,0 % =
// 13,5 %/an.
export const DIRECT_CREDIT_RISK_PREMIUM_PCT = new Prisma.Decimal('10.0');

export function getDirectCreditInterestRatePct(
  currency: AccountCurrency,
): Prisma.Decimal {
  return BASE_RATE_PCT[currency].plus(DIRECT_CREDIT_RISK_PREMIUM_PCT);
}

// Frais d'origination — supérieurs aux 2,0 % du crédit gagé (3,0 %), reflétant le coût
// d'instruction plus élevé d'un dossier non gagé. Affiché/estimé ici, pas encore prélevé
// réellement (aucune émission de crédit direct n'est construite à ce stade, cf.
// DirectCreditService).
export const DIRECT_CREDIT_ORIGINATION_FEE_PCT = new Prisma.Decimal('3.0');

export const DIRECT_CREDIT_TERM_MONTHS = 12;
