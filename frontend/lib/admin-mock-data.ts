// Données fictives — interface Admin (back-office néobanque). Volontairement non
// branchées sur l'API réelle : cette zone est une démonstration d'IA/UX "Banking
// Operations" premium, cf. brief. Tout est déterministe (aucun Math.random()/Date.now()
// au niveau module) pour éviter tout écart d'hydratation SSR/CSR.

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type AccountStatusAdmin = "ACTIVE" | "SUSPENDED" | "CLOSED" | "PENDING";
export type KycStatusAdmin = "VERIFIED" | "PENDING" | "REJECTED" | "INCOMPLETE";
export type DocumentStatus = "VERIFIED" | "TO_VERIFY" | "REJECTED" | "PENDING";
export type DecisionStatus = "PENDING" | "APPROVED" | "REJECTED" | "ON_HOLD" | "ANALYSIS" | "INFO_REQUESTED";
export type ClientType = "Particulier" | "Indépendant" | "Entreprise";

// Cycle de vie du contrat — étape "Contrat" du parcours dossier (cf. DOSSIER_STEPS,
// entre "Décision" et "Décaissement"). Dérivé de l'étape courante du dossier plutôt que
// stocké indépendamment : évite tout état incohérent entre le contrat et le parcours.
export type ContractStatus = "NOT_GENERATED" | "SENT" | "COUNTERSIGNED";

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  NOT_GENERATED: "Non généré",
  SENT: "Envoyé, en attente de signature",
  COUNTERSIGNED: "Signé et contresigné",
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  LOW: "Risque faible",
  MEDIUM: "Risque modéré",
  HIGH: "Risque élevé",
};

export const ACCOUNT_STATUS_LABELS: Record<AccountStatusAdmin, string> = {
  ACTIVE: "Actif",
  SUSPENDED: "Suspendu",
  CLOSED: "Clôturé",
  PENDING: "En attente",
};

export const KYC_STATUS_LABELS_ADMIN: Record<KycStatusAdmin, string> = {
  VERIFIED: "KYC vérifié",
  PENDING: "KYC en attente",
  REJECTED: "KYC refusé",
  INCOMPLETE: "KYC incomplet",
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  VERIFIED: "Vérifié",
  TO_VERIFY: "À vérifier",
  REJECTED: "Refusé",
  PENDING: "En attente",
};

export const DECISION_STATUS_LABELS: Record<DecisionStatus, string> = {
  PENDING: "En attente",
  APPROVED: "Approuvé",
  REJECTED: "Refusé",
  ON_HOLD: "En pause",
  ANALYSIS: "En analyse",
  INFO_REQUESTED: "Document demandé",
};

export interface AdminAddress {
  label: "Domicile" | "Fiscale" | "Postale" | "Professionnelle";
  street: string;
  city: string;
  postalCode: string;
  country: string;
  residenceType: string;
  since: string;
  verified: boolean;
  verifiedAt: string | null;
}

export interface AdminDocument {
  id: string;
  category: "Identité" | "Domicile" | "Revenus" | "Banque" | "Crédit";
  name: string;
  type: string;
  depositedAt: string;
  size: string;
  status: DocumentStatus;
  verifiedBy: string | null;
  verifiedAt: string | null;
}

export interface AdminBankAccount {
  id: string;
  type: string;
  ibanMasked: string;
  currency: string;
  balance: number;
  available: number;
  status: AccountStatusAdmin;
}

export interface AdminGuarantee {
  type: string;
  description: string;
  owner: string;
  declaredValue: number;
  retainedValue: number;
  documents: string[];
  evaluatedAt: string;
  verified: boolean;
}

export interface AdminHistoryEntry {
  date: string;
  time: string;
  user: string;
  action: string;
  result: string;
}

export interface AdminNote {
  author: string;
  date: string;
  time: string;
  content: string;
}

export interface AdminContract {
  reference: string;
  status: ContractStatus;
  generatedAt: string | null;
  sentAt: string | null;
  signedAt: string | null;
  countersignedAt: string | null;
  nominalRate: number;
  apr: number;
  totalInterest: number;
  totalRepayable: number;
  documentName: string;
  documentSize: string;
}

