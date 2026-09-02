// Valeurs déclaratives du dossier KYC (cf. CLAUDE.md §6 entrée #33) — partagées entre
// l'auto-déclaration client (UserProfileController) et la fiche 360 back-office
// (AdminClientsController), d'où leur emplacement dans `common` plutôt que dans l'un des
// deux modules. Des chaînes validées côté DTO (@IsIn) plutôt que des enums Prisma, même
// choix que les champs texte préexistants du même schéma (Employment.status,
// Employment.contractType…) : ce sont des libellés d'IHM, jamais interrogés en base par
// leur valeur individuellement.

export const PROFESSIONAL_STATUSES = [
  'SALARIE',
  'FONCTIONNAIRE',
  'INDEPENDANT',
  'DIRIGEANT',
  'RETRAITE',
  'ETUDIANT',
  'SANS_EMPLOI',
] as const;
export type ProfessionalStatus = (typeof PROFESSIONAL_STATUSES)[number];

export const INCOME_BRACKETS = [
  'LT_20K',
  'B20K_50K',
  'B50K_100K',
  'B100K_250K',
  'GT_250K',
] as const;
export type IncomeBracket = (typeof INCOME_BRACKETS)[number];

export const NET_WORTH_BRACKETS = [
  'LT_100K',
  'B100K_500K',
  'B500K_1M',
  'GT_1M',
] as const;
export type NetWorthBracket = (typeof NET_WORTH_BRACKETS)[number];

// Situation de famille — cases à cocher fermées du dossier papier (§1 : Célibataire /
// Marié(e) / Pacsé(e) / Divorcé(e) / Veuf(ve)), ajoutées à l'entrée #35 après relecture
// stricte du document (ce champ était resté en texte libre depuis l'entrée #33). Utilisé
// uniquement pour contraindre l'AUTO-DÉCLARATION client (cf. UpdateOwnProfileDto) — la
// fiche admin (UpdateClientProfileDto) reste en texte libre, pour ne jamais invalider une
// valeur historique déjà saisie par un conseiller avant ce choix fermé.
export const MARITAL_STATUSES = [
  'CELIBATAIRE',
  'MARIE',
  'PACSE',
  'DIVORCE',
  'VEUF',
] as const;
export type MaritalStatus = (typeof MARITAL_STATUSES)[number];

export const IDENTITY_DOCUMENT_TYPES = [
  'CNI',
  'PASSEPORT',
  'TITRE_SEJOUR',
] as const;
export type IdentityDocumentType = (typeof IDENTITY_DOCUMENT_TYPES)[number];

export const IDENTITY_CHECK_METHODS = ['FACE_A_FACE', 'PVID', 'EIDAS'] as const;
export type IdentityCheckMethod = (typeof IDENTITY_CHECK_METHODS)[number];

export const PROOF_OF_ADDRESS_TYPES = [
  'FACTURE',
  'AVIS_IMPOSITION',
  'QUITTANCE',
] as const;
export type ProofOfAddressType = (typeof PROOF_OF_ADDRESS_TYPES)[number];

export const FUNDS_ORIGINS = [
  'REVENUS_PROFESSIONNELS',
  'EPARGNE',
  'VENTE_BIENS',
  'HERITAGE',
  'DIVIDENDES',
  'AUTRE',
] as const;
export type FundsOrigin = (typeof FUNDS_ORIGINS)[number];

export const RELATIONSHIP_PURPOSES = [
  'COMPTE_COURANT',
  'PLACEMENT',
  'FINANCEMENT',
  'OPERATIONS_INTERNATIONALES',
] as const;
export type RelationshipPurpose = (typeof RELATIONSHIP_PURPOSES)[number];

// Réservé admin (cf. AmlProfile.riskLevel/reviewDecision) — jamais écrit par le client.
export const AML_RISK_LEVELS = ['FAIBLE', 'STANDARD', 'ELEVE'] as const;
export type AmlRiskLevel = (typeof AML_RISK_LEVELS)[number];

export const KYC_REVIEW_DECISIONS = ['VALIDE', 'REFUSE'] as const;
export type KycReviewDecision = (typeof KYC_REVIEW_DECISIONS)[number];
