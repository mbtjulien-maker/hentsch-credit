import { CreditPosition, Prisma } from '@prisma/client';
import { LedgerService } from '../ledger/ledger.service';
import { MarketDataService } from '../market-data/market-data.service';
import { LiquidationService } from './liquidation.service';

function buildPosition(
  overrides: Partial<CreditPosition> = {},
): CreditPosition {
  return {
    id: 'position-1',
    userId: 'user-1',
    collateralAmount: new Prisma.Decimal('2500'),
    creditIssued: new Prisma.Decimal('8750'),
    status: 'ACTIVE',
    currency: 'USD',
    exchangeRateAtLock: new Prisma.Decimal(1),
    creditIssuedInCurrency: new Prisma.Decimal('8750'),
    interestRatePct: new Prisma.Decimal('13.5'),
    originationFeePct: new Prisma.Decimal('2.0'),
    originationFeeAmount: new Prisma.Decimal('175'),
    custodyFeePct: new Prisma.Decimal('0.5'),
    termMonths: 12,
    maturityDate: new Date(),
    collateralCurrency: 'PAXG',
    collateralTokenAmount: new Prisma.Decimal('1'),
    collateralEntryPriceUsd: new Prisma.Decimal('2500'),
    collateralYieldAppliedPriceUsd: new Prisma.Decimal('2500'),
    yieldRepaidAmount: new Prisma.Decimal('0'),
    liquidationWarning: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('LiquidationService', () => {
  let prisma: {
    creditPosition: { findMany: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  };
  let ledgerService: { liquidateCollateral: jest.Mock };
  let marketDataService: { getSpotPriceUsd: jest.Mock };
  let tx: {
    creditPosition: { update: jest.Mock };
    transaction: { create: jest.Mock };
  };
  let service: LiquidationService;

  beforeEach(() => {
    tx = {
      creditPosition: { update: jest.fn() },
      transaction: { create: jest.fn() },
    };
    prisma = {
      creditPosition: { findMany: jest.fn(), update: jest.fn() },
      $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
        callback(tx),
      ),
    };
    ledgerService = { liquidateCollateral: jest.fn() };
    marketDataService = { getSpotPriceUsd: jest.fn() };
    service = new LiquidationService(
      prisma as never,
      ledgerService as unknown as LedgerService,
      marketDataService as unknown as MarketDataService,
    );
  });

  describe('checkPositionForLiquidation — skip conditions (no-op)', () => {
    it.each([
      ['a closed position', buildPosition({ status: 'CLOSED' })],
      [
        'a position with no collateral asset',
        buildPosition({ collateralCurrency: null }),
      ],
      [
        'a stablecoin-backed position (never depreciates in this model)',
        buildPosition({ collateralCurrency: 'USDS' }),
      ],
      [
        'a position with no implied token amount',
        buildPosition({ collateralTokenAmount: null }),
      ],
    ])('does nothing for %s', async (_label, position) => {
      const result = await service.checkPositionForLiquidation(position);

      expect(result).toEqual({
        positionId: position.id,
        action: 'NONE',
        depreciationPct: null,
      });
      expect(marketDataService.getSpotPriceUsd).not.toHaveBeenCalled();
      expect(ledgerService.liquidateCollateral).not.toHaveBeenCalled();
    });
  });

  describe('checkPositionForLiquidation — healthy collateral', () => {
    it('does nothing when the collateral has appreciated', async () => {
      marketDataService.getSpotPriceUsd.mockResolvedValue(
        new Prisma.Decimal('2600'),
      );

      const result = await service.checkPositionForLiquidation(buildPosition());

      expect(result.action).toBe('NONE');
      expect(ledgerService.liquidateCollateral).not.toHaveBeenCalled();
      expect(prisma.creditPosition.update).not.toHaveBeenCalled();
    });

    it('does nothing when the depreciation stays below the warning threshold', async () => {
      // 2500 -> 2000 = 20% de dépréciation, sous le seuil d'alerte (30%).
      marketDataService.getSpotPriceUsd.mockResolvedValue(
        new Prisma.Decimal('2000'),
      );

      const result = await service.checkPositionForLiquidation(buildPosition());

      expect(result.action).toBe('NONE');
      expect(prisma.creditPosition.update).not.toHaveBeenCalled();
    });
  });

  describe('checkPositionForLiquidation — warning threshold', () => {
    it('sets the warning flag once the depreciation crosses 30%, without touching the ledger', async () => {
      // 2500 -> 1700 = 32% de dépréciation.
      marketDataService.getSpotPriceUsd.mockResolvedValue(
        new Prisma.Decimal('1700'),
      );

      const result = await service.checkPositionForLiquidation(
        buildPosition({ liquidationWarning: false }),
      );

      expect(result.action).toBe('WARNING_SET');
      expect(result.depreciationPct?.toNumber()).toBeCloseTo(32, 5);
      expect(prisma.creditPosition.update).toHaveBeenCalledWith({
        where: { id: 'position-1' },
        data: { liquidationWarning: true },
      });
      expect(ledgerService.liquidateCollateral).not.toHaveBeenCalled();
    });

    it('clears the warning flag once the price recovers below the threshold', async () => {
      marketDataService.getSpotPriceUsd.mockResolvedValue(
        new Prisma.Decimal('2400'),
      );

      const result = await service.checkPositionForLiquidation(
        buildPosition({ liquidationWarning: true }),
      );

      expect(result.action).toBe('WARNING_CLEARED');
      expect(prisma.creditPosition.update).toHaveBeenCalledWith({
        where: { id: 'position-1' },
        data: { liquidationWarning: false },
      });
    });

    it('is idempotent: does not re-write the flag if it already matches', async () => {
      marketDataService.getSpotPriceUsd.mockResolvedValue(
        new Prisma.Decimal('1700'),
      );

      const result = await service.checkPositionForLiquidation(
        buildPosition({ liquidationWarning: true }),
      );

      expect(result.action).toBe('NONE');
      expect(prisma.creditPosition.update).not.toHaveBeenCalled();
    });
  });

  describe('checkPositionForLiquidation — triggering liquidation', () => {
    it('liquidates the position once depreciation reaches 50%, removing it from the ledger without touching usedCredit', async () => {
      // 2500 -> 1250 = 50% de dépréciation, atteint le seuil de déclenchement.
      marketDataService.getSpotPriceUsd.mockResolvedValue(
        new Prisma.Decimal('1250'),
      );
      ledgerService.liquidateCollateral.mockResolvedValue({});

      const position = buildPosition();
      const result = await service.checkPositionForLiquidation(position);

      expect(result.action).toBe('LIQUIDATED');
      expect(result.depreciationPct?.toNumber()).toBeCloseTo(50, 5);
      expect(ledgerService.liquidateCollateral).toHaveBeenCalledWith(
        tx,
        'user-1',
        new Prisma.Decimal('2500'),
        new Prisma.Decimal('8750'),
      );
      expect(tx.creditPosition.update).toHaveBeenCalledWith({
        where: { id: 'position-1' },
        data: { status: 'LIQUIDATED', liquidationWarning: false },
      });
      expect(tx.transaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: 'LIQUIDATION',
          amount: new Prisma.Decimal('2500'),
          status: 'COMPLETED',
        },
      });
    });

    it('liquidates a position that depreciated beyond the trigger (severe crash)', async () => {
      marketDataService.getSpotPriceUsd.mockResolvedValue(
        new Prisma.Decimal('100'),
      );
      ledgerService.liquidateCollateral.mockResolvedValue({});

      const result = await service.checkPositionForLiquidation(buildPosition());

      expect(result.action).toBe('LIQUIDATED');
      expect(result.depreciationPct?.toNumber()).toBeCloseTo(96, 5);
    });
  });

  describe('runDailyLiquidationCheck', () => {
    it('queries active positions in yield-eligible currencies and checks each of them', async () => {
      const positionA = buildPosition({ id: 'position-a', userId: 'user-a' });
      const positionB = buildPosition({
        id: 'position-b',
        userId: 'user-b',
        collateralCurrency: 'XAUT',
      });
      prisma.creditPosition.findMany.mockResolvedValue([positionA, positionB]);
      marketDataService.getSpotPriceUsd.mockResolvedValue(
        new Prisma.Decimal('2600'),
      );

      const results = await service.runDailyLiquidationCheck();

      expect(prisma.creditPosition.findMany).toHaveBeenCalledWith({
        where: {
          status: 'ACTIVE',
          collateralCurrency: {
            in: ['PAXG', 'XAUT', 'KAG', 'ETH', 'XPT', 'XPD', 'XCU', 'WTI'],
          },
          collateralTokenAmount: { not: null },
        },
      });
      expect(results).toHaveLength(2);
      expect(results.map((r) => r.positionId)).toEqual([
        'position-a',
        'position-b',
      ]);
    });

    it('isolates a failure on one position so the rest of the batch still runs', async () => {
      const positionA = buildPosition({ id: 'position-a' });
      const positionB = buildPosition({ id: 'position-b' });
      prisma.creditPosition.findMany.mockResolvedValue([positionA, positionB]);
      marketDataService.getSpotPriceUsd
        .mockRejectedValueOnce(new Error('CoinMarketCap down'))
        .mockResolvedValueOnce(new Prisma.Decimal('2600'));

      const results = await service.runDailyLiquidationCheck();

      expect(results).toHaveLength(1);
      expect(results[0].positionId).toBe('position-b');
    });
  });
});