export interface AdminAuditEntry {
  date: string;
  time: string;
  user: string;
  role: string;
  action: string;
  target: string;
  result: string;
}

export interface AdminClient {
  id: string;
  // Identifiant réel (UUID) du User en base — présent uniquement quand cette fiche vient
  // de l'API réelle (cf. lib/api.ts getAdminClientDetail), absent pour les clients de
  // démonstration ci-dessous. Sert à distinguer "cette fiche peut être modifiée /
  // commentée pour de vrai" (ex. NotesSupportTab) d'une fiche purement fictive.
  userId?: string;
  firstName: string;
  lastName: string;
  initials: string;
  clientType: ClientType;
  registeredAt: string;
  accountStatus: AccountStatusAdmin;
  kycStatus: KycStatusAdmin;
  riskLevel: RiskLevel;
  riskScore: number;

  personalInfo: {
    dateOfBirth: string;
    placeOfBirth: string;
    nationality: string;
    maritalStatus: string;
    dependents: number;
    phone: string;
    email: string;
  };

  addresses: AdminAddress[];

  employment: {
    isIndependent: boolean;
    status: string;
    employer?: string;
    sector?: string;
    role?: string;
    seniority: string;
    annualIncome: number;
    monthlyIncome: number;
    contractType?: string;
    verified: boolean;
    activity?: string;
    turnover?: number;
    netResult?: number;
  };

  financials: {
    income: { salary: number; additional: number; professional: number; other: number };
    expenses: {
      rent: number;
      mortgage: number;
      autoLoan: number;
      otherLoans: number;
      pension: number;
      recurring: number;
      other: number;
    };
    assets: {
      bankAccounts: number;
      savings: number;
      realEstate: number;
      vehicles: number;
      investments: number;
      other: number;
    };
    liabilities: {
      mortgage: number;
      autoLoan: number;
      personalLoan: number;
      debts: number;
      other: number;
    };
  };

  bankAccounts: AdminBankAccount[];

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

  documents: AdminDocument[];

  kyc: {
    identity: DocumentStatus;
    address: DocumentStatus;
    idDocument: DocumentStatus;
    biometric: DocumentStatus;
    verifiedAt: string | null;
    status: KycStatusAdmin;
    alerts: string[];
  };

  riskScoring: {
    score: number;
    level: RiskLevel;
    repaymentCapacity: number;
    incomeStability: number;
    debtRatio: number;
    paymentHistory: number;
    professionalStability: number;
    fileCompleteness: number;
  };

  dossierStatus: {
    currentStepIndex: number;
    steps: { key: string; label: string; date: string | null }[];
  };
  // Présent uniquement sur une fiche réelle (cf. lib/api.ts AdminClientSummary/
  // getAdminClientDetail) — la catégorisation à 4 valeurs dérivée du vrai statut, pas du
  // parcours fictif ci-dessus. Optionnel pour ne pas casser les clients de démonstration.
  dossierCategory?: "DEMANDE" | "EN_COURS" | "ACTIF" | "CLOTURE" | "AUCUNE";

  creditDecision: {
    analyst: string;
    assignedAt: string;
    status: DecisionStatus;
    summary: string;
    recommendation: string;
  };

  contract: AdminContract;
  guarantees: AdminGuarantee[];
  history: AdminHistoryEntry[];
  notes: AdminNote[];

  support: {
    openTickets: number;
    resolvedTickets: number;
    lastContact: string;
    channels: { type: string; count: number }[];
  };
}

const DOSSIER_STEPS: { key: string; label: string }[] = [
  { key: "SUBMITTED", label: "Demande soumise" },
  { key: "DOCS", label: "Documents reçus" },
  { key: "VERIFICATION", label: "Vérification" },
  { key: "ANALYSIS", label: "Analyse" },
  { key: "DECISION", label: "Décision" },
  { key: "CONTRACT", label: "Contrat" },
  { key: "DISBURSEMENT", label: "Décaissement" },
  { key: "REPAYMENT", label: "Remboursement" },
];

