import { CreditPosition, LedgerBalance, Prisma } from '@prisma/client';
import { InvalidAmountException } from '../common/exceptions/financial.exceptions';
import { LedgerService } from '../ledger/ledger.service';
import { MarketDataService } from '../market-data/market-data.service';
import { CreditEngineService } from './credit-engine.service';

function buildBalance(overrides: Partial<LedgerBalance> = {}): LedgerBalance {
  return {
    id: 'balance-1',
    userId: 'user-1',
    availableBalance: new Prisma.Decimal(0),
    lockedCollateral: new Prisma.Decimal(0),
    grantedCredit: new Prisma.Decimal(0),
    usedCredit: new Prisma.Decimal(0),
    investmentBalance: new Prisma.Decimal(0),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildPosition(
  overrides: Partial<CreditPosition> = {},
): CreditPosition {
  return {
    id: 'position-1',
    userId: 'user-1',
    collateralAmount: new Prisma.Decimal(0),
    creditIssued: new Prisma.Decimal(0),
    status: 'ACTIVE',
    currency: 'USD',
    exchangeRateAtLock: new Prisma.Decimal(1),
    creditIssuedInCurrency: new Prisma.Decimal(0),
    interestRatePct: new Prisma.Decimal('13.5'),
    originationFeePct: new Prisma.Decimal('2.0'),
    originationFeeAmount: new Prisma.Decimal(0),
    custodyFeePct: new Prisma.Decimal('0.5'),
    termMonths: 12,
    maturityDate: new Date(),
    collateralCurrency: null,
    collateralTokenAmount: null,
    collateralEntryPriceUsd: null,
    collateralYieldAppliedPriceUsd: null,
    yieldRepaidAmount: new Prisma.Decimal('0'),
    liquidationWarning: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('CreditEngineService', () => {
  let prisma: { $transaction: jest.Mock };
  let ledgerService: {
    lockCollateral: jest.Mock;
    applyRepayment: jest.Mock;
    debitAvailableBalance: jest.Mock;
  };
  let marketDataService: {
    getEurPerUsd: jest.Mock;
    getSpotPriceUsd: jest.Mock;
  };
  let tx: {
    creditPosition: {
      create: jest.Mock;
      updateMany: jest.Mock;
      findFirst: jest.Mock;
    };
    transaction: { createMany: jest.Mock; create: jest.Mock };
  };
  let service: CreditEngineService;

  beforeEach(() => {
    tx = {
      creditPosition: {
        create: jest.fn(),
        updateMany: jest.fn(),
        findFirst: jest.fn(),
      },
      transaction: { createMany: jest.fn(), create: jest.fn() },
    };
    prisma = {
      $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
        callback(tx),
      ),
    };
    ledgerService = {
      lockCollateral: jest.fn(),
      applyRepayment: jest.fn(),
      debitAvailableBalance: jest.fn(),
    };
    marketDataService = { getEurPerUsd: jest.fn(), getSpotPriceUsd: jest.fn() };
    service = new CreditEngineService(
      prisma as never,
      ledgerService as unknown as LedgerService,
      marketDataService as unknown as MarketDataService,
    );
  });

  describe('input validation (shared by both operations)', () => {
    it.each([
      ['zero', 0],
      ['negative', -5],
      ['non-finite', Infinity],
      ['not a number', 'not-a-number'],
    ])('rejects a %s collateral amount', async (_label, value) => {
      await expect(
        service.lockCollateralAndIssueCredit('user-1', value),
      ).rejects.toBeInstanceOf(InvalidAmountException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects a non-positive repayment amount', async () => {
      await expect(
        service.repayCreditAndUnlockCollateral('user-1', -1),
      ).rejects.toBeInstanceOf(InvalidAmountException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('lockCollateralAndIssueCredit', () => {
    it('locks the collateral, issues 350% credit in USD, charges the origination fee, and journals every movement', async () => {
      const updatedBalance = buildBalance({
        lockedCollateral: new Prisma.Decimal('2000'),
        grantedCredit: new Prisma.Decimal('7000'),
      });
      const balanceAfterFee = buildBalance({
        availableBalance: new Prisma.Decimal('-140'),
      });
      const position = buildPosition({
        collateralAmount: new Prisma.Decimal('2000'),
        creditIssued: new Prisma.Decimal('7000'),
      });
      ledgerService.lockCollateral.mockResolvedValue(updatedBalance);
      ledgerService.debitAvailableBalance.mockResolvedValue(balanceAfterFee);
      tx.creditPosition.create.mockResolvedValue(position);

      const result = await service.lockCollateralAndIssueCredit(
        'user-1',
        '2000',
      );

      expect(ledgerService.lockCollateral).toHaveBeenCalledWith(
        tx,
        'user-1',
        new Prisma.Decimal('2000'),
        new Prisma.Decimal('7000'),
      );
      // Frais d'origination = 2% de 7000 (crédit émis), pas de 2000 (collatéral).
      expect(ledgerService.debitAvailableBalance).toHaveBeenCalledWith(
        tx,
        'user-1',
        new Prisma.Decimal('140'),
      );
      expect(marketDataService.getEurPerUsd).not.toHaveBeenCalled();

      expect(tx.creditPosition.create).toHaveBeenCalledWith({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- jest.fn() has no generic signature to narrow against
        data: expect.objectContaining({
          userId: 'user-1',
          collateralAmount: new Prisma.Decimal('2000'),
          creditIssued: new Prisma.Decimal('7000'),
          status: 'ACTIVE',
          currency: 'USD',
          exchangeRateAtLock: new Prisma.Decimal(1),
          creditIssuedInCurrency: new Prisma.Decimal('7000'),
          interestRatePct: new Prisma.Decimal('13.5'),
          originationFeePct: new Prisma.Decimal('2.0'),
          originationFeeAmount: new Prisma.Decimal('140'),
          custodyFeePct: new Prisma.Decimal('0.5'),
          termMonths: 12,
        }),
      });

      expect(tx.transaction.createMany).toHaveBeenCalledWith({
        data: [
          {
            userId: 'user-1',
            type: 'COLLATERAL_LOCK',
            amount: new Prisma.Decimal('2000'),
            status: 'COMPLETED',
          },
          {
            userId: 'user-1',
            type: 'CREDIT_ISSUED',
            amount: new Prisma.Decimal('7000'),
            status: 'COMPLETED',
          },
          {
            userId: 'user-1',
            type: 'ORIGINATION_FEE',
            amount: new Prisma.Decimal('140'),
            status: 'COMPLETED',
          },
        ],
      });
      expect(result).toEqual({ balance: balanceAfterFee, position });
    });

    it('converts the credit and interest rate to EUR using the live exchange rate when the client chooses EUR', async () => {
      ledgerService.lockCollateral.mockResolvedValue(buildBalance());
      ledgerService.debitAvailableBalance.mockResolvedValue(buildBalance());
      marketDataService.getEurPerUsd.mockResolvedValue(
        new Prisma.Decimal('0.92'),
      );
      tx.creditPosition.create.mockResolvedValue(buildPosition());

      await service.lockCollateralAndIssueCredit('user-1', '2000', 'EUR');

      expect(marketDataService.getEurPerUsd).toHaveBeenCalledTimes(1);
      expect(tx.creditPosition.create).toHaveBeenCalledWith({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- jest.fn() has no generic signature to narrow against
        data: expect.objectContaining({
          currency: 'EUR',
          exchangeRateAtLock: new Prisma.Decimal('0.92'),
          // 7000 USD de crédit (350% de 2000) converti au cours figé : 7000 * 0.92 = 6440 EUR.
          creditIssuedInCurrency: new Prisma.Decimal('6440'),
          // EURIBOR (3.5%) + prime de risque (8.5%) = 12.0%, pas le taux USD (13.5%).
          interestRatePct: new Prisma.Decimal('12.0'),
        }),
      });
    });

    it('captures the entry price and implied token amount when the collateral is gold (PAXG/XAUT)', async () => {
      ledgerService.lockCollateral.mockResolvedValue(buildBalance());
      ledgerService.debitAvailableBalance.mockResolvedValue(buildBalance());
      marketDataService.getSpotPriceUsd.mockResolvedValue(
        new Prisma.Decimal('2500'),
      );
      tx.creditPosition.create.mockResolvedValue(buildPosition());

      await service.lockCollateralAndIssueCredit(
        'user-1',
        '2500',
        'USD',
        'PAXG',
      );

      expect(marketDataService.getSpotPriceUsd).toHaveBeenCalledWith('PAXG');
      expect(tx.creditPosition.create).toHaveBeenCalledWith({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- jest.fn() has no generic signature to narrow against
        data: expect.objectContaining({
          collateralCurrency: 'PAXG',
          collateralEntryPriceUsd: new Prisma.Decimal('2500'),
          // 2500 USD de gage / 2500 USD par once = 1 once implicite.
          collateralTokenAmount: new Prisma.Decimal('1'),
          // Le cliquet démarre au même niveau que le prix d'entrée.
          collateralYieldAppliedPriceUsd: new Prisma.Decimal('2500'),
        }),
      });
    });

    it('also captures the entry price for ETH — eligible for the yield-based repayment like gold', async () => {
      ledgerService.lockCollateral.mockResolvedValue(buildBalance());
      ledgerService.debitAvailableBalance.mockResolvedValue(buildBalance());
      marketDataService.getSpotPriceUsd.mockResolvedValue(
        new Prisma.Decimal('2000'),
      );
      tx.creditPosition.create.mockResolvedValue(buildPosition());

      await service.lockCollateralAndIssueCredit(
        'user-1',
        '2000',
        'USD',
        'ETH',
      );

      expect(marketDataService.getSpotPriceUsd).toHaveBeenCalledWith('ETH');
      expect(tx.creditPosition.create).toHaveBeenCalledWith({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- jest.fn() has no generic signature to narrow against
        data: expect.objectContaining({
          collateralCurrency: 'ETH',
          collateralEntryPriceUsd: new Prisma.Decimal('2000'),
          collateralTokenAmount: new Prisma.Decimal('1'),
          collateralYieldAppliedPriceUsd: new Prisma.Decimal('2000'),
        }),
      });
    });

    it('also captures the entry price for silver (KAG) — eligible for the yield-based repayment like gold', async () => {
      ledgerService.lockCollateral.mockResolvedValue(buildBalance());
      ledgerService.debitAvailableBalance.mockResolvedValue(buildBalance());
      marketDataService.getSpotPriceUsd.mockResolvedValue(
        new Prisma.Decimal('35'),
      );
      tx.creditPosition.create.mockResolvedValue(buildPosition());

      await service.lockCollateralAndIssueCredit(
        'user-1',
        '2000',
        'USD',
        'KAG',
      );

      expect(marketDataService.getSpotPriceUsd).toHaveBeenCalledWith('KAG');
      expect(tx.creditPosition.create).toHaveBeenCalledWith({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- jest.fn() has no generic signature to narrow against
        data: expect.objectContaining({
          collateralCurrency: 'KAG',
          collateralEntryPriceUsd: new Prisma.Decimal('35'),
          // 2000 USD de gage / 35 USD par once d'argent = ~57.14 onces implicites.
          collateralTokenAmount: new Prisma.Decimal('2000').dividedBy('35'),
          collateralYieldAppliedPriceUsd: new Prisma.Decimal('35'),
        }),
      });
    });

    it('also captures the entry price for tokenized platinum (XPT) — new industrial RWA asset from the yield roadmap', async () => {
      ledgerService.lockCollateral.mockResolvedValue(buildBalance());
      ledgerService.debitAvailableBalance.mockResolvedValue(buildBalance());
      marketDataService.getSpotPriceUsd.mockResolvedValue(
        new Prisma.Decimal('16.78'),
      );
      tx.creditPosition.create.mockResolvedValue(buildPosition());

      await service.lockCollateralAndIssueCredit(
        'user-1',
        '2000',
        'USD',
        'XPT',
      );

      expect(marketDataService.getSpotPriceUsd).toHaveBeenCalledWith('XPT');
      expect(tx.creditPosition.create).toHaveBeenCalledWith({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- jest.fn() has no generic signature to narrow against
        data: expect.objectContaining({
          collateralCurrency: 'XPT',
          collateralEntryPriceUsd: new Prisma.Decimal('16.78'),
          collateralTokenAmount: new Prisma.Decimal('2000').dividedBy('16.78'),
          collateralYieldAppliedPriceUsd: new Prisma.Decimal('16.78'),
        }),
      });
    });

    it('does not fetch a spot price or store collateral-asset fields for a stablecoin', async () => {
      ledgerService.lockCollateral.mockResolvedValue(buildBalance());
      ledgerService.debitAvailableBalance.mockResolvedValue(buildBalance());
      tx.creditPosition.create.mockResolvedValue(buildPosition());

      await service.lockCollateralAndIssueCredit(
        'user-1',
        '2000',
        'USD',
        'USDS',
      );

      expect(marketDataService.getSpotPriceUsd).not.toHaveBeenCalled();
      expect(tx.creditPosition.create).toHaveBeenCalledWith({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- jest.fn() has no generic signature to narrow against
        data: expect.objectContaining({
          collateralCurrency: 'USDS',
          collateralTokenAmount: null,
          collateralEntryPriceUsd: null,
          collateralYieldAppliedPriceUsd: null,
        }),
      });
    });

    it('leaves the collateral-asset fields null when no asset is provided (legacy call path)', async () => {
      ledgerService.lockCollateral.mockResolvedValue(buildBalance());
      ledgerService.debitAvailableBalance.mockResolvedValue(buildBalance());
      tx.creditPosition.create.mockResolvedValue(buildPosition());

      await service.lockCollateralAndIssueCredit('user-1', '2000');

      expect(tx.creditPosition.create).toHaveBeenCalledWith({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- jest.fn() has no generic signature to narrow against
        data: expect.objectContaining({
          collateralCurrency: null,
          collateralTokenAmount: null,
          collateralEntryPriceUsd: null,
          collateralYieldAppliedPriceUsd: null,
        }),
      });
    });

    it('rolls back the whole lock when the available balance cannot cover the origination fee', async () => {
      ledgerService.lockCollateral.mockResolvedValue(buildBalance());
      const error = new Error('insufficient funds for origination fee');
      ledgerService.debitAvailableBalance.mockRejectedValue(error);

      await expect(
        service.lockCollateralAndIssueCredit('user-1', '2000'),
      ).rejects.toBe(error);
      expect(tx.creditPosition.create).not.toHaveBeenCalled();
    });

    it('propagates errors raised by the ledger (e.g. insufficient funds for the collateral itself)', async () => {
      const error = new Error('insufficient funds');
      ledgerService.lockCollateral.mockRejectedValue(error);

      await expect(
        service.lockCollateralAndIssueCredit('user-1', '2000'),
      ).rejects.toBe(error);
      expect(ledgerService.debitAvailableBalance).not.toHaveBeenCalled();
      expect(tx.creditPosition.create).not.toHaveBeenCalled();
    });
  });

  describe('repayCreditAndUnlockCollateral', () => {
    it('charges no interest when there is no active position to accrue against', async () => {
      tx.creditPosition.findFirst.mockResolvedValue(null);
      const balance = buildBalance({ usedCredit: new Prisma.Decimal('60') });
      ledgerService.applyRepayment.mockResolvedValue({
        balance,
        collateralUnlocked: false,
      });

      const result = await service.repayCreditAndUnlockCollateral(
        'user-1',
        '40',
      );

      expect(tx.creditPosition.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: 'ACTIVE' },
        orderBy: { createdAt: 'asc' },
      });
      expect(ledgerService.debitAvailableBalance).not.toHaveBeenCalled();
      expect(result).toEqual({
        balance,
        collateralUnlocked: false,
        closedPositions: 0,
        interestCharged: new Prisma.Decimal(0),
      });
    });

    it('accrues interest on the repaid amount since the position was opened, and journals it separately', async () => {
      const hundredDaysAgo = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
      tx.creditPosition.findFirst.mockResolvedValue(
        buildPosition({
          createdAt: hundredDaysAgo,
          interestRatePct: new Prisma.Decimal('13.5'),
        }),
      );
      const balanceAfterRepayment = buildBalance({
        usedCredit: new Prisma.Decimal('0'),
      });
      const balanceAfterInterest = buildBalance({
        availableBalance: new Prisma.Decimal('-37'),
      });
      ledgerService.applyRepayment.mockResolvedValue({
        balance: balanceAfterRepayment,
        collateralUnlocked: false,
      });
      ledgerService.debitAvailableBalance.mockResolvedValue(
        balanceAfterInterest,
      );

      const result = await service.repayCreditAndUnlockCollateral(
        'user-1',
        '1000',
      );

      // 1000 * 13.5% * (100/365) ≈ 36.986
      expect(ledgerService.debitAvailableBalance).toHaveBeenCalledWith(
        tx,
        'user-1',
        expect.any(Prisma.Decimal),
      );

      /* eslint-disable @typescript-eslint/no-unsafe-member-access -- jest.fn() has no generic signature to narrow against */
      const chargedArg = ledgerService.debitAvailableBalance.mock
        .calls[0][2] as Prisma.Decimal;
      /* eslint-enable @typescript-eslint/no-unsafe-member-access */
      expect(chargedArg.toNumber()).toBeCloseTo(36.986, 2);

      expect(tx.transaction.create).toHaveBeenCalledWith({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- jest.fn() has no generic signature to narrow against
        data: expect.objectContaining({
          userId: 'user-1',
          type: 'INTEREST_PAYMENT',
          status: 'COMPLETED',
        }),
      });
      expect(result.interestCharged.toNumber()).toBeCloseTo(36.986, 2);
      expect(result.balance).toEqual(balanceAfterInterest);
    });

    it('journals the repayment without closing positions when collateral stays locked', async () => {
      tx.creditPosition.findFirst.mockResolvedValue(null);
      const balance = buildBalance({ usedCredit: new Prisma.Decimal('60') });
      ledgerService.applyRepayment.mockResolvedValue({
        balance,
        collateralUnlocked: false,
      });

      const result = await service.repayCreditAndUnlockCollateral(
        'user-1',
        '40',
      );

      expect(ledgerService.applyRepayment).toHaveBeenCalledWith(
        tx,
        'user-1',
        new Prisma.Decimal('40'),
      );
      expect(tx.transaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: 'REPAYMENT',
          amount: new Prisma.Decimal('40'),
          status: 'COMPLETED',
        },
      });
      expect(tx.creditPosition.updateMany).not.toHaveBeenCalled();
      expect(result).toEqual({
        balance,
        collateralUnlocked: false,
        closedPositions: 0,
        interestCharged: new Prisma.Decimal(0),
      });
    });

    it('closes all active positions and reports the count when fully repaid', async () => {
      tx.creditPosition.findFirst.mockResolvedValue(null);
      const balance = buildBalance({ usedCredit: new Prisma.Decimal('0') });
      ledgerService.applyRepayment.mockResolvedValue({
        balance,
        collateralUnlocked: true,
      });
      tx.creditPosition.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.repayCreditAndUnlockCollateral(
        'user-1',
        '60',
      );

      expect(tx.creditPosition.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: 'ACTIVE' },
        data: { status: 'CLOSED' },
      });
      expect(result).toEqual({
        balance,
        collateralUnlocked: true,
        closedPositions: 1,
        interestCharged: new Prisma.Decimal(0),
      });
    });

    it('propagates errors raised by the ledger (e.g. over-repayment)', async () => {
      tx.creditPosition.findFirst.mockResolvedValue(null);
      const error = new Error('over repayment');
      ledgerService.applyRepayment.mockRejectedValue(error);

      await expect(
        service.repayCreditAndUnlockCollateral('user-1', '999'),
      ).rejects.toBe(error);
      expect(tx.transaction.create).not.toHaveBeenCalled();
    });

    it('journals a YIELD_REPAYMENT transaction instead of REPAYMENT when requested by the yield engine', async () => {
      tx.creditPosition.findFirst.mockResolvedValue(null);
      const balance = buildBalance({ usedCredit: new Prisma.Decimal('60') });
      ledgerService.applyRepayment.mockResolvedValue({
        balance,
        collateralUnlocked: false,
      });

      await service.repayCreditAndUnlockCollateral(
        'user-1',
        '40',
        'YIELD_REPAYMENT',
      );

      expect(tx.transaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: 'YIELD_REPAYMENT',
          amount: new Prisma.Decimal('40'),
          status: 'COMPLETED',
        },
      });
    });
  });
});
