import { ClientNotFoundException } from '../common/exceptions/admin-client.exceptions';
import { AdminClientsService } from './admin-clients.service';

function buildUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    email: 'jean.dupont@example.com',
    passwordHash: 'hash',
    kycStatus: 'VERIFIED',
    role: 'CLIENT',
    createdAt: new Date('2024-01-10T10:00:00Z'),
    updatedAt: new Date('2024-01-10T10:00:00Z'),
    clientProfile: {
      userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      firstName: 'Jean',
      lastName: 'Dupont',
      dateOfBirth: new Date('1985-06-14'),
      placeOfBirth: 'Lyon',
      nationality: 'Française',
      maritalStatus: 'Marié',
      dependents: 2,
      phone: '+33 6 12 34 56 78',
      clientType: 'PARTICULIER',
      updatedAt: new Date(),
    },
    addresses: [
      {
        userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        label: 'DOMICILE',
        street: '14 rue des Lilas',
        city: 'Lyon',
        postalCode: '69003',
        country: 'France',
        residenceType: 'Propriétaire',
        since: '2019',
        verified: true,
        verifiedAt: new Date('2024-01-15'),
        updatedAt: new Date(),
      },
    ],
    employment: {
      userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      isIndependent: false,
      status: 'Salarié',
      employer: 'Techneo Industries SA',
      sector: 'Industrie',
      role: 'Ingénieur',
      seniority: '7 ans',
      annualIncome: 58800,
      monthlyIncome: 4900,
      contractType: 'CDI',
      verified: true,
      activity: null,
      turnover: null,
      netResult: null,
      updatedAt: new Date(),
    },
    financialSnapshot: {
      userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
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
      updatedAt: new Date(),
    },
    ledgerBalance: {
      id: 'ledger-1',
      userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      availableBalance: '2083.90',
      lockedCollateral: '2500',
      grantedCredit: '2250',
      usedCredit: '0',
      updatedAt: new Date(),
    },
    wallets: [],
    creditRequests: [],
    creditPositions: [],
    transactions: [],
    notes: [],
    ...overrides,
  };
}

function buildCreditRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bbbbbbbb-1111-2222-3333-444444444444',
    userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    collateralAmount: '2000',
    currency: 'USD',
    status: 'PENDING',
    collateralCurrency: null,
    createdAt: new Date('2026-01-05T10:00:00Z'),
    validatedAt: null,
    fulfilledAt: null,
    creditPositionId: null,
    creditPosition: null,
    ...overrides,
  };
}