function buildSteps(currentStepIndex: number, baseDate: string): AdminClient["dossierStatus"] {
  const [y, m, d] = baseDate.split("-").map(Number);
  const steps = DOSSIER_STEPS.map((step, i) => {
    if (i > currentStepIndex) return { ...step, date: null };
    const date = new Date(y, m - 1, d + i * 2);
    return {
      ...step,
      date: `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`,
    };
  });
  return { currentStepIndex, steps };
}

const CONTRACT_STEP_INDEX = 5; // "Contrat" dans DOSSIER_STEPS
const DISBURSEMENT_STEP_INDEX = 6; // "Décaissement"

// Dérive l'état du contrat depuis l'étape courante du dossier — jamais stocké
// indépendamment, pour qu'il ne puisse pas diverger de l'étape "Contrat" du parcours
// (cf. section 14 du brief). Tant que le dossier n'a pas atteint cette étape, aucun
// contrat n'existe encore ; à partir du Décaissement, on considère le contrat signé et
// contresigné (le décaissement ne peut légitimement intervenir sans ça).
function buildContract(
  creditRequest: { amountRequested: number; durationMonths: number; estimatedMonthlyPayment: number; proposedRate: number },
  dossierStatus: { currentStepIndex: number; steps: { date: string | null }[] },
  reference: string,
): AdminContract {
  const idx = dossierStatus.currentStepIndex;
  const contractDate = dossierStatus.steps[CONTRACT_STEP_INDEX]?.date ?? null;
  const disbursementDate = dossierStatus.steps[DISBURSEMENT_STEP_INDEX]?.date ?? null;

  const totalRepayable = Math.round(creditRequest.estimatedMonthlyPayment * creditRequest.durationMonths * 100) / 100;
  const totalInterest = Math.round((totalRepayable - creditRequest.amountRequested) * 100) / 100;
  const apr = Math.round((creditRequest.proposedRate + 0.35) * 100) / 100;

  let status: ContractStatus = "NOT_GENERATED";
  let generatedAt: string | null = null;
  let sentAt: string | null = null;
  let signedAt: string | null = null;
  let countersignedAt: string | null = null;

  if (idx === CONTRACT_STEP_INDEX) {
    status = "SENT";
    generatedAt = contractDate;
    sentAt = contractDate;
  } else if (idx > CONTRACT_STEP_INDEX) {
    status = "COUNTERSIGNED";
    generatedAt = contractDate;
    sentAt = contractDate;
    signedAt = contractDate;
    countersignedAt = disbursementDate ?? contractDate;
  }

  return {
    reference,
    status,
    generatedAt,
    sentAt,
    signedAt,
    countersignedAt,
    nominalRate: creditRequest.proposedRate,
    apr,
    totalInterest,
    totalRepayable,
    documentName: `Contrat_credit_${reference}.pdf`,
    documentSize: "412 Ko",
  };
}

// ---------------------------------------------------------------------------
// Client de référence — reprend l'exemple exact du brief (identité, montants).
// ---------------------------------------------------------------------------
const JEAN_CREDIT_REQUEST = {
  id: "CR-2026-008921",
  product: "Crédit personnel (travaux)",
  amountRequested: 25000,
  durationMonths: 60,
  purpose: "Travaux de rénovation",
  estimatedMonthlyPayment: 493.2,
  proposedRate: 6.9,
  requestDate: "26/08/2026",
  status: "ANALYSIS" as DecisionStatus,
};
const JEAN_DOSSIER_STATUS = buildSteps(3, "2026-08-26");

