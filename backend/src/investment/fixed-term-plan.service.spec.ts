import {
  FixedTermPlanRun,
  FixedTermPosition,
  LedgerBalance,
  Prisma,
  TreasuryBotRun,
} from '@prisma/client';
import { InvalidAmountException } from '../common/exceptions/financial.exceptions';
import { FixedTermPlanService } from './fixed-term-plan.service';

function buildBalance(overrides: Partial<LedgerBalance> = {}): LedgerBalance {
  return {
    id: 'balance-1',
    userId: 'user-1',
    availableBalance: new Prisma.Decimal(0),
    lockedCollateral: new Prisma.Decimal(0),
    grantedCredit: new Prisma.Decimal(0),
    usedCredit: new Prisma.Decimal(0),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildPosition(
  overrides: Partial<FixedTermPosition> = {},
): FixedTermPosition {
  return {
    id: 'position-1',
    userId: 'user-1',
    plan: 'RWA_METALS_12M',
    principalAmount: new Prisma.Decimal(1000),
    accruedYield: new Prisma.Decimal(0),
    status: 'ACTIVE',
    createdAt: new Date('2026-09-02'),
    maturityDate: new Date('2027-09-02'),
    maturedAt: null,
    ...overrides,
  };
}

function buildTreasuryRun(
  overrides: Partial<TreasuryBotRun> = {},
): TreasuryBotRun {
  return {
    id: 'run-1',
    runDate: new Date('2026-09-02'),
    pillarAReturnPct: new Prisma.Decimal('0.05'),
    pillarBReturnPct: new Prisma.Decimal('0.05'),
    pillarCReturnPct: new Prisma.Decimal('0.05'),
    blendedReturnPct: new Prisma.Decimal('0.05'),
    marketSignalPct: new Prisma.Decimal('0'),
    notionalCapitalUsd: new Prisma.Decimal('10000000'),
    dailyPnlUsd: new Prisma.Decimal('5000'),
    cumulativeNavUsd: new Prisma.Decimal('10005000'),
    createdAt: new Date(),
    ...overrides,
  };
}

function buildPlanRun(
  overrides: Partial<FixedTermPlanRun> = {},
): FixedTermPlanRun {
  return {
    id: 'plan-run-1',
    runDate: new Date('2026-09-02'),
    plan: 'RWA_METALS_12M',
    marketSignalPct: new Prisma.Decimal('0'),
    dailyReturnPct: new Prisma.Decimal('0.0235'),
    createdAt: new Date(),
    ...overrides,
  };
}

describe('FixedTermPlanService', () => {
  let prisma: {
    $transaction: jest.Mock;
    fixedTermPosition: {
      create: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    fixedTermPlanRun: { findUnique: jest.Mock; create: jest.Mock };
    transaction: { create: jest.Mock };
  };
  let tx: {
    fixedTermPosition: { create: jest.Mock; update: jest.Mock };
    transaction: { create: jest.Mock };
  };
  let ledgerService: {
    debitAvailableBalance: jest.Mock;
    creditAvailableBalance: jest.Mock;
  };
  let treasuryBotService: {
    runDailySimulation: jest.Mock;
    getHistory: jest.Mock;
  };
  let stockMarketDataService: { getSignalForTickers: jest.Mock };
  let service: FixedTermPlanService;

  beforeEach(() => {
    tx = {
      fixedTermPosition: { create: jest.fn(), update: jest.fn() },
      transaction: { create: jest.fn() },
    };
    prisma = {
      $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
        callback(tx),
      ),
      fixedTermPosition: {
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      fixedTermPlanRun: { findUnique: jest.fn(), create: jest.fn() },
      transaction: { create: jest.fn() },
    };
    ledgerService = {
      debitAvailableBalance: jest.fn(),
      creditAvailableBalance: jest.fn(),
    };
    treasuryBotService = {
      runDailySimulation: jest.fn(),
      getHistory: jest.fn(),
    };
    stockMarketDataService = { getSignalForTickers: jest.fn() };

    service = new FixedTermPlanService(
      prisma as never,
      ledgerService as never,
      treasuryBotService as never,
      stockMarketDataService as never,
    );
  });

  describe('getFixedTermPlans', () => {
    it('returns all 6 plans, each with an id, horizon, and computed indicative return', async () => {
      treasuryBotService.getHistory.mockResolvedValue([
        buildTreasuryRun({ blendedReturnPct: new Prisma.Decimal('0.02') }),
      ]);
      stockMarketDataService.getSignalForTickers.mockResolvedValue(0.1);

      const plans = await service.getFixedTermPlans();

      expect(plans.map((p) => p.id)).toEqual([
        'TREASURY_3M',
        'SEMICONDUCTORS_6M',
        'CORE_BALANCED_12M',
        'RWA_METALS_12M',
        'AI_MEGACAPS_12M',
        'ALPHA_MOMENTUM_12M',
      ]);
      for (const plan of plans) {
        expect(Number(plan.annualizedPct)).toBeGreaterThanOrEqual(0);
        expect(Number(plan.periodPct)).toBeGreaterThanOrEqual(0);
      }
    });

    it('never uses the client-provided hand-picked target (e.g. 25%/an for Alpha Momentum) — recomputes from real per-ticker dividend yields instead', async () => {
      treasuryBotService.getHistory.mockResolvedValue([buildTreasuryRun()]);
      stockMarketDataService.getSignalForTickers.mockResolvedValue(0);

      const plans = await service.getFixedTermPlans();
      const alphaMomentum = plans.find((p) => p.id === 'ALPHA_MOMENTUM_12M')!;

      // PLTR(0) + DELL(1.6) + MU(0.45) + SNDK(0), moyenne = 0.5125, jamais 25.
      expect(Number(alphaMomentum.annualizedPct)).toBeCloseTo(0.51, 1);
      expect(Number(alphaMomentum.annualizedPct)).toBeLessThan(1);
    });

    it('a 100%-RWA plan (RWA_METALS_12M) reuses INDICATIVE_ANNUAL_YIELD_PCT.RWA_STRATEGY and the real TreasuryBotRun signal, never a separate ticker', async () => {
      treasuryBotService.getHistory.mockResolvedValue([
        buildTreasuryRun({ blendedReturnPct: new Prisma.Decimal('0.03') }),
      ]);
      stockMarketDataService.getSignalForTickers.mockResolvedValue(null);

      const plans = await service.getFixedTermPlans();
      const rwaPlan = plans.find((p) => p.id === 'RWA_METALS_12M')!;

      expect(rwaPlan.tickers).toEqual([]);
      expect(rwaPlan.includesRwa).toBe(true);
      expect(
        stockMarketDataService.getSignalForTickers,
      ).not.toHaveBeenCalledWith([]);
      expect(rwaPlan.latestSignalPct).toBe('0.0300');
    });

    it('degrades gracefully to a null signal when neither the stock tickers nor the RWA run are available, without blocking the other plans', async () => {
      treasuryBotService.getHistory.mockResolvedValue([]);
      stockMarketDataService.getSignalForTickers.mockResolvedValue(null);

      const plans = await service.getFixedTermPlans();

      expect(plans.every((p) => p.latestSignalPct === null)).toBe(true);
      expect(plans).toHaveLength(6);
    });
  });

  describe('deposit', () => {
    it('debits the available balance and creates a new position with a maturity date matching the plan horizon', async () => {
      const created = buildPosition({ plan: 'SEMICONDUCTORS_6M' });
      tx.fixedTermPosition.create.mockResolvedValue(created);

      const before = new Date();
      const result = await service.deposit(
        'user-1',
        'SEMICONDUCTORS_6M',
        '500',
      );
      const after = new Date();

      const [, , debitAmount] = ledgerService.debitAvailableBalance.mock
        .calls[0] as [unknown, unknown, Prisma.Decimal];
      expect(debitAmount.toString()).toBe('500');

      const createCalls = tx.fixedTermPosition.create.mock
        .calls as unknown as Array<
        [
          {
            data: {
              userId: string;
              plan: string;
              principalAmount: unknown;
              maturityDate: Date;
            };
          },
        ]
      >;
      const createCall = createCalls[0][0];
      expect(createCall.data.userId).toBe('user-1');
      expect(createCall.data.plan).toBe('SEMICONDUCTORS_6M');
      // Échéance ≈ maintenant + 6 mois (SEMICONDUCTORS_6M), à quelques secondes près.
      const expectedMin = new Date(before);
      expectedMin.setMonth(expectedMin.getMonth() + 6);
      const expectedMax = new Date(after);
      expectedMax.setMonth(expectedMax.getMonth() + 6);
      expect(createCall.data.maturityDate.getTime()).toBeGreaterThanOrEqual(
        expectedMin.getTime(),
      );
      expect(createCall.data.maturityDate.getTime()).toBeLessThanOrEqual(
        expectedMax.getTime(),
      );

      expect(tx.transaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: 'FIXED_TERM_DEPOSIT',
          amount: expect.anything() as unknown,
          status: 'COMPLETED',
        },
      });
      expect(result).toBe(created);
    });

    it('creates a separate position rather than topping up an existing one on the same plan', async () => {
      // Contrairement à InvestmentService.deposit — chaque dépôt à échéance fixe a sa
      // propre date de maturité, donc jamais cumulé.
      tx.fixedTermPosition.create.mockResolvedValue(buildPosition());

      await service.deposit('user-1', 'RWA_METALS_12M', '100');
      await service.deposit('user-1', 'RWA_METALS_12M', '200');

      expect(tx.fixedTermPosition.create).toHaveBeenCalledTimes(2);
    });

    it('rejects a non-positive amount before touching the ledger', async () => {
      await expect(
        service.deposit('user-1', 'RWA_METALS_12M', '0'),
      ).rejects.toThrow(InvalidAmountException);
      expect(ledgerService.debitAvailableBalance).not.toHaveBeenCalled();
    });
  });

  describe('accrueFixedTermPosition', () => {
    it('compounds a positive daily return on principal + already-accrued yield', async () => {
      const position = buildPosition({
        principalAmount: new Prisma.Decimal(1000),
        accruedYield: new Prisma.Decimal(10),
      });
      prisma.fixedTermPosition.update.mockResolvedValue(position);

      const result = await service.accrueFixedTermPosition(position, '1');

      expect(result.yieldAmount.toString()).toBe('10.1');
      expect(prisma.fixedTermPosition.update).toHaveBeenCalledWith({
        where: { id: position.id },
        data: { accruedYield: { increment: expect.anything() as unknown } },
      });
      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: {
          userId: position.userId,
          type: 'FIXED_TERM_YIELD_ACCRUAL',
          amount: expect.anything() as unknown,
          status: 'COMPLETED',
        },
      });
    });

    it('applies a negative daily return (real loss), still updating the position', async () => {
      const position = buildPosition({
        principalAmount: new Prisma.Decimal(1000),
        accruedYield: new Prisma.Decimal(0),
      });
      prisma.fixedTermPosition.update.mockResolvedValue(position);

      const result = await service.accrueFixedTermPosition(position, '-2');

      expect(result.yieldAmount.toString()).toBe('-20');
    });
  });

  describe('settleMaturedPositions', () => {
    it('pays out principal + accrued yield, marks the position MATURED, and journals the payout', async () => {
      const position = buildPosition({
        principalAmount: new Prisma.Decimal(1000),
        accruedYield: new Prisma.Decimal(35),
        maturityDate: new Date('2026-01-01'),
      });
      prisma.fixedTermPosition.findMany.mockResolvedValue([position]);
      const balance = buildBalance({
        availableBalance: new Prisma.Decimal(1035),
      });
      ledgerService.creditAvailableBalance.mockResolvedValue(balance);

      const results = await service.settleMaturedPositions(
        new Date('2026-06-01'),
      );

      expect(results).toHaveLength(1);
      expect(results[0].payoutAmount.toString()).toBe('1035');
      expect(tx.fixedTermPosition.update).toHaveBeenCalledWith({
        where: { id: position.id },
        data: { status: 'MATURED', maturedAt: expect.any(Date) as unknown },
      });
      expect(tx.transaction.create).toHaveBeenCalledWith({
        data: {
          userId: position.userId,
          type: 'FIXED_TERM_MATURITY_PAYOUT',
          amount: expect.anything() as unknown,
          status: 'COMPLETED',
        },
      });
    });

    it('floors the payout at 0 rather than crediting a negative amount when accrued losses exceed the principal', async () => {
      const position = buildPosition({
        principalAmount: new Prisma.Decimal(1000),
        accruedYield: new Prisma.Decimal(-1200),
        maturityDate: new Date('2026-01-01'),
      });
      prisma.fixedTermPosition.findMany.mockResolvedValue([position]);
      ledgerService.creditAvailableBalance.mockResolvedValue(buildBalance());

      const results = await service.settleMaturedPositions(
        new Date('2026-06-01'),
      );

      expect(results[0].payoutAmount.toString()).toBe('0');
      const [, , creditedAmount] = ledgerService.creditAvailableBalance.mock
        .calls[0] as [unknown, string, Prisma.Decimal];
      expect(creditedAmount.toString()).toBe('0');
    });

    it('only settles positions whose maturityDate has actually passed', async () => {
      prisma.fixedTermPosition.findMany.mockResolvedValue([]);

      await service.settleMaturedPositions(new Date('2026-06-01'));

      expect(prisma.fixedTermPosition.findMany).toHaveBeenCalledWith({
        where: {
          status: 'ACTIVE',
          maturityDate: { lte: new Date('2026-06-01') },
        },
      });
    });

    it('keeps going when one position fails to settle, without losing the others', async () => {
      const okPosition = buildPosition({ id: 'ok' });
      const badPosition = buildPosition({ id: 'bad' });
      prisma.fixedTermPosition.findMany.mockResolvedValue([
        badPosition,
        okPosition,
      ]);
      ledgerService.creditAvailableBalance.mockResolvedValue(buildBalance());
      tx.fixedTermPosition.update.mockImplementation(
        ({ where }: { where: { id: string } }) => {
          if (where.id === 'bad') {
            return Promise.reject(new Error('db hiccup'));
          }
          return Promise.resolve(okPosition);
        },
      );

      const results = await service.settleMaturedPositions(
        new Date('2026-06-01'),
      );

      expect(results).toHaveLength(1);
      expect(results[0].positionId).toBe('ok');
    });
  });

  describe('runDailyAccrual', () => {
    it('records one FixedTermPlanRun per plan, then accrues every ACTIVE position and settles maturities', async () => {
      treasuryBotService.runDailySimulation.mockResolvedValue(
        buildTreasuryRun({ blendedReturnPct: new Prisma.Decimal('0.02') }),
      );
      prisma.fixedTermPlanRun.findUnique.mockResolvedValue(null);
      prisma.fixedTermPlanRun.create.mockImplementation(
        ({ data }: { data: Partial<FixedTermPlanRun> }) =>
          Promise.resolve(buildPlanRun(data)),
      );
      stockMarketDataService.getSignalForTickers.mockResolvedValue(0.2);

      const position = buildPosition({
        id: 'p1',
        plan: 'RWA_METALS_12M',
        maturityDate: new Date('2099-01-01'), // loin dans le futur, pas d'échéance ce jour
      });
      prisma.fixedTermPosition.findMany
        .mockResolvedValueOnce([position]) // positions ACTIVE pour l'accrual
        .mockResolvedValueOnce([]); // aucune position arrivée à échéance
      prisma.fixedTermPosition.update.mockResolvedValue(position);

      const results = await service.runDailyAccrual(
        new Date('2026-09-02T04:30:00Z'),
      );

      // Un FixedTermPlanRun créé par plan (6 au total).
      expect(prisma.fixedTermPlanRun.create).toHaveBeenCalledTimes(6);
      expect(results).toHaveLength(1);
      expect(results[0].positionId).toBe('p1');
    });

    it('reuses an existing FixedTermPlanRun for the same (day, plan) instead of recomputing it', async () => {
      treasuryBotService.runDailySimulation.mockResolvedValue(
        buildTreasuryRun(),
      );
      prisma.fixedTermPlanRun.findUnique.mockResolvedValue(buildPlanRun());
      prisma.fixedTermPosition.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await service.runDailyAccrual(new Date('2026-09-02T04:30:00Z'));

      expect(stockMarketDataService.getSignalForTickers).not.toHaveBeenCalled();
      expect(prisma.fixedTermPlanRun.create).not.toHaveBeenCalled();
    });
  });
});
