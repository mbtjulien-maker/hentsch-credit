import type { AdminClient, AdminContract, DecisionStatus } from "@/lib/admin-mock-data";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export type KycStatus = "PENDING" | "VERIFIED" | "REJECTED";

export type CardStatus = "PENDING" | "ACTIVE" | "BLOCKED" | "CLOSED";

export type Chain = "ETHEREUM" | "POLYGON" | "ARBITRUM" | "TRON" | "SOLANA" | "BSC";

export type AcceptedCurrency =
  | "USDS"
  | "DAI"
  | "USDE"
  | "PYUSD"
  | "PAXG"
  | "XAUT"
  | "USDT"
  | "USDC"
  | "DEURO"
  | "ETH"
  | "SHIB"
  | "KAG"
  | "XPT"
  | "XPD"
  | "XCU"
  | "WTI";

export type AccountCurrency = "USD" | "EUR";

export type TransactionType =
  | "DEPOSIT"
  | "COLLATERAL_LOCK"
  | "CREDIT_ISSUED"
  | "CARD_PAYMENT"
  | "REPAYMENT"
  | "WITHDRAWAL"
  | "ORIGINATION_FEE"
  | "INTEREST_PAYMENT"
  | "CARD_TOPUP"
  | "YIELD_REPAYMENT";

export type TransactionStatus = "PENDING" | "COMPLETED" | "FAILED";

export type UserRole = "CLIENT" | "ADMIN";

// Fixé à l'ouverture du compte (formulaire public "Demander l'ouverture d'un compte"),
// jamais modifié ensuite. BUSINESS débloque le crédit direct (cf. DirectCreditRequest) en
// plus du crédit gagé crypto, disponible aux deux types de compte.
export type AccountType = "PARTICULIER" | "BUSINESS";

export interface UserSummary {
  id: string;
  email: string;
  kycStatus: KycStatus;
  role: UserRole;
  accountType: AccountType;
  createdAt: string;
  // Présent uniquement sur la réponse de GET /auth/me (cf. AuthController) — absent sur
  // les réponses de login/challenge, qui n'ont pas besoin de le renvoyer.
  twoFactorEnabled?: boolean;
}

// Réponse de POST /auth/login quand le compte a la 2FA activée — aucun cookie de session
// n'est posé à ce stade, cf. AuthController.login. Le pendingToken doit être renvoyé à
// api.twoFactorChallenge() avec le code TOTP pour obtenir une vraie session.
export interface TwoFactorChallengeRequired {
  requiresTwoFactor: true;
  pendingToken: string;
}

export type LoginResult = UserSummary | TwoFactorChallengeRequired;

export function loginRequiresTwoFactor(
  result: LoginResult,
): result is TwoFactorChallengeRequired {
  return "requiresTwoFactor" in result && result.requiresTwoFactor === true;
}

export interface TwoFactorSetup {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

export type AccountRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface AccountOpeningRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  message: string | null;
  accountType: AccountType;
  status: AccountRequestStatus;
  createdAt: string;
  reviewedAt: string | null;
  userId: string | null;
}

export interface ApproveAccountRequestResult {
  request: AccountOpeningRequest;
  // Affiché une seule fois côté back-office — jamais renvoyé par un autre appel.
  temporaryPassword: string;
}

// Plafond réel de comptes clients (cf. MAX_CLIENT_ACCOUNTS côté backend) — used ne compte
// que les comptes CLIENT réellement créés, jamais les demandes PENDING.
export interface ClientAccountCapacity {
  used: number;
  max: number;
  remaining: number;
}

export interface LedgerBalance {
  id: string;
  userId: string;
  availableBalance: string;
  lockedCollateral: string;
  grantedCredit: string;
  usedCredit: string;
  // Wallet investissement (cf. §2H CLAUDE.md entrée #31) — solde SÉPARÉ
  // d'availableBalance, dédié aux 6 paniers perpétuels et aux 6 plans à échéance fixe.
  // Alimenté uniquement par virement interne (cf. api.transferToInvestmentWallet), jamais
  // par un dépôt on-chain/bancaire direct. N'entre jamais dans le calcul du Pouvoir
  // d'Achat Total (§2A CLAUDE.md) : un placement, ni un gage ni un crédit.
  investmentBalance: string;
  updatedAt: string;
}

export interface BalanceSummary {
  balance: LedgerBalance;
  totalPurchasingPower: string;
  withdrawableBalance: string;
}

export interface CreditPosition {
  id: string;
  userId: string;
  collateralAmount: string;
  creditIssued: string;
  status: "ACTIVE" | "CLOSED";
  currency: AccountCurrency;
  exchangeRateAtLock: string;
  creditIssuedInCurrency: string;
  interestRatePct: string;
  originationFeePct: string;
  originationFeeAmount: string;
  custodyFeePct: string;
  termMonths: number;
  maturityDate: string;
  createdAt: string;
}

export type CreditRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "FULFILLED";

export interface CreditRequest {
  id: string;
  userId: string;
  collateralAmount: string;
  currency: AccountCurrency;
  status: CreditRequestStatus;
  createdAt: string;
  validatedAt: string | null;
  fulfilledAt: string | null;
  creditPositionId: string | null;
}

// Crédit direct — non gagé, réservé aux comptes BUSINESS (cf. AccountType, CLAUDE.md
// §2). Décision automatique à la soumission (aucune file d'attente admin) : cinq
// critères déclaratifs, tous obligatoires. Les données évaluées sont auto-déclarées par
// le client, jamais vérifiées par un tiers.
export type DirectCreditDecision = "ELIGIBLE" | "INELIGIBLE";

export interface DirectCreditEligibilityCriterion {
  key: string;
  label: string;
  passed: boolean;
  observed: string;
  threshold: string;
}