const JEAN_DUPONT: AdminClient = {
  id: "CL-004582",
  firstName: "Jean",
  lastName: "Dupont",
  initials: "JD",
  clientType: "Particulier",
  registeredAt: "12/03/2023",
  accountStatus: "ACTIVE",
  kycStatus: "VERIFIED",
  riskLevel: "LOW",
  riskScore: 742,

  personalInfo: {
    dateOfBirth: "14/06/1985",
    placeOfBirth: "Lyon, France",
    nationality: "Française",
    maritalStatus: "Marié",
    dependents: 2,
    phone: "+33 6 12 34 56 78",
    email: "jean.dupont@example.com",
  },

  addresses: [
    {
      label: "Domicile",
      street: "14 rue des Lilas",
      city: "Lyon",
      postalCode: "69003",
      country: "France",
      residenceType: "Propriétaire",
      since: "2019",
      verified: true,
      verifiedAt: "15/03/2023",
    },
    {
      label: "Fiscale",
      street: "14 rue des Lilas",
      city: "Lyon",
      postalCode: "69003",
      country: "France",
      residenceType: "Identique au domicile",
      since: "2019",
      verified: true,
      verifiedAt: "15/03/2023",
    },
  ],

  employment: {
    isIndependent: false,
    status: "Salarié",
    employer: "Techneo Industries SA",
    sector: "Industrie manufacturière",
    role: "Ingénieur responsable production",
    seniority: "7 ans",
    annualIncome: 58800,
    monthlyIncome: 4900,
    contractType: "CDI",
    verified: true,
  },

  financials: {
    income: { salary: 4900, additional: 0, professional: 0, other: 150 },
    expenses: {
      rent: 0,
      mortgage: 1120,
      autoLoan: 285,
      otherLoans: 0,
      pension: 0,
      recurring: 340,
      other: 120,
    },
    assets: {
      bankAccounts: 22400,
      savings: 38500,
      realEstate: 320000,
      vehicles: 18000,
      investments: 12400,
      other: 0,
    },
    liabilities: {
      mortgage: 187000,
      autoLoan: 8200,
      personalLoan: 0,
      debts: 0,
      other: 0,
    },
  },

  bankAccounts: [
    {
      id: "acc-1",
      type: "Compte courant EUR",
      ibanMasked: "•••• 4582",
      currency: "EUR",
      balance: 18500,
      available: 17900,
      status: "ACTIVE",
    },
    {
      id: "acc-2",
      type: "Livret épargne",
      ibanMasked: "•••• 7723",
      currency: "EUR",
      balance: 38500,
      available: 38500,
      status: "ACTIVE",
    },
  ],

  creditRequest: JEAN_CREDIT_REQUEST,

  documents: [
    { id: "doc-1", category: "Identité", name: "Carte d'identité (recto/verso)", type: "PDF", depositedAt: "26/08/2026", size: "1,2 Mo", status: "VERIFIED", verifiedBy: "Agent #204", verifiedAt: "27/08/2026" },
    { id: "doc-2", category: "Identité", name: "Vérification biométrique", type: "Selfie", depositedAt: "26/08/2026", size: "0,8 Mo", status: "VERIFIED", verifiedBy: "Système", verifiedAt: "26/08/2026" },
    { id: "doc-3", category: "Domicile", name: "Facture d'électricité", type: "PDF", depositedAt: "26/08/2026", size: "0,4 Mo", status: "VERIFIED", verifiedBy: "Agent #204", verifiedAt: "27/08/2026" },
    { id: "doc-4", category: "Revenus", name: "3 derniers bulletins de salaire", type: "PDF", depositedAt: "26/08/2026", size: "2,1 Mo", status: "VERIFIED", verifiedBy: "Agent #204", verifiedAt: "27/08/2026" },
    { id: "doc-5", category: "Revenus", name: "Contrat de travail", type: "PDF", depositedAt: "26/08/2026", size: "1,0 Mo", status: "TO_VERIFY", verifiedBy: null, verifiedAt: null },
    { id: "doc-6", category: "Revenus", name: "Avis d'imposition 2025", type: "PDF", depositedAt: "27/08/2026", size: "0,6 Mo", status: "VERIFIED", verifiedBy: "Agent #204", verifiedAt: "28/08/2026" },
    { id: "doc-7", category: "Banque", name: "Relevés bancaires (3 mois)", type: "PDF", depositedAt: "27/08/2026", size: "3,4 Mo", status: "VERIFIED", verifiedBy: "Agent #204", verifiedAt: "28/08/2026" },
    { id: "doc-8", category: "Crédit", name: "Devis travaux de rénovation", type: "PDF", depositedAt: "27/08/2026", size: "0,9 Mo", status: "TO_VERIFY", verifiedBy: null, verifiedAt: null },
  ],

  kyc: {
    identity: "VERIFIED",
    address: "VERIFIED",
    idDocument: "VERIFIED",
    biometric: "VERIFIED",
    verifiedAt: "27/08/2026",
    status: "VERIFIED",
    alerts: [],
  },

  riskScoring: {
    score: 742,
    level: "LOW",
    repaymentCapacity: 88,
    incomeStability: 92,
    debtRatio: 31,
    paymentHistory: 96,
    professionalStability: 85,
    fileCompleteness: 90,
  },

  dossierStatus: JEAN_DOSSIER_STATUS,
  contract: buildContract(JEAN_CREDIT_REQUEST, JEAN_DOSSIER_STATUS, "CTR-2026-008921"),

  creditDecision: {
    analyst: "Analyste Crédit #204",
    assignedAt: "27/08/2026",
    status: "ANALYSIS",
    summary:
      "Dossier complet. Revenus stables sur 7 ans d'ancienneté, taux d'endettement à 31% après opération. Aucun incident de paiement recensé.",
    recommendation: "Favorable, sous réserve de la vérification finale du devis travaux.",
  },

  guarantees: [],

  history: [
    { date: "28/08/2026", time: "09:20", user: "Agent #204", action: "Consultation du dossier de crédit", result: "—" },
    { date: "28/08/2026", time: "09:25", user: "Système", action: "Vérification documentaire terminée", result: "6/8 documents vérifiés" },
    { date: "27/08/2026", time: "16:40", user: "Agent #204", action: "Ajout d'une note interne", result: "—" },
    { date: "27/08/2026", time: "11:05", user: "Jean Dupont", action: "Document ajouté : avis d'imposition", result: "Reçu" },
    { date: "26/08/2026", time: "18:12", user: "Jean Dupont", action: "Demande de crédit soumise", result: "CR-2026-008921" },
    { date: "26/08/2026", time: "18:10", user: "Jean Dupont", action: "Connexion", result: "Succès" },
  ],

  notes: [
    {
      author: "Analyste Crédit #204",
      date: "28/08/2026",
      time: "09:20",
      content: "Dossier complet. Revenus stables. Capacité de remboursement satisfaisante.",
    },
    {
      author: "Agent KYC #118",
      date: "27/08/2026",
      time: "14:02",
      content: "Vérification biométrique conforme au document d'identité. Aucune anomalie détectée.",
    },
  ],

  support: {
    openTickets: 0,
    resolvedTickets: 3,
    lastContact: "27/08/2026",
    channels: [
      { type: "E-mails", count: 4 },
      { type: "Appels", count: 1 },
      { type: "Conversations", count: 2 },
    ],
  },
};

