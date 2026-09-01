import { Injectable } from '@nestjs/common';
import {
  Address,
  ClientNote,
  ClientProfile,
  CreditPosition,
  CreditRequest,
  Employment,
  FinancialSnapshot,
  LedgerBalance,
  Prisma,
  Transaction,
  User,
  Wallet,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CREDIT_RATIO as CREDIT_RATIO_DECIMAL } from '../ledger/ledger.constants';
import { ClientNotFoundException } from '../common/exceptions/admin-client.exceptions';
import { UpdateClientProfileDto } from './dto/update-client-profile.dto';
import { UpdateAddressesDto } from './dto/update-addresses.dto';
import { UpdateEmploymentDto } from './dto/update-employment.dto';
import { UpdateFinancialsDto } from './dto/update-financials.dto';
import { CreateNoteDto } from './dto/create-note.dto';

// Le système réel n'a ni durée/taux/produit sur CreditRequest (juste le gage demandé —
// le crédit est calculé au ratio courant, cf. CLAUDE.md §2A) ni de moteur de scoring :
// ces valeurs par défaut ne servent que de repli quand aucune CreditPosition n'a encore
// figé de conditions réelles (interestRatePct, termMonths...), cf. presentCreditRequest.
// CREDIT_RATIO réutilise la même source que le moteur de crédit (ledger.constants) —
// jamais une seconde valeur codée en dur, pour ne plus jamais désynchroniser les deux.
const CREDIT_RATIO = CREDIT_RATIO_DECIMAL.toNumber();
const DEFAULT_TERM_MONTHS = 12;
const DEFAULT_INTEREST_RATE_PCT = 13.5;

const DOSSIER_STEPS = [
  { key: 'SUBMITTED', label: 'Demande soumise' },
  { key: 'DOCS', label: 'Documents reçus' },
  { key: 'VERIFICATION', label: 'Vérification' },
  { key: 'ANALYSIS', label: 'Analyse' },
  { key: 'DECISION', label: 'Décision' },
  { key: 'CONTRACT', label: 'Contrat' },
  { key: 'DISBURSEMENT', label: 'Décaissement' },
  { key: 'REPAYMENT', label: 'Remboursement' },
] as const;
const CONTRACT_STEP_INDEX = 5;
const DISBURSEMENT_STEP_INDEX = 6;

type UserWithRelations = User & {
  clientProfile?: ClientProfile | null;
  addresses?: Address[];
  employment?: Employment | null;
  financialSnapshot?: FinancialSnapshot | null;
  ledgerBalance?: LedgerBalance | null;
  wallets?: Wallet[];
  creditRequests?: (CreditRequest & {
    creditPosition?: CreditPosition | null;
  })[];
  creditPositions?: CreditPosition[];
  transactions?: Transaction[];
  notes?: (ClientNote & { author: { email: string } })[];
};

// La fiche client 360 (frontend, cf. lib/admin-mock-data.ts) affiche `clientType`
// directement comme libellé — l'enum Prisma (valeurs techniques) est donc traduit ici,
// une seule fois, plutôt que côté frontend.
const CLIENT_TYPE_LABELS: Record<string, string> = {
  PARTICULIER: 'Particulier',
  INDEPENDANT: 'Indépendant',
  ENTREPRISE: 'Entreprise',
};

function fmtDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function fmtTime(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function clientCode(userId: string): string {
  return `CL-${userId.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

function dossierCode(requestId: string, createdAt: Date): string {
  return `CR-${createdAt.getFullYear()}-${requestId.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

function fullName(
  profile: ClientProfile | null | undefined,
  email: string,
): string {
  if (profile?.firstName || profile?.lastName) {
    return `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim();
  }
  return email;
}

function sumJsonValues(block: unknown): number {
  if (!block || typeof block !== 'object') return 0;
  return Object.values(block as Record<string, unknown>).reduce<number>(
    (sum, v) => sum + (typeof v === 'number' ? v : Number(v) || 0),
    0,
  );
}

// Extrait un nombre d'années depuis une ancienneté saisie librement ("7 ans", "3", …) —
// best-effort pour nourrir le score interne (cf. computeRiskScoring), jamais bloquant si
// le format ne correspond pas.
function parseYears(seniority: string | null | undefined): number {
  if (!seniority) return 0;
  const match = /\d+/.exec(seniority);
  return match ? Math.min(40, Number(match[0])) : 0;
}

function computeRiskScoring(
  employment: Employment | null | undefined,
  financialJson: FinancialSnapshot | null | undefined,
  kycStatus: string,
  addressCount: number,
  hasFailedTransaction: boolean,
) {
  const totalIncome = sumJsonValues(financialJson?.income);
  const totalExpenses = sumJsonValues(financialJson?.expenses);
  const debtRatio =
    totalIncome > 0
      ? Math.min(100, Math.round((totalExpenses / totalIncome) * 100))
      : 50;
  const repaymentCapacity = Math.max(5, 100 - debtRatio);

  const seniorityYears = parseYears(employment?.seniority);
  const incomeStability = employment
    ? Math.min(
        100,
        35 + seniorityYears * 6 + (employment.contractType === 'CDI' ? 20 : 0),
      )
    : 30;
  const professionalStability = employment
    ? Math.min(100, 35 + seniorityYears * 7)
    : 30;
  const paymentHistory = hasFailedTransaction ? 55 : 90;

  const completenessChecks = [
    !!employment,
    !!financialJson?.income,
    addressCount > 0,
    kycStatus === 'VERIFIED',
  ];
  const fileCompleteness = Math.round(
    (completenessChecks.filter(Boolean).length / completenessChecks.length) *
      100,
  );

  const composite =
    (repaymentCapacity +
      incomeStability +
      professionalStability +
      paymentHistory +
      fileCompleteness) /
    5;
  const score = Math.round(300 + (composite / 100) * 550);
  const level = score >= 700 ? 'LOW' : score >= 550 ? 'MEDIUM' : 'HIGH';

  return {
    score,
    level,
    repaymentCapacity,
    incomeStability,
    debtRatio,
    paymentHistory,
    professionalStability,
    fileCompleteness,
  };
}

// Le parcours dossier réel n'a pas encore de suivi granulaire "documents reçus" /
// "vérification" / "analyse" distincts (cf. brief admin — ce sont des étapes de
// démonstration) : on retombe sur l'étape la plus proche que le statut réel permet
// d'établir avec certitude, jamais une étape inventée.
function currentStepIndex(
  request:
    (CreditRequest & { creditPosition?: CreditPosition | null }) | undefined,
): number {
  if (!request) return 0;
  switch (request.status) {
    case 'PENDING':
      return 3;
    case 'APPROVED':
      return request.collateralCurrency ? CONTRACT_STEP_INDEX : 4;
    case 'REJECTED':
      return 4;
    case 'FULFILLED':
      return request.creditPosition?.status === 'CLOSED'
        ? 7
        : DISBURSEMENT_STEP_INDEX;
    default:
      return 0;
  }
}

// Catégorie réelle d'un dossier de crédit — utilisée par les 4 pages /admin/credits/*
// pour se répartir les clients (demandes / dossiers en cours / actifs / clôturés), à la
// place du parcours fictif à 8 étapes (DOSSIER_STEPS) qui n'a pas cette granularité en
// base (cf. currentStepIndex). Dérivée uniquement des statuts réels :
// CreditRequestStatus (PENDING/APPROVED/REJECTED/FULFILLED) et, une fois le crédit
// émis, CreditPositionStatus (ACTIVE/CLOSED/LIQUIDATED).
function computeDossierCategory(
  request:
    (CreditRequest & { creditPosition?: CreditPosition | null }) | undefined,
  position: CreditPosition | null,
): 'DEMANDE' | 'EN_COURS' | 'ACTIF' | 'CLOTURE' | 'AUCUNE' {
  if (!request) return 'AUCUNE';
  switch (request.status) {
    case 'PENDING':
      return 'DEMANDE';
    case 'REJECTED':
      return 'CLOTURE';
    case 'APPROVED':
      // Approuvé mais le crédit n'est pas encore émis (le client doit encore déposer le
      // gage, cf. CreditRequestsService.tryAutoFulfill) — toujours "en cours".
      return 'EN_COURS';
    case 'FULFILLED':
      return position?.status === 'ACTIVE' ? 'ACTIF' : 'CLOTURE';
    default:
      return 'AUCUNE';
  }
}

function buildDossierStatus(
  request:
    (CreditRequest & { creditPosition?: CreditPosition | null }) | undefined,
) {
  const idx = currentStepIndex(request);
  const steps = DOSSIER_STEPS.map((step, i) => {
    if (i > idx) return { ...step, date: null as string | null };
    if (i === 0) return { ...step, date: fmtDate(request?.createdAt) };
    if (i === idx) {
      return {
        ...step,
        date: fmtDate(
          request?.fulfilledAt ?? request?.validatedAt ?? request?.createdAt,
        ),
      };
    }
    return { ...step, date: null as string | null };
  });
  return { currentStepIndex: idx, steps };
}

@Injectable()
export class AdminClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const users = await this.prisma.user.findMany({
      where: { role: 'CLIENT' },
      include: {
        clientProfile: true,
        ledgerBalance: true,
        employment: true,
        financialSnapshot: true,
        addresses: true,
        creditRequests: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { creditPosition: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return users.map((u) => this.presentSummary(u));
  }

  async getDetail(userId: string) {
    const user = await this.findClientOrThrow(userId, {
      clientProfile: true,
      addresses: true,
      employment: true,
      financialSnapshot: true,
      ledgerBalance: true,
      wallets: true,
      creditRequests: {
        orderBy: { createdAt: 'desc' },
        include: { creditPosition: true },
      },
      creditPositions: { orderBy: { createdAt: 'desc' } },
      transactions: { orderBy: { createdAt: 'desc' }, take: 20 },
      notes: {
        orderBy: { createdAt: 'desc' },
        include: { author: { select: { email: true } } },
      },
    });
    return this.presentDetail(user);
  }

  async updateProfile(userId: string, dto: UpdateClientProfileDto) {
    await this.assertClientExists(userId);
    const data = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      placeOfBirth: dto.placeOfBirth,
      nationality: dto.nationality,
      maritalStatus: dto.maritalStatus,
      dependents: dto.dependents,
      phone: dto.phone,
      clientType: dto.clientType,
    };
    await this.prisma.clientProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return this.getDetail(userId);
  }

  async updateAddresses(userId: string, dto: UpdateAddressesDto) {
    await this.assertClientExists(userId);
    await this.prisma.$transaction(
      dto.addresses.map((a) =>
        this.prisma.address.upsert({
          where: { userId_label: { userId, label: a.label } },
          create: { userId, ...a },
          update: { ...a },
        }),
      ),
    );
    return this.getDetail(userId);
  }

  async updateEmployment(userId: string, dto: UpdateEmploymentDto) {
    await this.assertClientExists(userId);
    await this.prisma.employment.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: dto,
    });
    return this.getDetail(userId);
  }

  async updateFinancials(userId: string, dto: UpdateFinancialsDto) {
    await this.assertClientExists(userId);
    // Les blocs (revenus/charges/patrimoine/passifs) sont des instances de classe DTO
    // validées par class-validator, pas des littéraux JSON — Prisma exige un
    // InputJsonValue "plat" pour une colonne Json, d'où la sérialisation explicite.
    const data = {
      income: dto.income as unknown as Prisma.InputJsonValue,
      expenses: dto.expenses as unknown as Prisma.InputJsonValue,
      assets: dto.assets as unknown as Prisma.InputJsonValue,
      liabilities: dto.liabilities as unknown as Prisma.InputJsonValue,
    };
    await this.prisma.financialSnapshot.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return this.getDetail(userId);
  }

  async addNote(userId: string, authorUserId: string, dto: CreateNoteDto) {
    await this.assertClientExists(userId);
    await this.prisma.clientNote.create({
      data: { userId, authorUserId, content: dto.content },
    });
    return this.listNotes(userId);
  }

  async listNotes(userId: string) {
    const notes = await this.prisma.clientNote.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { email: true } } },
    });
    return notes.map((n) => ({
      author: n.author.email,
      date: fmtDate(n.createdAt),
      time: fmtTime(n.createdAt),
      content: n.content,
    }));
  }

  private async assertClientExists(userId: string): Promise<void> {
    await this.findClientOrThrow(userId, {});
  }

  private async findClientOrThrow(
    userId: string,
    include: Record<string, unknown>,
  ): Promise<UserWithRelations> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include,
    });
    if (!user || user.role !== 'CLIENT') {
      throw new ClientNotFoundException(userId);
    }
    return user;
  }

  private presentSummary(user: UserWithRelations) {
    const request = user.creditRequests?.[0];
    const position = request?.creditPosition ?? null;
    const riskScoring = computeRiskScoring(
      user.employment,
      user.financialSnapshot,
      user.kycStatus,
      user.addresses?.length ?? 0,
      false,
    );
    // dossierStatus/contract réutilisés tels quels par CreditRequestTable (cf.
    // components/admin/credit-request-table.tsx, partagé par les 4 pages
    // /admin/credits/*) — mêmes fonctions que presentDetail(), une seule logique de
    // présentation du dossier, jamais dupliquée entre liste et détail.
    const creditRequest = this.presentCreditRequest(user, request, position);
    const dossierStatus = buildDossierStatus(request);
    const contract = this.presentContract(creditRequest, dossierStatus, request);

    return {
      id: clientCode(user.id),
      userId: user.id,
      firstName: user.clientProfile?.firstName ?? '',
      lastName: user.clientProfile?.lastName ?? '',
      initials:
        `${user.clientProfile?.firstName?.[0] ?? user.email[0]}${user.clientProfile?.lastName?.[0] ?? ''}`.toUpperCase(),
      clientType:
        CLIENT_TYPE_LABELS[user.clientProfile?.clientType ?? 'PARTICULIER'],
      registeredAt: fmtDate(user.createdAt),
      accountStatus:
        user.kycStatus === 'VERIFIED'
          ? 'ACTIVE'
          : user.kycStatus === 'REJECTED'
            ? 'SUSPENDED'
            : 'PENDING',
      kycStatus: user.kycStatus,
      riskLevel: riskScoring.level,
      riskScore: riskScoring.score,
      // Objet complet (id, product, amountRequested, statut...) — même fonction que
      // presentDetail(), jamais un sous-ensemble recalculé à la main en double : c'est
      // exactement ce qui causait l'incohérence corrigée ici (creditRequest.status
      // utilisait mapDecisionStatus() en double par rapport à ce que la fiche détaillée
      // affiche réellement).
      creditRequest,
      // Catégorie dérivée du statut réel (jamais du parcours à 8 étapes fictif, qui n'a
      // pas de granularité correspondante en base — cf. currentStepIndex) : seule
      // catégorisation utilisée par les 4 pages /admin/credits/* pour se répartir les
      // dossiers, cf. computeDossierCategory.
      dossierCategory: computeDossierCategory(request, position),
      dossierStatus,
      contract,
      email: user.email,
    };
  }

  private presentDetail(user: UserWithRelations) {
    const profile = user.clientProfile ?? null;
    const employment = user.employment ?? null;
    const financials = user.financialSnapshot ?? null;
    const request = user.creditRequests?.[0];
    // Position réellement liée à la demande la plus récente — jamais mélangée à une
    // position plus ancienne et sans rapport (cf. bug corrigé : `guarantees` ci-dessous
    // a légitimement besoin d'un repli sur la dernière position connue du client même
    // sans rapport avec la demande la plus récente, mais `presentCreditRequest` ne doit
    // JAMAIS recevoir la position d'une autre demande — sinon le montant/taux affichés
    // pour CETTE demande viendraient d'un dossier différent).
    const linkedPosition = request?.creditPosition ?? null;
    const position = linkedPosition ?? user.creditPositions?.[0] ?? null;
    const dossierStatus = buildDossierStatus(request);
    const hasFailedTx = (user.transactions ?? []).some(
      (t) => t.status === 'FAILED',
    );
    const riskScoring = computeRiskScoring(
      employment,
      financials,
      user.kycStatus,
      user.addresses?.length ?? 0,
      hasFailedTx,
    );

    const creditRequest = this.presentCreditRequest(
      user,
      request,
      linkedPosition,
    );
    const contract = this.presentContract(
      creditRequest,
      dossierStatus,
      request,
    );

    return {
      id: clientCode(user.id),
      userId: user.id,
      firstName: profile?.firstName ?? '',
      lastName: profile?.lastName ?? '',
      initials:
        `${profile?.firstName?.[0] ?? user.email[0]}${profile?.lastName?.[0] ?? ''}`.toUpperCase(),
      clientType: CLIENT_TYPE_LABELS[profile?.clientType ?? 'PARTICULIER'],
      registeredAt: fmtDate(user.createdAt),
      accountStatus:
        user.kycStatus === 'VERIFIED'
          ? 'ACTIVE'
          : user.kycStatus === 'REJECTED'
            ? 'SUSPENDED'
            : 'PENDING',
      kycStatus: user.kycStatus,
      riskLevel: riskScoring.level,
      riskScore: riskScoring.score,

      personalInfo: {
        dateOfBirth: fmtDate(profile?.dateOfBirth) ?? 'Non renseigné',
        placeOfBirth: profile?.placeOfBirth ?? 'Non renseigné',
        nationality: profile?.nationality ?? 'Non renseignée',
        maritalStatus: profile?.maritalStatus ?? 'Non renseignée',
        dependents: profile?.dependents ?? 0,
        phone: profile?.phone ?? 'Non renseigné',
        email: user.email,
      },

      addresses: (user.addresses ?? []).map((a) => ({
        label: a.label.charAt(0) + a.label.slice(1).toLowerCase(),
        street: a.street,
        city: a.city,
        postalCode: a.postalCode,
        country: a.country,
        residenceType: a.residenceType ?? 'Non renseigné',
        since: a.since ?? '—',
        verified: a.verified,
        verifiedAt: fmtDate(a.verifiedAt),
      })),

      employment: {
        isIndependent: employment?.isIndependent ?? false,
        status: employment?.status ?? 'Non renseigné',
        employer: employment?.employer ?? undefined,
        sector: employment?.sector ?? undefined,
        role: employment?.role ?? undefined,
        seniority: employment?.seniority ?? 'Non renseignée',
        annualIncome: Number(employment?.annualIncome ?? 0),
        monthlyIncome: Number(employment?.monthlyIncome ?? 0),
        contractType: employment?.contractType ?? undefined,
        verified: employment?.verified ?? false,
        activity: employment?.activity ?? undefined,
        turnover: employment?.turnover
          ? Number(employment.turnover)
          : undefined,
        netResult: employment?.netResult
          ? Number(employment.netResult)
          : undefined,
      },

      financials: {
        income: financials?.income ?? {
          salary: 0,
          additional: 0,
          professional: 0,
          other: 0,
        },
        expenses: financials?.expenses ?? {
          rent: 0,
          mortgage: 0,
          autoLoan: 0,
          otherLoans: 0,
          pension: 0,
          recurring: 0,
          other: 0,
        },
        assets: financials?.assets ?? {
          bankAccounts: 0,
          savings: 0,
          realEstate: 0,
          vehicles: 0,
          investments: 0,
          other: 0,
        },
        liabilities: financials?.liabilities ?? {
          mortgage: 0,
          autoLoan: 0,
          personalLoan: 0,
          debts: 0,
          other: 0,
        },
      },

      bankAccounts: user.ledgerBalance
        ? [
            {
              id: user.ledgerBalance.id,
              type: 'Solde disponible',
              ibanMasked: user.wallets?.[0]
                ? `•••• ${user.wallets[0].address.slice(-4)}`
                : '—',
              currency: 'USD',
              balance: Number(user.ledgerBalance.availableBalance),
              available: Number(user.ledgerBalance.availableBalance),
              status: 'ACTIVE',
            },
          ]
        : [],

      creditRequest,

      documents: [],

      kyc: {
        identity:
          user.kycStatus === 'VERIFIED'
            ? 'VERIFIED'
            : user.kycStatus === 'REJECTED'
              ? 'REJECTED'
              : 'TO_VERIFY',
        address: (user.addresses ?? []).some((a) => a.verified)
          ? 'VERIFIED'
          : 'PENDING',
        idDocument:
          user.kycStatus === 'VERIFIED'
            ? 'VERIFIED'
            : user.kycStatus === 'REJECTED'
              ? 'REJECTED'
              : 'TO_VERIFY',
        biometric: user.kycStatus === 'VERIFIED' ? 'VERIFIED' : 'PENDING',
        verifiedAt:
          user.kycStatus === 'VERIFIED' ? fmtDate(user.updatedAt) : null,
        status: user.kycStatus,
        alerts:
          user.kycStatus === 'REJECTED'
            ? ['Vérification KYC refusée — dossier à réexaminer.']
            : [],
      },

      riskScoring,
      dossierStatus,
      dossierCategory: computeDossierCategory(request, linkedPosition),

      creditDecision: {
        analyst: 'Non assigné',
        assignedAt: fmtDate(request?.validatedAt) ?? '—',
        status: this.mapDecisionStatus(request),
        summary: request
          ? `Demande ${request.status.toLowerCase()} — gage envisagé de ${Number(request.collateralAmount).toLocaleString('fr-FR')} $US.`
          : 'Aucune demande de crédit à ce jour.',
        recommendation: '—',
      },

      guarantees: position?.collateralCurrency
        ? [
            {
              type: 'Nantissement',
              description: `${position.collateralCurrency} déposé en garantie`,
              owner: fullName(profile, user.email),
              declaredValue: Number(position.collateralAmount),
              retainedValue: Number(position.collateralAmount),
              documents: [],
              evaluatedAt: fmtDate(position.createdAt) ?? '—',
              verified: true,
            },
          ]
        : [],

      history: this.presentHistory(user),
      notes: (user.notes ?? []).map((n) => ({
        author: n.author.email,
        date: fmtDate(n.createdAt),
        time: fmtTime(n.createdAt),
        content: n.content,
      })),

      support: {
        openTickets: 0,
        resolvedTickets: 0,
        lastContact: '—',
        channels: [],
      },

      contract,
    };
  }

  private presentCreditRequest(
    user: UserWithRelations,
    request:
      (CreditRequest & { creditPosition?: CreditPosition | null }) | undefined,
    position: CreditPosition | null,
  ) {
    const collateral = Number(request?.collateralAmount ?? 0);
    const amountRequested = position
      ? Number(position.creditIssued)
      : collateral * CREDIT_RATIO;
    const durationMonths = position?.termMonths ?? DEFAULT_TERM_MONTHS;
    const proposedRate = position
      ? Number(position.interestRatePct)
      : DEFAULT_INTEREST_RATE_PCT;
    const estimatedMonthlyPayment =
      durationMonths > 0
        ? Math.round(
            ((amountRequested * (1 + proposedRate / 100)) / durationMonths) *
              100,
          ) / 100
        : 0;

    return {
      id: request
        ? dossierCode(request.id, request.createdAt)
        : `CR-${new Date().getFullYear()}-NEANT`,
      product: 'Crédit lombard',
      amountRequested,
      durationMonths,
      purpose: 'Non renseigné — objet non recueilli par le formulaire actuel',
      estimatedMonthlyPayment,
      proposedRate,
      requestDate: fmtDate(request?.createdAt ?? user.createdAt) ?? '—',
      status: this.mapDecisionStatus(request),
    };
  }

  private presentContract(
    creditRequest: ReturnType<AdminClientsService['presentCreditRequest']>,
    dossierStatus: ReturnType<typeof buildDossierStatus>,
    request:
      (CreditRequest & { creditPosition?: CreditPosition | null }) | undefined,
  ) {
    const idx = dossierStatus.currentStepIndex;
    const contractDate = dossierStatus.steps[CONTRACT_STEP_INDEX]?.date ?? null;
    const disbursementDate =
      dossierStatus.steps[DISBURSEMENT_STEP_INDEX]?.date ?? null;

    const totalRepayable =
      Math.round(
        creditRequest.estimatedMonthlyPayment *
          creditRequest.durationMonths *
          100,
      ) / 100;
    const totalInterest =
      Math.round((totalRepayable - creditRequest.amountRequested) * 100) / 100;
    const apr = Math.round((creditRequest.proposedRate + 0.35) * 100) / 100;

    let status: 'NOT_GENERATED' | 'SENT' | 'COUNTERSIGNED' = 'NOT_GENERATED';
    let generatedAt: string | null = null;
    let sentAt: string | null = null;
    let signedAt: string | null = null;
    let countersignedAt: string | null = null;

    if (idx === CONTRACT_STEP_INDEX) {
      status = 'SENT';
      generatedAt = contractDate;
      sentAt = contractDate;
    } else if (idx > CONTRACT_STEP_INDEX) {
      status = 'COUNTERSIGNED';
      generatedAt = contractDate;
      sentAt = contractDate;
      signedAt = contractDate;
      countersignedAt = disbursementDate ?? contractDate;
    }

    return {
      reference: request
        ? `CTR-${dossierCode(request.id, request.createdAt).slice(3)}`
        : '—',
      status,
      generatedAt,
      sentAt,
      signedAt,
      countersignedAt,
      nominalRate: creditRequest.proposedRate,
      apr,
      totalInterest,
      totalRepayable,
      documentName: request
        ? `Contrat_credit_${dossierCode(request.id, request.createdAt)}.pdf`
        : '—',
      documentSize: '412 Ko',
    };
  }

  private presentHistory(user: UserWithRelations) {
    const txEntries = (user.transactions ?? []).map((t) => ({
      date: fmtDate(t.createdAt) ?? '—',
      time: fmtTime(t.createdAt),
      user: 'Système',
      action: `Transaction — ${t.type.replace(/_/g, ' ').toLowerCase()}`,
      result: t.status,
      sortKey: new Date(t.createdAt).getTime(),
    }));
    const noteEntries = (user.notes ?? []).map((n) => ({
      date: fmtDate(n.createdAt) ?? '—',
      time: fmtTime(n.createdAt),
      user: n.author.email,
      action: "Ajout d'une note interne",
      result: '—',
      sortKey: new Date(n.createdAt).getTime(),
    }));
    return [...txEntries, ...noteEntries]
      .sort((a, b) => b.sortKey - a.sortKey)
      .slice(0, 15)
      .map((entry) => ({
        date: entry.date,
        time: entry.time,
        user: entry.user,
        action: entry.action,
        result: entry.result,
      }));
  }

  private mapDecisionStatus(
    request:
      (CreditRequest & { creditPosition?: CreditPosition | null }) | undefined,
  ): 'PENDING' | 'APPROVED' | 'REJECTED' | 'ANALYSIS' {
    if (!request) return 'PENDING';
    switch (request.status) {
      case 'PENDING':
        return 'ANALYSIS';
      case 'APPROVED':
      case 'FULFILLED':
        return 'APPROVED';
      case 'REJECTED':
        return 'REJECTED';
      default:
        return 'PENDING';
    }
  }
}