export interface DirectCreditRequest {
  id: string;
  userId: string;
  companyName: string;
  registrationNumber: string;
  sector: string;
  companySeniorityMonths: number;
  projectDescription: string;
  requestedAmount: string;
  currency: AccountCurrency;
  declaredMonthlyRevenue: string;
  declaredMonthlyExpenses: string;
  guaranteeOffered: string;
  decision: DirectCreditDecision;
  eligibilityBreakdown: DirectCreditEligibilityCriterion[];
  estimatedRatePct: string;
  estimatedMonthlyPayment: string;
  createdAt: string;
}

export interface DirectCreditRates {
  interestRatePct: string;
  originationFeePct: string;
  termMonths: number;
  minCompanySeniorityMonths: number;
  minMonthlyRevenue: string;
  maxRequestToMonthlyRevenueMultiple: string;
  maxDebtServiceRatioPct: string;
  minGuaranteeCoveragePct: string;
}

// Investissement direct (cf. §2H CLAUDE.md) — ouvert aux comptes PARTICULIER et BUSINESS
// (contrairement au crédit direct, réservé BUSINESS), un placement à part entière depuis
// le solde disponible, sans gage ni crédit émis. STOCKS est le panier d'origine ; les 4
// autres (CONSERVATIVE/BALANCED/TECH_AI/MOMENTUM) ont été ajoutés à l'entrée #27 du
// journal, chacun avec sa propre composition de titres et son propre profil de risque —
// aucune hiérarchie ni remplacement entre eux.
export type InvestmentBasket =
  | "RWA_STRATEGY"
  | "STOCKS"
  | "STOCKS_CONSERVATIVE"
  | "STOCKS_BALANCED"
  | "STOCKS_TECH_AI"
  | "STOCKS_MOMENTUM";

export const INVESTMENT_BASKETS: InvestmentBasket[] = [
  "RWA_STRATEGY",
  "STOCKS",
  "STOCKS_CONSERVATIVE",
  "STOCKS_BALANCED",
  "STOCKS_TECH_AI",
  "STOCKS_MOMENTUM",
];

export type InvestmentPositionStatus = "ACTIVE" | "CLOSED";