// ---------------------------------------------------------------------------
// Génération déterministe d'un jeu de clients additionnels pour la liste.
// ---------------------------------------------------------------------------
const NAMES: [string, string][] = [
  ["Sophie", "Martin"],
  ["Karim", "Benali"],
  ["Elena", "Rossi"],
  ["Thomas", "Weber"],
  ["Amélie", "Girard"],
  ["Lucas", "Fontaine"],
  ["Nadia", "Haddad"],
  ["Marc", "Lefevre"],
  ["Chiara", "Bianchi"],
];

const CITIES = ["Genève", "Lausanne", "Zurich", "Bâle", "Nyon", "Montreux", "Fribourg", "Sion", "Neuchâtel"];
const SECTORS = ["Finance", "Santé", "Technologie", "Industrie", "Commerce", "Éducation", "Immobilier", "Conseil", "Artisanat"];
const RISK_CYCLE: RiskLevel[] = ["LOW", "LOW", "MEDIUM", "LOW", "HIGH", "MEDIUM", "LOW", "MEDIUM", "LOW"];
const DECISION_CYCLE: DecisionStatus[] = [
  "ANALYSIS",
  "APPROVED",
  "PENDING",
  "APPROVED",
  "INFO_REQUESTED",
  "ON_HOLD",
  "APPROVED",
  "ANALYSIS",
  "REJECTED",
];
const STEP_CYCLE = [2, 6, 1, 7, 3, 0, 5, 3, 4];

