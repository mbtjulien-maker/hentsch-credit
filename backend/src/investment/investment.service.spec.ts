import {
  InvestmentPosition,
  LedgerBalance,
  Prisma,
  StockBasketRun,
  TreasuryBotRun,
} from '@prisma/client';
import { InvalidAmountException } from '../common/exceptions/financial.exceptions';
import { NoActiveInvestmentException } from '../common/exceptions/financial.exceptions';
import { InvestmentService } from './investment.service';

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
  overrides: Partial<InvestmentPosition> = {},
): InvestmentPosition {
  return {
    id: 'position-1',
    userId: 'user-1',
    basket: 'RWA_STRATEGY',
    principalAmount: new Prisma.Decimal(1000),
    accruedYield: new Prisma.Decimal(0),
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    closedAt: null,
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

function buildStockRun(
  overrides: Partial<StockBasketRun> = {},
): StockBasketRun {
  return {
    id: 'stock-run-1',
    runDate: new Date('2026-09-02'),
    marketSignalPct: new Prisma.Decimal('0'),
    dailyReturnPct: new Prisma.Decimal('0.006849'),
    createdAt: new Date(),
    ...overrides,
  };
}

describe('InvestmentService', () => {
  let prisma: {
    $transaction: jest.Mock;
    investmentPosition: { findMany: jest.Mock; update: jest.Mock };
    transaction: { create: jest.Mock };
    stockBasketRun: { findUnique: jest.Mock; create: jest.Mock };
  };
  let tx: {
    investmentPosition: {
      findFirst: jest.Mock;
      update: jest.Mock;
      create: jest.Mock;
    };
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
  let stockMarketDataService: { getBasketMarketSignal: jest.Mock };
  let service: InvestmentService;

  beforeEach(() => {
    tx = {
      investmentPosition: {
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      transaction: { create: jest.fn() },
    };
    prisma = {
      $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
        callback(tx),
      ),
      investmentPosition: { findMany: jest.fn(), update: jest.fn() },
      transaction: { create: jest.fn() },
      stockBasketRun: { findUnique: jest.fn(), create: jest.fn() },
    };
    ledgerService = {
      debitAvailableBalance: jest.fn(),
      creditAvailableBalance: jest.fn(),
    };
    treasuryBotService = {
      runDailySimulation: jest.fn(),
      getHistory: jest.fn(),
    };
    stockMarketDataService = { getBasketMarketSignal: jest.fn() };

    service = new InvestmentService(
      prisma as never,
      ledgerService as never,
      treasuryBotService as never,
      stockMarketDataService as never,
    );
  });

  describe('deposit', () => {
    it('debits the available balance and creates a new position when none is active', async () => {
      tx.investmentPosition.findFirst.mockResolvedValue(null);
      const created = buildPosition({
        principalAmount: new Prisma.Decimal(500),
      });
      tx.investmentPosition.create.mockResolvedValue(created);

      const result = await service.deposit('user-1', 'RWA_STRATEGY', '500');

      const [, , debitAmount] = ledgerService.debitAvailableBalance.mock
        .calls[0] as [unknown, unknown, Prisma.Decimal];
      expect(debitAmount.toString()).toBe('500');
      expect(tx.investmentPosition.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          basket: 'RWA_STRATEGY',
          principalAmount: expect.anything() as unknown,
          status: 'ACTIVE',
        },
      });
      expect(tx.transaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: 'INVESTMENT_DEPOSIT',
          amount: expect.anything() as unknown,
          status: 'COMPLETED',
        },
      });
      expect(result).toBe(created);
    });

    it('tops up an existing ACTIVE position on the same basket instead of creating a new one', async () => {
      const existing = buildPosition({
        id: 'position-existing',
        principalAmount: new Prisma.Decimal(200),
      });
      tx.investmentPosition.findFirst.mockResolvedValue(existing);
      tx.investmentPosition.update.mockResolvedValue(
        buildPosition({
          id: 'position-existing',
          principalAmount: new Prisma.Decimal(300),
        }),
      );

      await service.deposit('user-1', 'RWA_STRATEGY', '100');

      expect(tx.investmentPosition.create).not.toHaveBeenCalled();
      expect(tx.investmentPosition.update).toHaveBeenCalledWith({
        where: { id: 'position-existing' },
        data: { principalAmount: { increment: expect.anything() as unknown } },
      });
    });

    it('rejects a non-positive amount before touching the ledger', async () => {
      await expect(service.deposit('user-1', 'STOCKS', '0')).rejects.toThrow(
        InvalidAmountException,
      );
      expect(ledgerService.debitAvailableBalance).not.toHaveBeenCalled();
    });
  });

  describe('withdraw', () => {
    it('credits principal + accrued yield, closes the position, and journals the withdrawal', async () => {
      const position = buildPosition({
        principalAmount: new Prisma.Decimal(1000),
        accruedYield: new Prisma.Decimal(50),
      });
      tx.investmentPosition.findFirst.mockResolvedValue(position);
      const balance = buildBalance({
        availableBalance: new Prisma.Decimal(1050),
      });
      ledgerService.creditAvailableBalance.mockResolvedValue(balance);

      const result = await service.withdraw('user-1', 'RWA_STRATEGY');

      const [, userIdArg, amountArg] = ledgerService.creditAvailableBalance.mock
        .calls[0] as [unknown, string, Prisma.Decimal];
      expect(userIdArg).toBe('user-1');
      expect(amountArg.toString()).toBe('1050');
      expect(tx.investmentPosition.update).toHaveBeenCalledWith({
        where: { id: position.id },
        data: { status: 'CLOSED', closedAt: expect.any(Date) as unknown },
      });
      expect(result.balance).toBe(balance);
      expect(result.withdrawnAmount.toString()).toBe('1050');
    });

    it('throws NoActiveInvestmentException when there is no active position on that basket', async () => {
      tx.investmentPosition.findFirst.mockResolvedValue(null);

      await expect(service.withdraw('user-1', 'STOCKS')).rejects.toThrow(
        NoActiveInvestmentException,
      );
      expect(ledgerService.creditAvailableBalance).not.toHaveBeenCalled();
    });
  });

  describe('accrueYieldForPosition', () => {
    it('compounds a positive daily return on principal + already-accrued yield', async () => {
      const position = buildPosition({
        principalAmount: new Prisma.Decimal(1000),
        accruedYield: new Prisma.Decimal(10),
      });
      prisma.investmentPosition.update.mockResolvedValue(position);

      const result = await service.accrueYieldForPosition(position, '1');

      // (1000 + 10) * 1% = 10.10
      expect(result.yieldAmount.toString()).toBe('10.1');
      expect(prisma.investmentPosition.update).toHaveBeenCalledWith({
        where: { id: position.id },
        data: { accruedYield: { increment: expect.anything() as unknown } },
      });
      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: {
          userId: position.userId,
          type: 'INVESTMENT_YIELD_ACCRUAL',
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
      prisma.investmentPosition.update.mockResolvedValue(position);

      const result = await service.accrueYieldForPosition(position, '-2');

      expect(result.yieldAmount.toString()).toBe('-20');
    });

    it('does not journal a Transaction when the daily yield is exactly zero', async () => {
      const position = buildPosition({
        principalAmount: new Prisma.Decimal(1000),
      });
      prisma.investmentPosition.update.mockResolvedValue(position);

      await service.accrueYieldForPosition(position, '0');

      expect(prisma.transaction.create).not.toHaveBeenCalled();
    });
  });

  describe('runDailyAccrual', () => {
    it('accrues RWA positions off TreasuryBotRun and STOCKS positions off the stock basket signal', async () => {
      const rwaRun = buildTreasuryRun({
        blendedReturnPct: new Prisma.Decimal('0.1'),
      });
      treasuryBotService.runDailySimulation.mockResolvedValue(rwaRun);
      prisma.stockBasketRun.findUnique.mockResolvedValue(null);
      stockMarketDataService.getBasketMarketSignal.mockResolvedValue(0.5);

      const rwaPosition = buildPosition({
        id: 'p-rwa',
        basket: 'RWA_STRATEGY',
      });
      const stockPosition = buildPosition({ id: 'p-stock', basket: 'STOCKS' });
      prisma.investmentPosition.findMany.mockResolvedValue([
        rwaPosition,
        stockPosition,
      ]);
      prisma.investmentPosition.update.mockImplementation(
        ({ where }: { where: { id: string } }) =>
          Promise.resolve(where.id === 'p-rwa' ? rwaPosition : stockPosition),
      );
      const createdStockRun = buildStockRun({
        dailyReturnPct: new Prisma.Decimal('0.5').plus(
          new Prisma.Decimal('2.5').dividedBy(365),
        ),
      });
      prisma.stockBasketRun.create.mockResolvedValue(createdStockRun);

      const results = await service.runDailyAccrual(
        new Date('2026-09-02T04:00:00Z'),
      );

      expect(results).toHaveLength(2);
      const rwaResult = results.find((r) => r.positionId === 'p-rwa')!;
      const stockResult = results.find((r) => r.positionId === 'p-stock')!;
      // RWA: 1000 * 0.1% = 1
      expect(rwaResult.yieldAmount.toString()).toBe('1');
      // STOCKS: dailyReturnPct = 0.5 + 2.5/365 ≈ 0.5068493...; 1000 * that / 100 ≈ 5.068493
      expect(stockResult.yieldAmount.greaterThan(5)).toBe(true);
      expect(stockResult.yieldAmount.lessThan(5.1)).toBe(true);
    });

    it('reuses an existing StockBasketRun for the same day instead of recomputing it', async () => {
      treasuryBotService.runDailySimulation.mockResolvedValue(
        buildTreasuryRun(),
      );
      const existingStockRun = buildStockRun();
      prisma.stockBasketRun.findUnique.mockResolvedValue(existingStockRun);
      prisma.investmentPosition.findMany.mockResolvedValue([]);

      await service.runDailyAccrual(new Date('2026-09-02T04:00:00Z'));

      expect(
        stockMarketDataService.getBasketMarketSignal,
      ).not.toHaveBeenCalled();
      expect(prisma.stockBasketRun.create).not.toHaveBeenCalled();
    });

    it('degrades gracefully (neutral market signal, not a blocked accrual) when the stock signal is unavailable', async () => {
      treasuryBotService.runDailySimulation.mockResolvedValue(
        buildTreasuryRun(),
      );
      prisma.stockBasketRun.findUnique.mockResolvedValue(null);
      stockMarketDataService.getBasketMarketSignal.mockResolvedValue(null);
      prisma.stockBasketRun.create.mockImplementation(
        ({ data }: { data: Partial<StockBasketRun> }) =>
          Promise.resolve(buildStockRun(data)),
      );
      prisma.investmentPosition.findMany.mockResolvedValue([]);

      await service.runDailyAccrual(new Date('2026-09-02T04:00:00Z'));

      const calls = prisma.stockBasketRun.create.mock.calls as unknown as Array<
        [
          {
            data: {
              marketSignalPct: Prisma.Decimal;
              dailyReturnPct: Prisma.Decimal;
            };
          },
        ]
      >;
      const createCall = calls[0][0];
      expect(createCall.data.marketSignalPct.toString()).toBe('0');
      // Toujours la baseline dividende (2.5/365), jamais un rendement bloqué à zéro.
      expect(createCall.data.dailyReturnPct.greaterThan(0)).toBe(true);
    });

    it('keeps going when one position fails to accrue, without losing the others', async () => {
      treasuryBotService.runDailySimulation.mockResolvedValue(
        buildTreasuryRun(),
      );
      prisma.stockBasketRun.findUnique.mockResolvedValue(buildStockRun());
      const okPosition = buildPosition({ id: 'ok' });
      const badPosition = buildPosition({ id: 'bad' });
      prisma.investmentPosition.findMany.mockResolvedValue([
        badPosition,
        okPosition,
      ]);
      prisma.investmentPosition.update.mockImplementation(
        ({ where }: { where: { id: string } }) => {
          if (where.id === 'bad') {
            return Promise.reject(new Error('db hiccup'));
          }
          return Promise.resolve(okPosition);
        },
      );

      const results = await service.runDailyAccrual(
        new Date('2026-09-02T04:00:00Z'),
      );

      expect(results).toHaveLength(1);
      expect(results[0].positionId).toBe('ok');
    });
  });
});