export interface InvestmentPosition {
  id: string;
  userId: string;
  basket: InvestmentBasket;
  principalAmount: string;
  accruedYield: string;
  status: InvestmentPositionStatus;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export interface InvestmentBasketRate {
  indicativeAnnualPct: string;
  // RWA_STRATEGY seulement — dernier rendement quotidien réel appliqué (peut être
  // négatif). null tant qu'aucun passage du bot de trésorerie n'a encore eu lieu.
  latestDailyReturnPct?: string | null;
  // STOCKS seulement — dernière variation moyenne réelle du panier d'actions (Finnhub).
  // null sans FINNHUB_API_KEY ou en cas de panne totale du fournisseur.
  latestMarketSignalPct?: string | null;
  // Classification indicative (1-5, cf. RISK_LEVEL côté backend) — une hypothèse de
  // stratégie éditoriale, jamais un score calculé en direct à partir d'une volatilité
  // mesurée.
  riskLevel: number;
}

export type InvestmentRates = {
  minAmountUsd: string;
} & Record<InvestmentBasket, InvestmentBasketRate>;

// Historique réel du rendement quotidien de chaque panier (cf. GET /investment/history)
// — la même série que celle réellement appliquée par l'accrual quotidien, jamais un point
// fabriqué. Sert de base à une tendance visuelle (cf. MiniSparkline), pas un cours
// d'actif : composée en un indice de croissance cumulée côté frontend (cf.
// buildReturnIndex dans investment-panel.tsx), pas affichée telle quelle.
export interface InvestmentHistoryPoint {
  date: string;
  returnPct: string;
}

export type InvestmentHistory = Record<InvestmentBasket, InvestmentHistoryPoint[]>;

// Détail des actifs réellement impliqués dans chaque panier (cf. GET /investment/assets)
// — au-delà du rendement agrégé de InvestmentRates ci-dessus, pour montrer concrètement
// la composition de la stratégie. Un actif RWA sans cours disponible (image/name présents
// mais price/changePct null) reste listé plutôt que masqué : la composition du panier est
// stable, seule sa cotation peut manquer temporairement (cf. dégradation gracieuse
// MarketDataService).
export interface RwaBasketAsset {
  currency: AcceptedCurrency;
  name: string;
  image: string;
  price: string | null;
  changePct: number | null;
}

export interface StockBasketAsset {
  ticker: string;
  name: string;
  price: number;
  changePct: number;
}

export type InvestmentAssets = {
  RWA_STRATEGY: { assets: RwaBasketAsset[] };
} & Record<Exclude<InvestmentBasket, "RWA_STRATEGY">, { assets: StockBasketAsset[] }>;

// Plans à échéance fixe (cf. §2H CLAUDE.md entrée #30, GET /investment/fixed-term-plans)
// — DEUXIÈME mode de placement, distinct des 6 paniers perpétuels ci-dessus : réellement
// souscriptible (POST /investment/fixed-term/deposit), mais bloqué jusqu'à l'échéance —
// aucun retrait anticipé, contrairement aux paniers. `annualizedPct`/`periodPct` sont
// recalculés côté backend à partir des rendements de dividende réels des composants du
// plan, jamais le chiffre initialement proposé par le client (jusqu'à 25%/an) — cf.
// FIXED_TERM_PLANS côté backend.
export type FixedTermPlanId =
  | "TREASURY_3M"
  | "SEMICONDUCTORS_6M"
  | "CORE_BALANCED_12M"
  | "RWA_METALS_12M"
  | "AI_MEGACAPS_12M"
  | "ALPHA_MOMENTUM_12M";

export const FIXED_TERM_PLAN_IDS: FixedTermPlanId[] = [
  "TREASURY_3M",
  "SEMICONDUCTORS_6M",
  "CORE_BALANCED_12M",
  "RWA_METALS_12M",
  "AI_MEGACAPS_12M",
  "ALPHA_MOMENTUM_12M",
];

export interface FixedTermPlan {
  id: FixedTermPlanId;
  horizonMonths: number;
  riskScore: number;
  tickers: string[];
  includesRwa: boolean;
  annualizedPct: string;
  periodPct: string;
  latestSignalPct: string | null;
}

export type FixedTermPositionStatus = "ACTIVE" | "MATURED";

// Une position par dépôt (jamais cumulée à une position existante, contrairement à
// InvestmentPosition) — chaque tranche a sa propre échéance. `maturedAt` renseigné
// uniquement une fois réglée automatiquement par le cron (jamais un retrait du client).
export interface FixedTermPosition {
  id: string;
  userId: string;
  plan: FixedTermPlanId;
  principalAmount: string;
  accruedYield: string;
  status: FixedTermPositionStatus;
  createdAt: string;
  maturityDate: string;
  maturedAt: string | null;
}

export interface RepayCreditResult {
  balance: LedgerBalance;
  collateralUnlocked: boolean;
  closedPositions: number;
  interestCharged: string;
}

export interface CreditRateInfo {
  interestRatePct: string;
  originationFeePct: string;
  custodyFeePct: string;
}

export type CreditRates = Record<AccountCurrency, CreditRateInfo>;

export interface CreditRatesResponse {
  rates: CreditRates;
  eurPerUsd: string | null;
}

export interface CardRecord {
  id: string;
  userId: string;
  externalCardId: string;
  status: CardStatus;
  creditLimit: string;
  createdAt: string;
}

export type WithdrawalMethod = "CRYPTO" | "SEPA" | "SWIFT";

export interface TransactionRecord {
  id: string;
  userId: string;
  type: TransactionType;
  amount: string;
  status: TransactionStatus;
  currency: AcceptedCurrency | null;
  tokenAmount: string | null;
  chain: Chain | null;
  // Adresse on-chain (retrait CRYPTO) ou IBAN (retrait SEPA/SWIFT) selon
  // `withdrawalMethod` — cf. WithdrawalService côté backend.
  destinationAddress: string | null;
  referenceTx: string | null;
  createdAt: string;
  // Renseignés uniquement pour un WITHDRAWAL bancaire (SEPA/SWIFT) — `null` pour CRYPTO
  // ou tout autre type de transaction.
  withdrawalMethod: WithdrawalMethod | null;
  withdrawalCurrency: AccountCurrency | null;
  bankAccountHolder: string | null;
  bankBic: string | null;
}

export interface WalletRecord {
  id: string;
  userId: string;
  chain: Chain;
  address: string;
  currency: AcceptedCurrency;
  createdAt: string;
}

// Adresse de dépôt "pool" gérée par la banque (pas propre à un client) — consultée
// uniquement au moment où le client s'apprête à déposer, cf. DepositIntentsModule.
export interface ManagedDepositAddress {
  id: string;
  chain: Chain;
  currency: AcceptedCurrency;
  address: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketOverviewEntry {
  id: string;
  symbol: string;
  name: string;
  image: string;
  currency: AcceptedCurrency | null;
  isAcceptedForCredit: boolean;
  isPegged: boolean;
  isYieldEligible: boolean;
  // Objectif de rendement indicatif de la stratégie de trésorerie de la banque sur cet
  // actif (métaux industriels/matières premières tokenisés uniquement) — jamais une
  // garantie ni un taux appliqué au calcul du crédit du client.
  targetApyRangePct: { min: number; max: number } | null;
  usdPrice: string | null;
  change24hPct: number | null;
  volume24h: string | null;
  marketCap: string | null;
}

// Performance sur 12 mois d'un actif générateur de rendement (page /rendement) — 365
// jours est le maximum disponible sur le plan gratuit CoinMarketCap, affiché honnêtement
// comme "sur 12 mois", jamais "depuis le lancement" quel que soit l'âge réel de l'actif.
export interface AssetHistoryEntry {
  currency: AcceptedCurrency;
  periodDays: number;
  points: { t: number; usd: number }[];
  changePct: number | null;
  highUsd: number | null;
  lowUsd: number | null;
}

// Une ligne par jour de simulation du bot de trésorerie (cf. TreasuryBotService) —
// SIMULATION UNIQUEMENT, aucun ordre réel, aucun fonds ne bouge. Réservé au back-office.
export interface TreasuryBotRun {
  id: string;
  runDate: string;
  pillarAReturnPct: string;
  pillarBReturnPct: string;
  pillarCReturnPct: string;
  blendedReturnPct: string;
  marketSignalPct: string;
  notionalCapitalUsd: string;
  dailyPnlUsd: string;
  cumulativeNavUsd: string;
}

// Déclaration de dépôt en attente de validation manuelle (cf. AdminDepositIntentsController)
// — même forme que TransactionRecord, avec l'identité du client déclarant.
export interface PendingDepositIntent extends TransactionRecord {
  user: { id: string; email: string; managedWallet: { reference: string } | null };
}

// Wallet "personnel" interne d'un client (cf. ClientManagedWallet) — PAS une adresse
// blockchain, une référence de suivi côté back-office (façon numéro de compte). Les
// dépôts sur les actifs mutualisés continuent de transiter par ManagedDepositAddress.
export interface ClientManagedWalletView {
  id: string;
  userId: string;
  reference: string;
  createdAt: string;
}

export interface WithdrawalResult {
  balance: LedgerBalance;
  transaction: TransactionRecord;
}

// Trois méthodes de retrait (cf. WithdrawalMethod côté backend) : CRYPTO (adresse
// on-chain, inchangé) et deux virements bancaires classiques — SEPA (EUR, zone SEPA
// uniquement) et SWIFT (toute devise, tout pays, BIC obligatoire). Comme pour CRYPTO,
// aucun rail bancaire réel n'exécute le virement (cf. WithdrawalService) : la demande ne
// fait que journaliser le ledger.
export type WithdrawalRequest =
  | {
      method: "CRYPTO";
      amount: string;
      chain: Chain;
      currency: AcceptedCurrency;
      destinationAddress: string;
    }
  | {
      method: "SEPA" | "SWIFT";
      amount: string;
      withdrawalCurrency: AccountCurrency;
      bankAccountHolder: string;
      destinationIban: string;
      bankBic?: string;
    };

export interface CardTopupResult {
  paymentId: string;
  checkoutUrl: string;
}

export interface PaymentStatus {
  status: TransactionStatus;
  amount: string;
}

export interface ConfirmPaymentResult {
  balance: LedgerBalance | null;
  transaction: TransactionRecord;
  credited: boolean;
}

// Fiche client 360 back-office — cf. backend/src/admin-clients. `AdminClient` (le
// détail complet) est importé de lib/admin-mock-data.ts : c'est la même forme que les
// données de démonstration, pour que ClientDetailView et ses onglets fonctionnent sans
// changement, qu'ils reçoivent une vraie fiche ou un client fictif.
export interface AdminClientSummary {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  initials: string;
  clientType: string;
  registeredAt: string | null;
  accountStatus: "ACTIVE" | "SUSPENDED" | "PENDING";
  kycStatus: KycStatus;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  riskScore: number;
  // Même forme que AdminClient["creditRequest"] (cf. lib/admin-mock-data.ts) — objet
  // complet, pas un sous-ensemble : CreditRequestTable (partagée par les 4 pages
  // /admin/credits/*) lit `product`/`amountRequested`, pas seulement `purpose`/`status`.
  creditRequest: {
    id: string;
    // UUID réel de la CreditRequest — distinct de `id` ci-dessus (un code d'affichage
    // tronqué "CR-2026-XXXXXX", non réversible) : c'est celui qu'attendent
    // approveCreditRequest/rejectCreditRequest. `null` quand dossierCategory vaut AUCUNE
    // (aucune demande n'existe encore pour ce client).
    requestId: string | null;
    product: string;
    amountRequested: number;
    durationMonths: number;
    purpose: string;
    estimatedMonthlyPayment: number;
    proposedRate: number;
    requestDate: string;
    status: DecisionStatus;
  };
  // Catégorie réelle du dossier de crédit (dérivée de CreditRequestStatus/
  // CreditPositionStatus, cf. computeDossierCategory côté backend) — utilisée pour
  // répartir les clients entre les 4 pages /admin/credits/* (demandes/dossiers en
  // cours/actifs/clôturés), à la place du parcours fictif à 8 étapes.
  dossierCategory: "DEMANDE" | "EN_COURS" | "ACTIF" | "CLOTURE" | "AUCUNE";
  dossierStatus: {
    currentStepIndex: number;
    steps: { key: string; label: string; date: string | null }[];
  };
  contract: AdminContract;
  email: string;
}

export interface AdminNoteRecord {
  author: string;
  date: string | null;
  time: string;
  content: string;
}

export interface UpdateClientProfileInput {
  firstName?: string;
  lastName?: string;
  usageLastName?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  birthCountry?: string;
  gender?: "M" | "F" | "AUTRE";
  nationality?: string;
  secondNationality?: string;
  maritalStatus?: string;
  dependents?: number;
  phone?: string;
  taxResidenceCountry?: string;
  additionalTaxResidence?: string;
  taxIdNumber?: string;
  clientType?: "PARTICULIER" | "INDEPENDANT" | "ENTREPRISE";
}

export interface AdminAddressInput {
  label: "DOMICILE" | "FISCALE" | "POSTALE" | "PROFESSIONNELLE";
  street: string;
  addressLine2?: string;
  city: string;
  postalCode: string;
  country: string;
  residenceType?: string;
  since?: string;
  verified?: boolean;
}

export type ProfessionalStatus =
  | "SALARIE"
  | "FONCTIONNAIRE"
  | "INDEPENDANT"
  | "DIRIGEANT"
  | "RETRAITE"
  | "ETUDIANT"
  | "SANS_EMPLOI";

export type IncomeBracket = "LT_20K" | "B20K_50K" | "B50K_100K" | "B100K_250K" | "GT_250K";
export type NetWorthBracket = "LT_100K" | "B100K_500K" | "B500K_1M" | "GT_1M";

export interface UpdateEmploymentInput {
  isIndependent?: boolean;
  status?: string;
  professionalStatus?: ProfessionalStatus;
  employer?: string;
  sector?: string;
  role?: string;
  seniority?: string;
  annualIncome?: number;
  monthlyIncome?: number;
  contractType?: string;
  verified?: boolean;
  activity?: string;
  turnover?: number;
  netResult?: number;
  annualIncomeBracket?: IncomeBracket;
  netWorthBracket?: NetWorthBracket;
}

export type MaritalStatus = "CELIBATAIRE" | "MARIE" | "PACSE" | "DIVORCE" | "VEUF";
export type IdentityDocumentType = "CNI" | "PASSEPORT" | "TITRE_SEJOUR";
export type IdentityCheckMethod = "FACE_A_FACE" | "PVID" | "EIDAS";
export type ProofOfAddressType = "FACTURE" | "AVIS_IMPOSITION" | "QUITTANCE";
export type FundsOrigin =
  | "REVENUS_PROFESSIONNELS"
  | "EPARGNE"
  | "VENTE_BIENS"
  | "HERITAGE"
  | "DIVIDENDES"
  | "AUTRE";
export type RelationshipPurpose =
  | "COMPTE_COURANT"
  | "PLACEMENT"
  | "FINANCEMENT"
  | "OPERATIONS_INTERNATIONALES";
export type AmlRiskLevel = "FAIBLE" | "STANDARD" | "ELEVE";
export type KycReviewDecision = "VALIDE" | "REFUSE";

export interface IdentityDocumentInput {
  documentType?: IdentityDocumentType;
  documentNumber?: string;
  issuingAuthority?: string;
  issuePlace?: string;
  issueDate?: string;
  expiryDate?: string;
  identityCheckMethod?: IdentityCheckMethod;
  proofOfAddressType?: ProofOfAddressType;
  proofOfAddressIssuer?: string;
  proofOfAddressDate?: string;
}

// Fichiers réellement téléversés à l'appui du dossier KYC (cf. §6 entrée #36 CLAUDE.md)
// — distinct d'IdentityDocumentInput ci-dessus (purement déclaratif, métadonnées
// seulement) : ce sont ici de vrais fichiers stockés côté serveur.
export type KycDocumentCategory = "IDENTITY_FRONT" | "IDENTITY_BACK" | "PROOF_OF_ADDRESS";

export interface KycDocumentSummary {
  id: string;
  category: KycDocumentCategory;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
  verified: boolean;
  verifiedAt: string | null;
}

export interface SubmitAmlProfileInput {
  isPoliticallyExposed?: boolean;
  fundsOrigin?: FundsOrigin[];
  fundsOriginOther?: string;
  relationshipPurpose?: RelationshipPurpose[];
  attestationCity?: string;
  confirmAttestation: boolean;
}

export interface UpdateFinancialsInput {
  income?: Partial<{ salary: number; additional: number; professional: number; other: number }>;
  expenses?: Partial<{
    rent: number;
    mortgage: number;
    autoLoan: number;
    otherLoans: number;
    pension: number;
    recurring: number;
    other: number;
  }>;
  assets?: Partial<{
    bankAccounts: number;
    savings: number;
    realEstate: number;
    vehicles: number;
    investments: number;
    other: number;
  }>;
  liabilities?: Partial<{
    mortgage: number;
    autoLoan: number;
    personalLoan: number;
    debts: number;
    other: number;
  }>;
}

// Profil affiché côté client authentifié (cf. app/dashboard/profil) — même source de
// données que la fiche client back-office (ClientProfile/Address/Employment,
// cf. backend/src/admin-clients), mais lecture seule et réduite à ce que le client voit
// de lui-même. Tout nullable : rien n'est complété tant que personne (client ou admin)
// ne l'a renseigné.
export interface ClientProfileAddress {
  label: "DOMICILE" | "FISCALE" | "POSTALE" | "PROFESSIONNELLE";
  street: string;
  addressLine2: string | null;
  city: string;
  postalCode: string;
  country: string;
  residenceType: string | null;
  since: string | null;
  verified: boolean;
}

export interface ClientProfileEmployment {
  isIndependent: boolean;
  status: string | null;
  professionalStatus: ProfessionalStatus | null;
  employer: string | null;
  sector: string | null;
  role: string | null;
  seniority: string | null;
  annualIncome: number | null;
  monthlyIncome: number | null;
  contractType: string | null;
  annualIncomeBracket: IncomeBracket | null;
  netWorthBracket: NetWorthBracket | null;
  verified: boolean;
  activity: string | null;
  turnover: number | null;
  netResult: number | null;
}

export interface ClientProfileIdentityDocument {
  documentType: IdentityDocumentType | null;
  documentNumber: string | null;
  issuingAuthority: string | null;
  issuePlace: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  identityCheckMethod: IdentityCheckMethod | null;
  proofOfAddressType: ProofOfAddressType | null;
  proofOfAddressIssuer: string | null;
  proofOfAddressDate: string | null;
  verified: boolean;
}

export interface ClientProfileAml {
  isPoliticallyExposed: boolean | null;
  fundsOrigin: FundsOrigin[];
  fundsOriginOther: string | null;
  relationshipPurpose: RelationshipPurpose[];
  attestedAt: string | null;
  attestationCity: string | null;
  riskLevel: AmlRiskLevel | null;
  reviewDecision: KycReviewDecision | null;
  reviewedAt: string | null;
}

export interface ClientProfileView {
  firstName: string | null;
  lastName: string | null;
  usageLastName: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  birthCountry: string | null;
  gender: "M" | "F" | "AUTRE" | null;
  nationality: string | null;
  secondNationality: string | null;
  maritalStatus: string | null;
  dependents: number | null;
  taxResidenceCountry: string | null;
  additionalTaxResidence: string | null;
  taxIdNumber: string | null;
  clientType: "PARTICULIER" | "INDEPENDANT" | "ENTREPRISE";
  addresses: ClientProfileAddress[];
  employment: ClientProfileEmployment | null;
  identityDocument: ClientProfileIdentityDocument | null;
  aml: ClientProfileAml | null;
}

// Auto-déclaration client (cf. UserProfileController PATCH/PUT) — sous-ensemble des
// champs admin (jamais `clientType`/`verified`, cf. backend/src/users/dto/update-own-*).
export interface UpdateOwnProfileInput {
  firstName?: string;
  lastName?: string;
  usageLastName?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  birthCountry?: string;
  gender?: "M" | "F" | "AUTRE";
  nationality?: string;
  secondNationality?: string;
  // Choix fermé du dossier KYC papier (cf. §6 entrée #35 CLAUDE.md), contrairement à
  // UpdateClientProfileInput (admin, ci-dessus) resté en texte libre pour compat.
  maritalStatus?: MaritalStatus;
  dependents?: number;
  phone?: string;
  taxResidenceCountry?: string;
  additionalTaxResidence?: string;
  taxIdNumber?: string;
}

export interface UpdateOwnAddressInput {
  label: ClientProfileAddress["label"];
  street: string;
  addressLine2?: string;
  city: string;
  postalCode: string;
  country: string;
  residenceType?: string;
  since?: string;
}

export interface UpdateOwnEmploymentInput {
  isIndependent?: boolean;
  status?: string;
  professionalStatus?: ProfessionalStatus;
  employer?: string;
  sector?: string;
  role?: string;
  seniority?: string;
  annualIncome?: number;
  monthlyIncome?: number;
  contractType?: string;
  activity?: string;
  annualIncomeBracket?: IncomeBracket;
  netWorthBracket?: NetWorthBracket;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    // Envoie/accepte le cookie de session httpOnly cross-origin (backend sur un port
    // différent en dev) — requis pour toute route derrière JwtAuthGuard, cf. AuthModule.
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.message ?? `Requête échouée (${res.status})`, res.status);
  }