function buildGeneratedClient(index: number): AdminClient {
  const [firstName, lastName] = NAMES[index];
  const city = CITIES[index];
  const sector = SECTORS[index];
  const risk = RISK_CYCLE[index];
  const decision = DECISION_CYCLE[index];
  const isIndependent = index === 2 || index === 6;
  const score = risk === "LOW" ? 700 + index * 8 : risk === "MEDIUM" ? 560 + index * 6 : 420 + index * 5;
  const monthlyIncome = 3200 + index * 340;
  const amountRequested = 8000 + index * 3500;
  const clientNum = String(4600 + index * 37).padStart(6, "0");
  const crNum = String(9012 + index * 41).padStart(6, "0");

  const kyc: KycStatusAdmin = index === 8 ? "REJECTED" : index === 5 ? "PENDING" : index === 3 ? "INCOMPLETE" : "VERIFIED";
  const accountStatus: AccountStatusAdmin = index === 8 ? "SUSPENDED" : index === 4 ? "PENDING" : "ACTIVE";

  const creditRequest = {
    id: `CR-2026-${crNum}`,
    product: isIndependent ? "Crédit professionnel" : "Crédit personnel",
    amountRequested,
    durationMonths: 36 + index * 6,
    purpose: ["Travaux de rénovation", "Achat véhicule", "Trésorerie", "Regroupement de crédits", "Projet personnel"][index % 5],
    estimatedMonthlyPayment: Math.round((amountRequested / (36 + index * 6)) * 1.08 * 100) / 100,
    proposedRate: 5.9 + (index % 4) * 0.4,
    requestDate: `2${index}/08/2026`,
    status: decision,
  };
  const dossierStatus = buildSteps(STEP_CYCLE[index], `2026-08-${10 + index}`);

  return {
    id: `CL-${clientNum}`,
    firstName,
    lastName,
    initials: `${firstName[0]}${lastName[0]}`,
    clientType: isIndependent ? "Indépendant" : "Particulier",
    registeredAt: `0${(index % 9) + 1}/0${((index + 2) % 9) + 1}/2024`,
    accountStatus,
    kycStatus: kyc,
    riskLevel: risk,
    riskScore: score,

    personalInfo: {
      dateOfBirth: `1${index}/0${((index + 3) % 9) + 1}/${1978 + index}`,
      placeOfBirth: `${city}, Suisse`,
      nationality: "Suisse",
      maritalStatus: index % 2 === 0 ? "Célibataire" : "Marié(e)",
      dependents: index % 3,
      phone: `+41 7${index} ${100 + index}${" "}${20 + index} ${30 + index}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
    },

    addresses: [
      {
        label: "Domicile",
        street: `${10 + index} avenue de la Gare`,
        city,
        postalCode: `${1000 + index * 12}`,
        country: "Suisse",
        residenceType: index % 2 === 0 ? "Locataire" : "Propriétaire",
        since: `${2016 + index}`,
        verified: kyc === "VERIFIED",
        verifiedAt: kyc === "VERIFIED" ? "15/03/2024" : null,
      },
    ],

    employment: isIndependent
      ? {
          isIndependent: true,
          status: "Indépendant",
          seniority: `${3 + index} ans`,
          annualIncome: monthlyIncome * 12,
          monthlyIncome,
          verified: kyc === "VERIFIED",
          activity: `Consultant, ${sector}`,
          turnover: monthlyIncome * 16,
          netResult: monthlyIncome * 11,
        }
      : {
          isIndependent: false,
          status: "Salarié",
          employer: `${sector} Partners SA`,
          sector,
          role: "Chargé(e) de mission",
          seniority: `${2 + index} ans`,
          annualIncome: monthlyIncome * 12,
          monthlyIncome,
          contractType: index % 4 === 0 ? "CDD" : "CDI",
          verified: kyc === "VERIFIED",
        },

    financials: {
      income: { salary: isIndependent ? 0 : monthlyIncome, additional: 0, professional: isIndependent ? monthlyIncome : 0, other: 0 },
      expenses: {
        rent: index % 2 === 0 ? 1400 + index * 20 : 0,
        mortgage: index % 2 !== 0 ? 900 + index * 30 : 0,
        autoLoan: index % 3 === 0 ? 210 : 0,
        otherLoans: 0,
        pension: 0,
        recurring: 260 + index * 8,
        other: 90,
      },
      assets: {
        bankAccounts: 6000 + index * 900,
        savings: 4000 + index * 1200,
        realEstate: index % 2 !== 0 ? 280000 + index * 5000 : 0,
        vehicles: 6000 + index * 400,
        investments: index * 1100,
        other: 0,
      },
      liabilities: {
        mortgage: index % 2 !== 0 ? 165000 + index * 2000 : 0,
        autoLoan: index % 3 === 0 ? 5200 : 0,
        personalLoan: 0,
        debts: 0,
        other: 0,
      },
    },

    bankAccounts: [
      {
        id: `acc-${index}-1`,
        type: "Compte courant CHF",
        ibanMasked: `•••• ${1000 + index * 73}`,
        currency: "CHF",
        balance: 6000 + index * 900,
        available: 5600 + index * 850,
        status: accountStatus,
      },
    ],

    creditRequest,

    documents: [
      { id: `doc-${index}-1`, category: "Identité", name: "Carte d'identité", type: "PDF", depositedAt: `2${index}/08/2026`, size: "1,1 Mo", status: kyc === "VERIFIED" ? "VERIFIED" : "TO_VERIFY", verifiedBy: kyc === "VERIFIED" ? "Agent #118" : null, verifiedAt: kyc === "VERIFIED" ? "27/08/2026" : null },
      { id: `doc-${index}-2`, category: "Revenus", name: "Bulletins de salaire", type: "PDF", depositedAt: `2${index}/08/2026`, size: "1,8 Mo", status: index === 8 ? "REJECTED" : "VERIFIED", verifiedBy: "Agent #118", verifiedAt: "27/08/2026" },
      { id: `doc-${index}-3`, category: "Banque", name: "Relevés bancaires", type: "PDF", depositedAt: `2${index}/08/2026`, size: "2,4 Mo", status: index === 5 ? "PENDING" : "VERIFIED", verifiedBy: index === 5 ? null : "Agent #118", verifiedAt: index === 5 ? null : "27/08/2026" },
    ],

    kyc: {
      identity: kyc === "VERIFIED" ? "VERIFIED" : "TO_VERIFY",
      address: kyc === "VERIFIED" ? "VERIFIED" : "PENDING",
      idDocument: kyc === "VERIFIED" ? "VERIFIED" : "TO_VERIFY",
      biometric: kyc === "REJECTED" ? "REJECTED" : "VERIFIED",
      verifiedAt: kyc === "VERIFIED" ? "27/08/2026" : null,
      status: kyc,
      alerts: kyc === "REJECTED" ? ["Document d'identité illisible, nouvelle demande envoyée"] : [],
    },

    riskScoring: {
      score,
      level: risk,
      repaymentCapacity: risk === "LOW" ? 80 + index : risk === "MEDIUM" ? 55 + index : 35 + index,
      incomeStability: risk === "LOW" ? 85 : risk === "MEDIUM" ? 62 : 40,
      debtRatio: risk === "LOW" ? 28 + index : risk === "MEDIUM" ? 38 + index : 52 + index,
      paymentHistory: risk === "HIGH" ? 58 : 90,
      professionalStability: isIndependent ? 65 : 82,
      fileCompleteness: kyc === "VERIFIED" ? 95 : 60,
    },

    dossierStatus,
    contract: buildContract(creditRequest, dossierStatus, `CTR-2026-${crNum}`),

    creditDecision: {
      analyst: `Analyste Crédit #${200 + index}`,
      assignedAt: `2${index}/08/2026`,
      status: decision,
      summary:
        decision === "REJECTED"
          ? "Taux d'endettement trop élevé au regard des revenus déclarés. Documents justificatifs incomplets."
          : "Dossier en cours d'instruction. Éléments financiers globalement cohérents.",
      recommendation:
        decision === "APPROVED"
          ? "Favorable aux conditions standard."
          : decision === "REJECTED"
            ? "Défavorable en l'état."
            : "Analyse complémentaire nécessaire.",
    },

    guarantees:
      amountRequested > 15000
        ? [
            {
              type: "Nantissement",
              description: "Véhicule personnel",
              owner: `${firstName} ${lastName}`,
              declaredValue: 14000,
              retainedValue: 11500,
              documents: ["Carte grise", "Expertise véhicule"],
              evaluatedAt: "26/08/2026",
              verified: kyc === "VERIFIED",
            },
          ]
        : [],

    history: [
      { date: "28/08/2026", time: "09:1" + index, user: `Agent #${200 + index}`, action: "Consultation du dossier de crédit", result: "—" },
      { date: "2" + index + "/08/2026", time: "18:10", user: `${firstName} ${lastName}`, action: "Demande de crédit soumise", result: `CR-2026-${crNum}` },
    ],

    notes: [
      {
        author: `Analyste Crédit #${200 + index}`,
        date: "28/08/2026",
        time: "09:1" + index,
        content:
          decision === "REJECTED"
            ? "Dossier insuffisant en l'état, documents complémentaires demandés."
            : "Dossier en cours d'analyse standard.",
      },
    ],

    support: {
      openTickets: index === 5 ? 1 : 0,
      resolvedTickets: index % 3,
      lastContact: `2${index}/08/2026`,
      channels: [
        { type: "E-mails", count: index % 4 },
        { type: "Appels", count: index % 2 },
        { type: "Conversations", count: index % 3 },
      ],
    },
  };
}

