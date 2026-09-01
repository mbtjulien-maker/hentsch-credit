import type { AdminClient, AdminContract, DecisionStatus } from "@/lib/admin-mock-data";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export type KycStatus = "PENDING" | "VERIFIED" | "REJECTED";

export type CardStatus = "PENDING" | "ACTIVE" | "BLOCKED" | "CLOSED";

export type Chain = "ETHEREUM" | "POLYGON" | "ARBITRUM" | "TRON" | "SOLANA";

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
  high24h: string | null;
  low24h: string | null;
  volume24h: string | null;
  marketCap: string | null;
  sparkline7d: number[];
}

// Performance sur 12 mois d'un actif générateur de rendement (page /rendement) — 365
// jours est le maximum disponible sur le plan gratuit CoinGecko, affiché honnêtement
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
  dateOfBirth?: string;
  placeOfBirth?: string;
  nationality?: string;
  maritalStatus?: string;
  dependents?: number;
  phone?: string;
  clientType?: "PARTICULIER" | "INDEPENDANT" | "ENTREPRISE";
}

export interface AdminAddressInput {
  label: "DOMICILE" | "FISCALE" | "POSTALE" | "PROFESSIONNELLE";
  street: string;
  city: string;
  postalCode: string;
  country: string;
  residenceType?: string;
  since?: string;
  verified?: boolean;
}

export interface UpdateEmploymentInput {
  isIndependent?: boolean;
  status?: string;
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
  employer: string | null;
  sector: string | null;
  role: string | null;
  seniority: string | null;
  annualIncome: number | null;
  monthlyIncome: number | null;
  contractType: string | null;
  verified: boolean;
  activity: string | null;
  turnover: number | null;
  netResult: number | null;
}

export interface ClientProfileView {
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  nationality: string | null;
  maritalStatus: string | null;
  dependents: number | null;
  clientType: "PARTICULIER" | "INDEPENDANT" | "ENTREPRISE";
  addresses: ClientProfileAddress[];
  employment: ClientProfileEmployment | null;
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
  listAdminClientNotes: (userId: string) =>
    request<AdminNoteRecord[]>(`/admin/clients/${userId}/notes`),
  addAdminClientNote: (userId: string, content: string) =>
    request<AdminNoteRecord[]>(`/admin/clients/${userId}/notes`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
};
