import { CreditPosition, LedgerBalance, Prisma } from '@prisma/client';
import { LedgerService } from '../ledger/ledger.service';
import { MarketDataService } from '../market-data/market-data.service';
import { CollateralYieldService } from './collateral-yield.service';
import { CreditEngineService } from './credit-engine.service';

function buildPosition(
  overrides: Partial<CreditPosition> = {},
): CreditPosition {
  return {
    id: 'position-1',
    userId: 'user-1',
    collateralAmount: new Prisma.Decimal('2500'),
    creditIssued: new Prisma.Decimal('3750'),
    status: 'ACTIVE',
    currency: 'USD',
    exchangeRateAtLock: new Prisma.Decimal(1),
    creditIssuedInCurrency: new Prisma.Decimal('3750'),
    interestRatePct: new Prisma.Decimal('13.5'),
    originationFeePct: new Prisma.Decimal('2.0'),
    originationFeeAmount: new Prisma.Decimal('75'),
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

function buildBalance(overrides: Partial<LedgerBalance> = {}): LedgerBalance {
  return {
    id: 'balance-1',
    userId: 'user-1',
    availableBalance: new Prisma.Decimal(0),
    lockedCollateral: new Prisma.Decimal('2500'),
    grantedCredit: new Prisma.Decimal('3750'),
    usedCredit: new Prisma.Decimal('3750'),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('CollateralYieldService', () => {
  let prisma: {
    creditPosition: { findMany: jest.Mock; update: jest.Mock };
  };
  let ledgerService: { getBalance: jest.Mock };
  let marketDataService: { getSpotPriceUsd: jest.Mock };
  let creditEngineService: { repayCreditAndUnlockCollateral: jest.Mock };
  let service: CollateralYieldService;

  beforeEach(() => {
    prisma = {
      creditPosition: { findMany: jest.fn(), update: jest.fn() },
    };
    ledgerService = { getBalance: jest.fn() };
    marketDataService = { getSpotPriceUsd: jest.fn() };
    creditEngineService = { repayCreditAndUnlockCollateral: jest.fn() };
    service = new CollateralYieldService(
      prisma as never,
      ledgerService as unknown as LedgerService,
      marketDataService as unknown as MarketDataService,
      creditEngineService as unknown as CreditEngineService,
    );
  });

  describe('accrueYieldForPosition — skip conditions (no-op, no side effect)', () => {
    it.each([
      ['a closed position', buildPosition({ status: 'CLOSED' })],
      [
        'a position with no collateral asset',
        buildPosition({ collateralCurrency: null }),
      ],
      [
        'a stablecoin-backed position (never appreciates)',
        buildPosition({ collateralCurrency: 'USDS' }),
      ],
      [
        'a position with no implied token amount',
        buildPosition({ collateralTokenAmount: null }),
      ],
      [
        'a position with no ratchet price yet',
        buildPosition({ collateralYieldAppliedPriceUsd: null }),
      ],
    ])('does nothing for %s', async (_label, position) => {
      const result = await service.accrueYieldForPosition(position);

      expect(result).toEqual({
        positionId: position.id,
        applied: false,
        yieldAmount: new Prisma.Decimal(0),
      });
      expect(marketDataService.getSpotPriceUsd).not.toHaveBeenCalled();
      expect(
        creditEngineService.repayCreditAndUnlockCollateral,
      ).not.toHaveBeenCalled();
    });

    it('does nothing when the spot price has not risen above the ratchet (no new appreciation)', async () => {
      marketDataService.getSpotPriceUsd.mockResolvedValue(
        new Prisma.Decimal('2500'),
      );

      const result = await service.accrueYieldForPosition(buildPosition());

      expect(result.applied).toBe(false);
      expect(ledgerService.getBalance).not.toHaveBeenCalled();
      expect(
        creditEngineService.repayCreditAndUnlockCollateral,
      ).not.toHaveBeenCalled();
    });

    it('does nothing when the price dropped below the ratchet (never claws back)', async () => {
      marketDataService.getSpotPriceUsd.mockResolvedValue(
        new Prisma.Decimal('2400'),
      );

      const result = await service.accrueYieldForPosition(buildPosition());

      expect(result.applied).toBe(false);
      expect(
        creditEngineService.repayCreditAndUnlockCollateral,
      ).not.toHaveBeenCalled();
    });

    it('does nothing when the user has no ledger yet', async () => {
      marketDataService.getSpotPriceUsd.mockResolvedValue(
        new Prisma.Decimal('2600'),
      );
      ledgerService.getBalance.mockRejectedValue(new Error('no ledger'));

      const result = await service.accrueYieldForPosition(buildPosition());

      expect(result.applied).toBe(false);
      expect(
        creditEngineService.repayCreditAndUnlockCollateral,
      ).not.toHaveBeenCalled();
      expect(prisma.creditPosition.update).not.toHaveBeenCalled();
    });

    it('does nothing when the user has no outstanding used credit', async () => {
      marketDataService.getSpotPriceUsd.mockResolvedValue(
        new Prisma.Decimal('2600'),
      );
      ledgerService.getBalance.mockResolvedValue(
        buildBalance({ usedCredit: new Prisma.Decimal('0') }),
      );

      const result = await service.accrueYieldForPosition(buildPosition());

      expect(result.applied).toBe(false);
      expect(
        creditEngineService.repayCreditAndUnlockCollateral,
      ).not.toHaveBeenCalled();
    });
  });

  describe('accrueYieldForPosition — applying the yield', () => {
    it('repays the appreciation (price delta × implied token amount) as a YIELD_REPAYMENT and advances the ratchet', async () => {
      marketDataService.getSpotPriceUsd.mockResolvedValue(
        new Prisma.Decimal('2600'),
      );
      ledgerService.getBalance.mockResolvedValue(
        buildBalance({ usedCredit: new Prisma.Decimal('3750') }),
      );
      creditEngineService.repayCreditAndUnlockCollateral.mockResolvedValue({
        balance: buildBalance({ usedCredit: new Prisma.Decimal('3650') }),
        collateralUnlocked: false,
        closedPositions: 0,
        interestCharged: new Prisma.Decimal(0),
      });

      const position = buildPosition();
      const result = await service.accrueYieldForPosition(position);

      // (2600 - 2500) * 1 once = 100 $US de plus-value.
      expect(
        creditEngineService.repayCreditAndUnlockCollateral,
      ).toHaveBeenCalledWith(
        'user-1',
        new Prisma.Decimal('100'),
        'YIELD_REPAYMENT',
      );
      expect(prisma.creditPosition.update).toHaveBeenCalledWith({
        where: { id: 'position-1' },
        data: {
          collateralYieldAppliedPriceUsd: new Prisma.Decimal('2600'),
          yieldRepaidAmount: new Prisma.Decimal('100'),
        },
      });
      expect(result).toEqual({
        positionId: 'position-1',
        applied: true,
        yieldAmount: new Prisma.Decimal('100'),
      });
    });

    it('accrues yield for an ETH-backed position exactly like a gold-backed one', async () => {
      marketDataService.getSpotPriceUsd.mockResolvedValue(
        new Prisma.Decimal('2600'),
      );
      ledgerService.getBalance.mockResolvedValue(
        buildBalance({ usedCredit: new Prisma.Decimal('3750') }),
      );
      creditEngineService.repayCreditAndUnlockCollateral.mockResolvedValue({
        balance: buildBalance({ usedCredit: new Prisma.Decimal('3650') }),
        collateralUnlocked: false,
        closedPositions: 0,
        interestCharged: new Prisma.Decimal(0),
      });

      const result = await service.accrueYieldForPosition(
        buildPosition({ collateralCurrency: 'ETH' }),
      );

      expect(marketDataService.getSpotPriceUsd).toHaveBeenCalledWith('ETH');
      expect(result.applied).toBe(true);
      expect(result.yieldAmount).toEqual(new Prisma.Decimal('100'));
    });

    it('accrues yield for a silver-backed (KAG) position exactly like a gold-backed one', async () => {
      marketDataService.getSpotPriceUsd.mockResolvedValue(
        new Prisma.Decimal('2600'),
      );
      ledgerService.getBalance.mockResolvedValue(
        buildBalance({ usedCredit: new Prisma.Decimal('3750') }),
      );
      creditEngineService.repayCreditAndUnlockCollateral.mockResolvedValue({
        balance: buildBalance({ usedCredit: new Prisma.Decimal('3650') }),
        collateralUnlocked: false,
        closedPositions: 0,
        interestCharged: new Prisma.Decimal(0),
      });

      const result = await service.accrueYieldForPosition(
        buildPosition({ collateralCurrency: 'KAG' }),
      );

      expect(marketDataService.getSpotPriceUsd).toHaveBeenCalledWith('KAG');
      expect(result.applied).toBe(true);
      expect(result.yieldAmount).toEqual(new Prisma.Decimal('100'));
    });

    it('accrues yield for an industrial RWA-backed (XPT) position exactly like a gold-backed one', async () => {
      marketDataService.getSpotPriceUsd.mockResolvedValue(
        new Prisma.Decimal('2600'),
      );
      ledgerService.getBalance.mockResolvedValue(
        buildBalance({ usedCredit: new Prisma.Decimal('3750') }),
      );
      creditEngineService.repayCreditAndUnlockCollateral.mockResolvedValue({
        balance: buildBalance({ usedCredit: new Prisma.Decimal('3650') }),
        collateralUnlocked: false,
        closedPositions: 0,
        interestCharged: new Prisma.Decimal(0),
      });

      const result = await service.accrueYieldForPosition(
        buildPosition({ collateralCurrency: 'XPT' }),
      );

      expect(marketDataService.getSpotPriceUsd).toHaveBeenCalledWith('XPT');
      expect(result.applied).toBe(true);
      expect(result.yieldAmount).toEqual(new Prisma.Decimal('100'));
    });

    it('caps the yield-based repayment at the outstanding used credit (never over-repays)', async () => {
      // Grosse appréciation (1000 $US) mais seulement 50 $US de crédit utilisé.
      marketDataService.getSpotPriceUsd.mockResolvedValue(
        new Prisma.Decimal('3500'),
      );
      ledgerService.getBalance.mockResolvedValue(
        buildBalance({ usedCredit: new Prisma.Decimal('50') }),
      );
      creditEngineService.repayCreditAndUnlockCollateral.mockResolvedValue({
        balance: buildBalance({ usedCredit: new Prisma.Decimal('0') }),
        collateralUnlocked: true,
        closedPositions: 1,
        interestCharged: new Prisma.Decimal(0),
      });

      const result = await service.accrueYieldForPosition(buildPosition());

      expect(
        creditEngineService.repayCreditAndUnlockCollateral,
      ).toHaveBeenCalledWith(
        'user-1',
        new Prisma.Decimal('50'),
        'YIELD_REPAYMENT',
      );
      expect(result.yieldAmount).toEqual(new Prisma.Decimal('50'));
    });

    it('caps the yield-based repayment at 60% of the credit issued on the position, even when the appreciation and used credit both allow more', async () => {
      // creditIssued = 3750 => plafond 60% = 2250. Appréciation brute = (2600-2500)*100 = 10 000,
      // usedCredit largement suffisant : seul le plafond des 60% doit limiter le remboursement.
      marketDataService.getSpotPriceUsd.mockResolvedValue(
        new Prisma.Decimal('2600'),
      );
      ledgerService.getBalance.mockResolvedValue(
        buildBalance({ usedCredit: new Prisma.Decimal('100000') }),
      );
      creditEngineService.repayCreditAndUnlockCollateral.mockResolvedValue({
        balance: buildBalance(),
        collateralUnlocked: false,
        closedPositions: 0,
        interestCharged: new Prisma.Decimal(0),
      });

      const result = await service.accrueYieldForPosition(
        buildPosition({ collateralTokenAmount: new Prisma.Decimal('100') }),
      );

      expect(
        creditEngineService.repayCreditAndUnlockCollateral,
      ).toHaveBeenCalledWith(
        'user-1',
        new Prisma.Decimal('2250'),
        'YIELD_REPAYMENT',
      );
      expect(result.yieldAmount).toEqual(new Prisma.Decimal('2250'));
    });

    it('does nothing once the 60% cap has already been reached by prior yield repayments', async () => {
      const result = await service.accrueYieldForPosition(
        buildPosition({ yieldRepaidAmount: new Prisma.Decimal('2250') }),
      );

      expect(result).toEqual({
        positionId: 'position-1',
        applied: false,
        yieldAmount: new Prisma.Decimal(0),
      });
      expect(marketDataService.getSpotPriceUsd).not.toHaveBeenCalled();
      expect(
        creditEngineService.repayCreditAndUnlockCollateral,
      ).not.toHaveBeenCalled();
    });

    it('only applies the remaining capacity under the 60% cap when part of it was already used', async () => {
      marketDataService.getSpotPriceUsd.mockResolvedValue(
        new Prisma.Decimal('2600'),
      );
      ledgerService.getBalance.mockResolvedValue(
        buildBalance({ usedCredit: new Prisma.Decimal('100000') }),
      );
      creditEngineService.repayCreditAndUnlockCollateral.mockResolvedValue({
        balance: buildBalance(),
        collateralUnlocked: false,
        closedPositions: 0,
        interestCharged: new Prisma.Decimal(0),
      });

      // Plafond 2250, déjà 2200 remboursés par rendement => 50 de marge restante,
      // alors que l'appréciation brute (100) et le crédit utilisé le permettraient largement.
      const result = await service.accrueYieldForPosition(
        buildPosition({ yieldRepaidAmount: new Prisma.Decimal('2200') }),
      );

      expect(
        creditEngineService.repayCreditAndUnlockCollateral,
      ).toHaveBeenCalledWith(
        'user-1',
        new Prisma.Decimal('50'),
        'YIELD_REPAYMENT',
      );
      expect(prisma.creditPosition.update).toHaveBeenCalledWith({
        where: { id: 'position-1' },
        data: {
          collateralYieldAppliedPriceUsd: new Prisma.Decimal('2600'),
          yieldRepaidAmount: new Prisma.Decimal('2250'),
        },
      });
      expect(result.yieldAmount).toEqual(new Prisma.Decimal('50'));
    });

    it('does not advance the ratchet when the repayment fails (retried on the next pass)', async () => {
      marketDataService.getSpotPriceUsd.mockResolvedValue(
        new Prisma.Decimal('2600'),
      );
      ledgerService.getBalance.mockResolvedValue(
        buildBalance({ usedCredit: new Prisma.Decimal('3750') }),
      );
      creditEngineService.repayCreditAndUnlockCollateral.mockRejectedValue(
        new Error('insufficient available balance for accrued interest'),
      );

      const result = await service.accrueYieldForPosition(buildPosition());

      expect(result.applied).toBe(false);
      expect(prisma.creditPosition.update).not.toHaveBeenCalled();
    });
  });

  describe('runDailyAccrual', () => {
    it('queries active gold-backed positions and accrues each of them', async () => {
      const positionA = buildPosition({ id: 'position-a', userId: 'user-a' });
      const positionB = buildPosition({
        id: 'position-b',
        userId: 'user-b',
        collateralCurrency: 'XAUT',
      });
      prisma.creditPosition.findMany.mockResolvedValue([positionA, positionB]);
      marketDataService.getSpotPriceUsd.mockResolvedValue(
        new Prisma.Decimal('2500'),
      );

      const results = await service.runDailyAccrual();

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
        .mockResolvedValueOnce(new Prisma.Decimal('2500'));

      const results = await service.runDailyAccrual();

      // position-a a échoué et a été journalisée, mais position-b a bien été traitée.
      expect(results).toHaveLength(1);
      expect(results[0].positionId).toBe('position-b');
    });
  });
});