export const ADMIN_CLIENTS: AdminClient[] = [JEAN_DUPONT, ...NAMES.slice(0, 9).map((_, i) => buildGeneratedClient(i))];

export function getAdminClient(id: string): AdminClient | undefined {
  return ADMIN_CLIENTS.find((c) => c.id === id);
}

// ---------------------------------------------------------------------------
// Journal d'audit global (section 21 du brief).
// ---------------------------------------------------------------------------
export const AUDIT_LOG: AdminAuditEntry[] = [
  { date: "28/08/2026", time: "09:20", user: "Agent #204", role: "Analyste crédit", action: "Consultation du dossier de crédit", target: "CR-2026-008921 (Jean Dupont)", result: "Succès" },
  { date: "28/08/2026", time: "09:25", user: "System", role: "Système", action: "Vérification documentaire terminée", target: "CL-004582", result: "6/8 documents vérifiés" },
  { date: "28/08/2026", time: "09:30", user: "Agent #204", role: "Analyste crédit", action: "Ajout d'une note interne", target: "CL-004582", result: "Succès" },
  { date: "27/08/2026", time: "16:40", user: "Agent #204", role: "Analyste crédit", action: "Modification du statut de décision", target: "CR-2026-008921", result: "PENDING → ANALYSIS" },
  { date: "27/08/2026", time: "14:02", user: "Agent #118", role: "Conformité KYC", action: "Vérification biométrique", target: "CL-004582", result: "Conforme" },
  { date: "27/08/2026", time: "11:05", user: "Jean Dupont", role: "Client", action: "Document ajouté", target: "Avis d'imposition 2025", result: "Reçu" },
  { date: "26/08/2026", time: "18:12", user: "Jean Dupont", role: "Client", action: "Demande de crédit soumise", target: "CR-2026-008921", result: "Créée" },
  { date: "26/08/2026", time: "10:44", user: "Agent #131", role: "Support", action: "Réponse à un ticket", target: "TCK-11042", result: "Résolu" },
  { date: "25/08/2026", time: "17:02", user: "Admin #002", role: "Administrateur", action: "Modification des paramètres de taux", target: "Grille tarifaire crédit personnel", result: "Succès" },
  { date: "25/08/2026", time: "08:55", user: "Agent #204", role: "Analyste crédit", action: "Refus de dossier", target: "CR-2026-008866 (Chiara Bianchi)", result: "REJECTED" },
];

// ---------------------------------------------------------------------------
// KPIs Dashboard.
// ---------------------------------------------------------------------------
export const DASHBOARD_KPIS = {
  totalClients: 4582,
  activeCreditFiles: 187,
  pendingAnalysis: 34,
  approvedThisMonth: 62,
  totalOutstanding: 18420000,
  avgProcessingDays: 3.4,
  defaultRate: 1.2,
};

export const PIPELINE_COUNTS = [
  { label: "Demande soumise", count: 22 },
  { label: "Documents reçus", count: 18 },
  { label: "Vérification", count: 15 },
  { label: "Analyse", count: 34 },
  { label: "Décision", count: 9 },
  { label: "Contrat", count: 12 },
  { label: "Décaissement", count: 6 },
];