  return res.json() as Promise<T>;
}

// Distinct de `request()` : un envoi multipart/form-data ne doit JAMAIS fixer
// Content-Type à la main (le navigateur y ajoute le boundary lui-même à partir du
// FormData) — request() force `application/json`, inutilisable ici.
async function uploadFile<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.message ?? `Requête échouée (${res.status})`, res.status);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Authentification — session portée par un cookie httpOnly (pas de token à stocker
  // côté client), cf. AuthController.
  login: (email: string, password: string) =>
    request<LoginResult>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  // Seconde étape du login pour un compte avec la 2FA activée — cf. LoginResult.
  twoFactorChallenge: (pendingToken: string, code: string) =>
    request<UserSummary>("/auth/2fa/challenge", {
      method: "POST",
      body: JSON.stringify({ pendingToken, code }),
    }),
  logout: () => request<{ success: boolean }>("/auth/logout", { method: "POST" }),
  me: () => request<UserSummary>("/auth/me"),

  // Gestion de la 2FA depuis les paramètres du compte (réservé aux comptes ADMIN côté
  // backend, cf. AdminGuard) — distinct du login lui-même ci-dessus.
  setupTwoFactor: () => request<TwoFactorSetup>("/auth/2fa/setup", { method: "POST" }),
  enableTwoFactor: (code: string) =>
    request<{ success: boolean }>("/auth/2fa/enable", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),
  disableTwoFactor: (code: string) =>
    request<{ success: boolean }>("/auth/2fa/disable", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),

  listUsers: () => request<UserSummary[]>("/users"),
  getBalance: (userId: string) => request<BalanceSummary>(`/users/${userId}/ledger`),
  listTransactions: (userId: string) =>
    request<TransactionRecord[]>(`/users/${userId}/transactions`),
  listCards: (userId: string) => request<CardRecord[]>(`/users/${userId}/cards`),
  listWallets: (userId: string) => request<WalletRecord[]>(`/wallets/${userId}`),
  getUserProfile: (userId: string) => request<ClientProfileView>(`/users/${userId}/profile`),
  // Auto-déclaration client — chaque appel renvoie le profil complet rafraîchi (même vue
  // que getUserProfile ci-dessus), pratique pour resynchroniser l'écran après coup sans
  // un 4e aller-retour.
  updateUserProfile: (userId: string, data: UpdateOwnProfileInput) =>
    request<ClientProfileView>(`/users/${userId}/profile`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  updateUserAddresses: (userId: string, addresses: UpdateOwnAddressInput[]) =>
    request<ClientProfileView>(`/users/${userId}/profile/addresses`, {
      method: "PUT",
      body: JSON.stringify({ addresses }),
    }),
  updateUserEmployment: (userId: string, data: UpdateOwnEmploymentInput) =>
    request<ClientProfileView>(`/users/${userId}/profile/employment`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  updateUserIdentityDocument: (userId: string, data: IdentityDocumentInput) =>
    request<ClientProfileView>(`/users/${userId}/profile/identity-document`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  // Dernière étape du dossier KYC — attestation "Lu et approuvé" obligatoire
  // (`confirmAttestation: true`, cf. SubmitOwnAmlProfileDto côté backend).
  submitUserAmlProfile: (userId: string, data: SubmitAmlProfileInput) =>
    request<ClientProfileView>(`/users/${userId}/profile/aml`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  // Fichiers KYC réels (cf. §6 entrée #36) — listUserKycDocuments ne renvoie jamais le
  // contenu binaire (métadonnées seules) ; getKycDocumentDownloadUrl construit l'URL de
  // téléchargement direct (consommée via <a href> plutôt que fetch : le cookie de
  // session, SameSite=Lax, n'accompagne qu'une vraie navigation, pas un appel AJAX
  // cross-origin — cf. AuthController).
  listUserKycDocuments: (userId: string) =>
    request<KycDocumentSummary[]>(`/users/${userId}/profile/documents`),
  uploadUserKycDocument: (userId: string, category: KycDocumentCategory, file: File) => {
    const formData = new FormData();
    formData.append("category", category);
    formData.append("file", file);
    return uploadFile<KycDocumentSummary[]>(`/users/${userId}/profile/documents`, formData);
  },
  deleteUserKycDocument: (userId: string, documentId: string) =>
    request<KycDocumentSummary[]>(`/users/${userId}/profile/documents/${documentId}`, {
      method: "DELETE",
    }),
  getKycDocumentDownloadUrl: (userId: string, documentId: string) =>
    `${API_URL}/users/${userId}/profile/documents/${documentId}/download`,
  getManagedWallet: (userId: string) =>
    request<ClientManagedWalletView>(`/users/${userId}/managed-wallet`),
  getMarketPrices: () => request<MarketOverviewEntry[]>("/market/prices"),
  getYieldHistory: () => request<AssetHistoryEntry[]>("/market/yield-history"),
  // Historique complet des 8 actifs réellement éligibles au rendement (cf.
  // YIELD_ELIGIBLE_CURRENCIES côté backend) — distinct de getYieldHistory ci-dessus, qui
  // ne couvre que les 4 actifs mis en avant sur la vitrine "/rendement". Utilisé par
  // useEstimatedYield (simulateurs client) : un client qui gage du platine doit voir une
  // estimation basée sur le platine, pas sur une moyenne or/argent/ETH qui l'exclut.
  getYieldHistoryFull: () =>
    request<AssetHistoryEntry[]>("/market/yield-history-full"),
  getCreditRates: () => request<CreditRatesResponse>("/credit/rates"),
  // Crédit direct (BUSINESS uniquement, cf. AccountType) — conditions actuelles avant
  // soumission, décision automatique à la soumission, historique des demandes.
  getDirectCreditRates: (currency: AccountCurrency) =>
    request<DirectCreditRates>(`/direct-credit-requests/rates/${currency}`),
  createDirectCreditRequest: (data: {
    companyName: string;
    registrationNumber: string;
    sector: string;
    companySeniorityMonths: number;
    projectDescription: string;
    requestedAmount: string;
    currency: AccountCurrency;
    declaredMonthlyRevenue: string;
    declaredMonthlyExpenses: string;
    guaranteeOffered: string;
  }) =>
    request<DirectCreditRequest>("/direct-credit-requests", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  listDirectCreditRequests: (userId: string) =>
    request<DirectCreditRequest[]>(`/users/${userId}/direct-credit-requests`),
  // Investissement direct — userId dérivé du cookie de session côté serveur, comme
  // createCreditRequest ci-dessous.
  getInvestmentRates: () => request<InvestmentRates>("/investment/rates"),
  getInvestmentAssets: () => request<InvestmentAssets>("/investment/assets"),
  getInvestmentHistory: () => request<InvestmentHistory>("/investment/history"),
  getFixedTermPlans: () =>
    request<FixedTermPlan[]>("/investment/fixed-term-plans"),
  depositInvestment: (basket: InvestmentBasket, amount: string) =>
    request<InvestmentPosition>("/investment/deposit", {
      method: "POST",
      body: JSON.stringify({ basket, amount }),
    }),
  withdrawInvestment: (basket: InvestmentBasket) =>
    request<{ balance: LedgerBalance; withdrawnAmount: string }>("/investment/withdraw", {
      method: "POST",
      body: JSON.stringify({ basket }),
    }),
  listInvestmentPositions: (userId: string) =>
    request<InvestmentPosition[]>(`/users/${userId}/investment-positions`),
  // Bloqué jusqu'à l'échéance dès la confirmation (§6 entrée #30) — aucun endpoint de
  // retrait n'existe pour ce mode, contrairement à withdrawInvestment ci-dessus.
  depositFixedTerm: (plan: FixedTermPlanId, amount: string) =>
    request<FixedTermPosition>("/investment/fixed-term/deposit", {
      method: "POST",
      body: JSON.stringify({ plan, amount }),
    }),
  listFixedTermPositions: (userId: string) =>
    request<FixedTermPosition[]>(`/users/${userId}/fixed-term-positions`),
  // Wallet investissement (cf. §2H CLAUDE.md entrée #31) — virement interne instantané,
  // seul moyen d'alimenter ou de vider investmentBalance.
  transferToInvestmentWallet: (amount: string) =>
    request<LedgerBalance>("/investment/wallet/transfer-in", {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),
  transferFromInvestmentWallet: (amount: string) =>
    request<LedgerBalance>("/investment/wallet/transfer-out", {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),
  // userId n'est plus envoyé : dérivé côté serveur du cookie de session (JwtAuthGuard).
  createCreditRequest: (collateralAmount: string, currency: AccountCurrency) =>
    request<CreditRequest>("/credit-requests", {
      method: "POST",
      body: JSON.stringify({ collateralAmount, currency }),
    }),
  listCreditRequests: (userId: string) =>
    request<CreditRequest[]>(`/users/${userId}/credit-requests`),
  // Routes back-office (JwtAuthGuard + AdminGuard côté API) — le rôle est vérifié depuis
  // la session, pas depuis une valeur envoyée par le client.
  listPendingCreditRequests: () =>
    request<CreditRequest[]>("/credit-requests/pending"),
  approveCreditRequest: (id: string) =>
    request<CreditRequest>(`/credit-requests/${id}/approve`, { method: "POST" }),
  rejectCreditRequest: (id: string) =>
    request<CreditRequest>(`/credit-requests/${id}/reject`, { method: "POST" }),
  // Validation manuelle des dépôts sur adresse mutualisée (back-office).
  listPendingDepositIntents: () =>
    request<PendingDepositIntent[]>("/admin/deposit-intents/pending"),
  confirmDepositIntent: (transactionId: string, referenceTx?: string) =>
    request<{ balance: LedgerBalance; transaction: TransactionRecord }>(
      `/admin/deposit-intents/${transactionId}/confirm`,
      { method: "PATCH", body: JSON.stringify({ referenceTx }) },
    ),
  rejectDepositIntent: (transactionId: string) =>
    request<TransactionRecord>(`/admin/deposit-intents/${transactionId}/reject`, {
      method: "PATCH",
    }),
  runYieldAccrual: () =>
    request<{ positionId: string; applied: boolean; yieldAmount: string }[]>(
      "/credit/yield/run",
      { method: "POST" },
    ),
  // Bot de trésorerie en SIMULATION (paper trading) — aucun ordre réel, aucun fonds ne
  // bouge (cf. TreasuryBotService). Réservé au back-office.
  getTreasuryBotHistory: (limit?: number) =>
    request<TreasuryBotRun[]>(
      `/admin/treasury-bot/history${limit ? `?limit=${limit}` : ""}`,
    ),
  runTreasuryBotNow: () =>
    request<TreasuryBotRun>("/admin/treasury-bot/run", { method: "POST" }),
  backfillTreasuryBotHistory: (days?: number) =>
    request<{ created: number }>(
      `/admin/treasury-bot/backfill${days ? `?days=${days}` : ""}`,
      { method: "POST" },
    ),

  // Demande d'ouverture de compte — public (aucune session requise, c'est justement le
  // point d'entrée pour quelqu'un qui n'a pas encore de compte), cf. app/page.tsx.
  createAccountRequest: (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    message?: string;
    accountType?: AccountType;
  }) =>
    request<AccountOpeningRequest>("/account-requests", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  // Back-office (JwtAuthGuard + AdminGuard côté API).
  listPendingAccountRequests: () =>
    request<AccountOpeningRequest[]>("/account-requests/pending"),
  getAccountCapacity: () =>
    request<ClientAccountCapacity>("/account-requests/capacity"),
  approveAccountRequest: (id: string) =>
    request<ApproveAccountRequestResult>(`/account-requests/${id}/approve`, {
      method: "POST",
    }),
  rejectAccountRequest: (id: string) =>
    request<AccountOpeningRequest>(`/account-requests/${id}/reject`, {
      method: "POST",
    }),
  generateRequestDepositAddress: (id: string, chain: Chain, currency: AcceptedCurrency) =>
    request<WalletRecord>(`/credit-requests/${id}/deposit-address`, {
      method: "POST",
      body: JSON.stringify({ chain, currency }),
    }),
  repayCredit: (amount: string) =>
    request<RepayCreditResult>("/credit/repay", {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),
  createDepositAddress: (chain: Chain, currency: AcceptedCurrency) =>
    request<WalletRecord>("/wallets/deposit-address", {
      method: "POST",
      body: JSON.stringify({ chain, currency }),
    }),
  // Adresse "pool" pour un actif/réseau donné — répond 404 (ApiError.status) si cet
  // actif n'est pas géré via ce flux, auquel cas on retombe sur createDepositAddress.
  getManagedDepositAddress: (currency: AcceptedCurrency, chain: Chain = "ETHEREUM") =>
    request<ManagedDepositAddress>(
      `/managed-deposit-addresses/${currency}?chain=${chain}`,
    ),
  declareDeposit: (
    userId: string,
    chain: Chain,
    currency: AcceptedCurrency,
    tokenAmount: string,
  ) =>
    request<TransactionRecord>(`/users/${userId}/deposit-intents`, {
      method: "POST",
      body: JSON.stringify({ chain, currency, tokenAmount }),
    }),
  requestWithdrawal: (payload: WithdrawalRequest) =>
    request<WithdrawalResult>("/withdrawals", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createCardTopup: (amount: string) =>
    request<CardTopupResult>("/payments/card-topup", {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),
  getCardTopupStatus: (paymentId: string) =>
    request<PaymentStatus>(`/payments/${paymentId}`),
  confirmCardTopup: (paymentId: string) =>
    request<ConfirmPaymentResult>("/payments/mollie-webhook", {
      method: "POST",
      body: JSON.stringify({ id: paymentId }),
    }),

  // Fiche client 360 back-office — "noyau essentiel" en base réelle (identité, adresses,
  // emploi, finances, notes), cf. backend/src/admin-clients. Réservé au rôle ADMIN côté
  // API (JwtAuthGuard + AdminGuard). Le détail est shape-compatible avec AdminClient
  // (cf. lib/admin-mock-data.ts) : les mêmes composants d'écran (ClientDetailView et ses
  // onglets) servent aussi bien les données de démonstration que les vraies.
  listAdminClients: () => request<AdminClientSummary[]>("/admin/clients"),
  getAdminClientDetail: (userId: string) =>
    request<AdminClient>(`/admin/clients/${userId}`),
  updateAdminClientProfile: (userId: string, dto: UpdateClientProfileInput) =>
    request<AdminClient>(`/admin/clients/${userId}/profile`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    }),
  updateAdminClientAddresses: (userId: string, addresses: AdminAddressInput[]) =>
    request<AdminClient>(`/admin/clients/${userId}/addresses`, {
      method: "PUT",
      body: JSON.stringify({ addresses }),
    }),
  updateAdminClientEmployment: (userId: string, dto: UpdateEmploymentInput) =>
    request<AdminClient>(`/admin/clients/${userId}/employment`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    }),
  updateAdminClientFinancials: (userId: string, dto: UpdateFinancialsInput) =>
    request<AdminClient>(`/admin/clients/${userId}/financials`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    }),
  updateAdminClientIdentityDocument: (
    userId: string,
    dto: IdentityDocumentInput & { verified?: boolean },
  ) =>
    request<AdminClient>(`/admin/clients/${userId}/identity-document`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    }),
  updateAdminClientAmlProfile: (
    userId: string,
    dto: {
      isPoliticallyExposed?: boolean;
      fundsOrigin?: FundsOrigin[];
      fundsOriginOther?: string;
      relationshipPurpose?: RelationshipPurpose[];
      attestationCity?: string;
    },
  ) =>
    request<AdminClient>(`/admin/clients/${userId}/aml-profile`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    }),
  // "Avis de conformité : Validé / Refusé" — répercute aussi User.kycStatus côté backend
  // (cf. AdminClientsService.decideKyc).
  decideClientKyc: (
    userId: string,
    dto: { decision: KycReviewDecision; riskLevel?: AmlRiskLevel },
  ) =>
    request<AdminClient>(`/admin/clients/${userId}/kyc-decision`, {
      method: "POST",
      body: JSON.stringify(dto),
    }),
  // Fichiers KYC réels côté back-office — même stockage que listUserKycDocuments,
  // jamais une seconde source (cf. AdminClientsController, KycDocumentsService partagé).
  listAdminClientKycDocuments: (userId: string) =>
    request<KycDocumentSummary[]>(`/admin/clients/${userId}/documents`),
  getAdminKycDocumentDownloadUrl: (userId: string, documentId: string) =>
    `${API_URL}/admin/clients/${userId}/documents/${documentId}/download`,
  setAdminKycDocumentVerified: (userId: string, documentId: string, verified: boolean) =>
    request<KycDocumentSummary[]>(`/admin/clients/${userId}/documents/${documentId}`, {
      method: "PATCH",
      body: JSON.stringify({ verified }),
    }),
  deleteAdminKycDocument: (userId: string, documentId: string) =>
    request<KycDocumentSummary[]>(`/admin/clients/${userId}/documents/${documentId}`, {
      method: "DELETE",
    }),
  listAdminClientNotes: (userId: string) =>
    request<AdminNoteRecord[]>(`/admin/clients/${userId}/notes`),
  addAdminClientNote: (userId: string, content: string) =>
    request<AdminNoteRecord[]>(`/admin/clients/${userId}/notes`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
};