describe('AdminClientsService', () => {
  let prisma: {
    user: { findMany: jest.Mock; findUnique: jest.Mock };
    clientProfile: { upsert: jest.Mock };
    address: { upsert: jest.Mock };
    employment: { upsert: jest.Mock };
    financialSnapshot: { upsert: jest.Mock };
    clientNote: { create: jest.Mock; findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: AdminClientsService;

  beforeEach(() => {
    prisma = {
      user: { findMany: jest.fn(), findUnique: jest.fn() },
      clientProfile: { upsert: jest.fn() },
      address: { upsert: jest.fn() },
      employment: { upsert: jest.fn() },
      financialSnapshot: { upsert: jest.fn() },
      clientNote: { create: jest.fn(), findMany: jest.fn() },
      $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
    };
    service = new AdminClientsService(prisma as never);
  });

  describe('list', () => {
    it('returns a summary per CLIENT user, deriving a stable client code from the id', async () => {
      prisma.user.findMany.mockResolvedValue([buildUser()]);

      const result = await service.list();

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { role: 'CLIENT' } }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('CL-AAAAAA');
      expect(result[0].firstName).toBe('Jean');
      expect(result[0].kycStatus).toBe('VERIFIED');
    });

    it('includes dossierStatus/contract alongside the summary, computed from the same real request', async () => {
      prisma.user.findMany.mockResolvedValue([
        buildUser({
          creditRequests: [buildCreditRequest({ status: 'FULFILLED', creditPosition: { status: 'ACTIVE' } })],
        }),
      ]);

      const [summary] = await service.list();

      expect(summary.dossierCategory).toBe('ACTIF');
      expect(summary.dossierStatus.currentStepIndex).toBeGreaterThan(0);
      expect(summary.contract.reference).toMatch(/^CTR-/);
    });

    it.each<[string | undefined, string | undefined, string]>([
      [undefined, undefined, 'AUCUNE'],
      ['PENDING', undefined, 'DEMANDE'],
      ['APPROVED', undefined, 'EN_COURS'],
      ['REJECTED', undefined, 'CLOTURE'],
      ['FULFILLED', 'ACTIVE', 'ACTIF'],
      ['FULFILLED', 'CLOSED', 'CLOTURE'],
      ['FULFILLED', 'LIQUIDATED', 'CLOTURE'],
    ])(
      'request=%s position=%s -> dossierCategory=%s',
      async (requestStatus, positionStatus, expected) => {
        const creditRequests = requestStatus
          ? [
              buildCreditRequest({
                status: requestStatus,
                creditPosition: positionStatus ? { status: positionStatus } : null,
              }),
            ]
          : [];
        prisma.user.findMany.mockResolvedValue([buildUser({ creditRequests })]);

        const [summary] = await service.list();

        expect(summary.dossierCategory).toBe(expected);
      },
    );
  });

  describe('getDetail', () => {
    it('throws ClientNotFoundException when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getDetail('missing')).rejects.toThrow(
        ClientNotFoundException,
      );
    });

    it('throws ClientNotFoundException when the user is not a CLIENT (e.g. ADMIN)', async () => {
      prisma.user.findUnique.mockResolvedValue(buildUser({ role: 'ADMIN' }));

      await expect(service.getDetail('any')).rejects.toThrow(
        ClientNotFoundException,
      );
    });

    // Régression : `presentDetail` retombait sur `user.creditPositions[0]` (une position
    // plus ancienne, sans rapport) dès que la demande la plus récente n'avait pas encore
    // de position liée — le montant/taux affichés pour CETTE demande (PENDING, donc
    // légitimement sans position) venaient alors d'un tout autre dossier. Les garanties,
    // elles, ont raison d'afficher cette position antérieure (track record du client) —
    // seul `creditRequest` ne doit jamais s'y mélanger.
    it("never borrows an unrelated older CreditPosition's amount for the latest (unlinked) credit request, while still surfacing it as a guarantee", async () => {
      const oldPosition = {
        id: 'position-old',
        status: 'ACTIVE',
        collateralCurrency: 'ETH',
        collateralAmount: '750',
        creditIssued: '750',
        interestRatePct: '13.5',
        termMonths: 12,
        createdAt: new Date('2025-01-01'),
      };
      prisma.user.findUnique.mockResolvedValue(
        buildUser({
          creditRequests: [
            buildCreditRequest({
              status: 'PENDING',
              collateralAmount: '1',
              creditPosition: null,
            }),
          ],
          creditPositions: [oldPosition],
        }),
      );

      const detail = await service.getDetail(
        'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      );

      // 1 (collateral) × CREDIT_RATIO (3.5) = 3.5 — jamais 750 (la position antérieure).
      expect(detail.creditRequest.amountRequested).toBeCloseTo(3.5, 6);
      expect(detail.dossierCategory).toBe('DEMANDE');
      // La position antérieure reste visible comme garantie déclarée pour ce client.
      expect(detail.guarantees).toHaveLength(1);
      expect(detail.guarantees[0].declaredValue).toBe(750);
    });

    it('aggregates a full client-detail payload with real personal, address, employment and financial data', async () => {
      prisma.user.findUnique.mockResolvedValue(buildUser());

      const detail = await service.getDetail(
        'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      );

      expect(detail.personalInfo.dateOfBirth).toBe('14/06/1985');
      expect(detail.personalInfo.nationality).toBe('Française');
      expect(detail.addresses).toHaveLength(1);
      expect(detail.addresses[0].label).toBe('Domicile');
      expect(detail.employment.employer).toBe('Techneo Industries SA');
      expect(detail.financials.income).toEqual({
        salary: 4900,
        additional: 0,
        professional: 0,
        other: 150,
      });
      expect(detail.bankAccounts).toHaveLength(1);
      expect(detail.bankAccounts[0].balance).toBe(2083.9);
      // Aucune demande de crédit dans ce fixture : le dossier reste à l'étape 0
      // (demande soumise) et le contrat n'est pas encore généré.
      expect(detail.dossierStatus.currentStepIndex).toBe(0);
      expect(detail.contract.status).toBe('NOT_GENERATED');
      expect(detail.documents).toEqual([]);
      expect(detail.notes).toEqual([]);
    });

    it('derives a LOW risk level for a financially healthy, fully-documented client', async () => {
      prisma.user.findUnique.mockResolvedValue(buildUser());

      const detail = await service.getDetail(
        'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      );

      // Revenus 5050 / charges 1865 => faible taux d'endettement, dossier complet
      // (emploi + finances + adresse + KYC vérifié) => score élevé.
      expect(detail.riskLevel).toBe('LOW');
      expect(detail.riskScoring.fileCompleteness).toBe(100);
    });

    it('derives a higher-risk profile for a client with no employment/financial data on file', async () => {
      prisma.user.findUnique.mockResolvedValue(
        buildUser({
          employment: null,
          financialSnapshot: null,
          addresses: [],
          kycStatus: 'PENDING',
        }),
      );

      const detail = await service.getDetail(
        'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      );

      expect(detail.riskScoring.fileCompleteness).toBe(0);
      expect(detail.riskLevel).not.toBe('LOW');
    });

    it('maps an APPROVED credit request with a committed collateral currency to the CONTRACT dossier step and a SENT contract', async () => {
      prisma.user.findUnique.mockResolvedValue(
        buildUser({
          creditRequests: [
            {
              id: 'bbbbbbbb-1111-2222-3333-444444444444',
              userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
              collateralAmount: '2500',
              currency: 'USD',
              status: 'APPROVED',
              createdAt: new Date('2024-02-01'),
              validatedAt: new Date('2024-02-03'),
              fulfilledAt: null,
              collateralCurrency: 'USDS',
              creditPositionId: null,
              creditPosition: null,
            },
          ],
        }),
      );

      const detail = await service.getDetail(
        'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      );

      expect(detail.dossierStatus.currentStepIndex).toBe(5);
      expect(detail.contract.status).toBe('SENT');
      expect(detail.creditRequest.status).toBe('APPROVED');
      expect(detail.guarantees).toEqual([]);
    });

    it('maps a FULFILLED credit request backed by an ACTIVE position to DISBURSEMENT and a COUNTERSIGNED contract with a real guarantee', async () => {
      prisma.user.findUnique.mockResolvedValue(
        buildUser({
          creditRequests: [
            {
              id: 'cccccccc-1111-2222-3333-444444444444',
              userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
              collateralAmount: '2500',
              currency: 'USD',
              status: 'FULFILLED',
              createdAt: new Date('2024-02-01'),
              validatedAt: new Date('2024-02-03'),
              fulfilledAt: new Date('2024-02-05'),
              collateralCurrency: 'USDS',
              creditPositionId: 'position-1',
              creditPosition: {
                id: 'position-1',
                userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
                collateralAmount: '2500',
                creditIssued: '3750',
                status: 'ACTIVE',
                currency: 'USD',
                exchangeRateAtLock: '1',
                creditIssuedInCurrency: '3750',
                interestRatePct: '13.5',
                originationFeePct: '2',
                originationFeeAmount: '0',
                custodyFeePct: '0.5',
                termMonths: 12,
                maturityDate: new Date('2025-02-05'),
                collateralCurrency: 'USDS',
                collateralTokenAmount: null,
                collateralEntryPriceUsd: null,
                collateralYieldAppliedPriceUsd: null,
                createdAt: new Date('2024-02-05'),
                updatedAt: new Date('2024-02-05'),
              },
            },
          ],
        }),
      );

      const detail = await service.getDetail(
        'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      );

      expect(detail.dossierStatus.currentStepIndex).toBe(6);
      expect(detail.contract.status).toBe('COUNTERSIGNED');
      expect(detail.creditRequest.amountRequested).toBe(3750);
      expect(detail.guarantees).toHaveLength(1);
      expect(detail.guarantees[0].declaredValue).toBe(2500);
    });
  });

  describe('updateProfile', () => {
    it('upserts the client profile and returns the refreshed detail', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(buildUser()) // assertClientExists
        .mockResolvedValueOnce(buildUser()); // getDetail refetch
      prisma.clientProfile.upsert.mockResolvedValue({});

      const result = await service.updateProfile(
        'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        { nationality: 'Suisse' },
      );

      expect(prisma.clientProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' },
        }),
      );
      expect(result.personalInfo.nationality).toBe('Française'); // from the refetched fixture
    });

    it('throws when the target user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProfile('missing', { nationality: 'Suisse' }),
      ).rejects.toThrow(ClientNotFoundException);
      expect(prisma.clientProfile.upsert).not.toHaveBeenCalled();
    });
  });

  describe('updateAddresses', () => {
    it('upserts every address entry inside a single transaction', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(buildUser())
        .mockResolvedValueOnce(buildUser());
      prisma.address.upsert.mockResolvedValue({});

      await service.updateAddresses('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', {
        addresses: [
          {
            label: 'DOMICILE',
            street: '1 rue Neuve',
            city: 'Nyon',
            postalCode: '1260',
            country: 'Suisse',
          },
        ],
      });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.address.upsert).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateEmployment / updateFinancials', () => {
    it('upserts employment', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(buildUser())
        .mockResolvedValueOnce(buildUser());
      prisma.employment.upsert.mockResolvedValue({});

      await service.updateEmployment('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', {
        employer: 'Nouvelle Entreprise SA',
      });

      expect(prisma.employment.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' },
        }),
      );
    });

    it('upserts the financial snapshot as structured JSON blocks', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(buildUser())
        .mockResolvedValueOnce(buildUser());
      prisma.financialSnapshot.upsert.mockResolvedValue({});

      await service.updateFinancials('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', {
        income: { salary: 5000, additional: 0, professional: 0, other: 0 },
      });

      // prisma.financialSnapshot.upsert est un jest.Mock non générique (pré-existant,
      // hors périmètre de ce changement) : son type d'argument résout en `any`, ce que
      // `expect.objectContaining` hérite ici.
      expect(prisma.financialSnapshot.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          update: expect.objectContaining({
            income: { salary: 5000, additional: 0, professional: 0, other: 0 },
          }),
        }),
      );
    });
  });

  describe('notes', () => {
    it('adds a note authored by the current admin and returns the refreshed list', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(buildUser());
      prisma.clientNote.create.mockResolvedValue({});
      prisma.clientNote.findMany.mockResolvedValue([
        {
          content: 'Dossier complet.',
          createdAt: new Date('2024-03-01T09:00:00Z'),
          author: { email: 'admin@hhentsch.com' },
        },
      ]);

      const notes = await service.addNote(
        'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        'admin-1',
        { content: 'Dossier complet.' },
      );

      expect(prisma.clientNote.create).toHaveBeenCalledWith({
        data: {
          userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
          authorUserId: 'admin-1',
          content: 'Dossier complet.',
        },
      });
      expect(notes[0].author).toBe('admin@hhentsch.com');
      expect(notes[0].content).toBe('Dossier complet.');
    });
  });
});
