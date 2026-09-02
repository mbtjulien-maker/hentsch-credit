import { LedgerBalance, Prisma } from '@prisma/client';
import {
  InsufficientFundsException,
  LedgerNotFoundException,
  NoOutstandingCreditException,
  OverRepaymentException,
} from '../common/exceptions/financial.exceptions';
import { LedgerService } from './ledger.service';

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

describe('LedgerService', () => {
  let prisma: {
    ledgerBalance: { findUnique: jest.Mock; updateMany: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let service: LedgerService;

  beforeEach(() => {
    prisma = {
      ledgerBalance: { findUnique: jest.fn(), updateMany: jest.fn() },
      $queryRaw: jest.fn(),
    };
    service = new LedgerService(prisma as never);
  });

  describe('getBalance', () => {
    it('returns the balance when it exists', async () => {
      const balance = buildBalance();
      prisma.ledgerBalance.findUnique.mockResolvedValue(balance);

      await expect(service.getBalance('user-1')).resolves.toEqual(balance);
      expect(prisma.ledgerBalance.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('throws LedgerNotFoundException when no ledger exists', async () => {
      prisma.ledgerBalance.findUnique.mockResolvedValue(null);

      await expect(service.getBalance('unknown-user')).rejects.toBeInstanceOf(
        LedgerNotFoundException,
      );
    });
  });

  describe('calculateTotalPurchasingPower', () => {
    it('matches the reference scenario from CLAUDE.md §2B (0 + 2000 + 7000 - 0 = 9000, ratio 350%)', () => {
      const balance = buildBalance({
        availableBalance: new Prisma.Decimal('0'),
        lockedCollateral: new Prisma.Decimal('2000'),
        grantedCredit: new Prisma.Decimal('7000'),
        usedCredit: new Prisma.Decimal('0'),
      });

      const result = service.calculateTotalPurchasingPower(balance);

      expect(result.toString()).toBe('9000');
    });

    it('subtracts used credit and includes available balance', () => {
      const balance = buildBalance({
        availableBalance: new Prisma.Decimal('100'),
        lockedCollateral: new Prisma.Decimal('1000'),
        grantedCredit: new Prisma.Decimal('1500'),
        usedCredit: new Prisma.Decimal('200'),
      });

      // 100 + 1000 + 1500 - 200 = 2400
      const result = service.calculateTotalPurchasingPower(balance);

      expect(result.toString()).toBe('2400');
    });

    it('uses the persisted grantedCredit, not lockedCollateral × current ratio — a position locked under a since-changed rate keeps its original credit', () => {
      // Verrouillée quand le taux était 75% : 2000 * 0.75 = 1500, pas 2000 * 3.5 (taux courant) = 7000.
      const balance = buildBalance({
        availableBalance: new Prisma.Decimal('0'),
        lockedCollateral: new Prisma.Decimal('2000'),
        grantedCredit: new Prisma.Decimal('1500'),
        usedCredit: new Prisma.Decimal('0'),
      });

      const result = service.calculateTotalPurchasingPower(balance);

      expect(result.toString()).toBe('3500');
    });
  });

  describe('getWithdrawableBalance', () => {
    it('returns only the available balance (excludes locked collateral)', () => {
      const balance = buildBalance({
        availableBalance: new Prisma.Decimal('42.5'),
        lockedCollateral: new Prisma.Decimal('2000'),
      });

      expect(service.getWithdrawableBalance(balance).toString()).toBe('42.5');
    });
  });

  describe('lockCollateral', () => {
    const tx = () => prisma as never;

    it('atomically moves funds from available to locked collateral and grants credit', async () => {
      prisma.ledgerBalance.updateMany.mockResolvedValue({ count: 1 });
      const updated = buildBalance({
        availableBalance: new Prisma.Decimal('0'),
        lockedCollateral: new Prisma.Decimal('2000'),
        grantedCredit: new Prisma.Decimal('1500'),
      });
      prisma.ledgerBalance.findUnique.mockResolvedValue(updated);

      const result = await service.lockCollateral(
        tx(),
        'user-1',
        new Prisma.Decimal('2000'),
        new Prisma.Decimal('1500'),
      );

      expect(prisma.ledgerBalance.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          availableBalance: { gte: new Prisma.Decimal('2000') },
        },
        data: {
          availableBalance: { decrement: new Prisma.Decimal('2000') },
          lockedCollateral: { increment: new Prisma.Decimal('2000') },
          grantedCredit: { increment: new Prisma.Decimal('1500') },
        },
      });
      expect(result).toEqual(updated);
    });

    it('throws InsufficientFundsException when the guarded update matches no row but the ledger exists', async () => {
      prisma.ledgerBalance.updateMany.mockResolvedValue({ count: 0 });
      prisma.ledgerBalance.findUnique.mockResolvedValue(buildBalance());

      await expect(
        service.lockCollateral(
          tx(),
          'user-1',
          new Prisma.Decimal('2000'),
          new Prisma.Decimal('1500'),
        ),
      ).rejects.toBeInstanceOf(InsufficientFundsException);
    });

    it('throws LedgerNotFoundException when the user has no ledger at all', async () => {
      prisma.ledgerBalance.updateMany.mockResolvedValue({ count: 0 });
      prisma.ledgerBalance.findUnique.mockResolvedValue(null);

      await expect(
        service.lockCollateral(
          tx(),
          'unknown-user',
          new Prisma.Decimal('2000'),
          new Prisma.Decimal('1500'),
        ),
      ).rejects.toBeInstanceOf(LedgerNotFoundException);
    });
  });

  describe('applyRepayment', () => {
    const tx = () => prisma as never;

    it('performs a partial repayment and keeps the collateral locked', async () => {
      const updated = buildBalance({
        lockedCollateral: new Prisma.Decimal('500'),
        grantedCredit: new Prisma.Decimal('375'),
        usedCredit: new Prisma.Decimal('60'),
      });
      prisma.$queryRaw.mockResolvedValue([updated]);

      const result = await service.applyRepayment(
        tx(),
        'user-1',
        new Prisma.Decimal('40'),
      );

      expect(result).toEqual({ balance: updated, collateralUnlocked: false });
    });

    it('fully repays, unlocks the collateral and reports it', async () => {
      const updated = buildBalance({
        availableBalance: new Prisma.Decimal('500'),
        lockedCollateral: new Prisma.Decimal('0'),
        grantedCredit: new Prisma.Decimal('0'),
        usedCredit: new Prisma.Decimal('0'),
      });
      prisma.$queryRaw.mockResolvedValue([updated]);

      const result = await service.applyRepayment(
        tx(),
        'user-1',
        new Prisma.Decimal('60'),
      );

      expect(result).toEqual({ balance: updated, collateralUnlocked: true });
    });

    it('throws NoOutstandingCreditException when there is nothing to repay', async () => {
      prisma.$queryRaw.mockResolvedValue([]);
      prisma.ledgerBalance.findUnique.mockResolvedValue(
        buildBalance({ usedCredit: new Prisma.Decimal('0') }),
      );

      await expect(
        service.applyRepayment(tx(), 'user-1', new Prisma.Decimal('10')),
      ).rejects.toBeInstanceOf(NoOutstandingCreditException);
    });

    it('throws OverRepaymentException when the amount exceeds the used credit', async () => {
      prisma.$queryRaw.mockResolvedValue([]);
      prisma.ledgerBalance.findUnique.mockResolvedValue(
        buildBalance({ usedCredit: new Prisma.Decimal('50') }),
      );

      await expect(
        service.applyRepayment(tx(), 'user-1', new Prisma.Decimal('999')),
      ).rejects.toBeInstanceOf(OverRepaymentException);
    });

    it('throws LedgerNotFoundException when the user has no ledger at all', async () => {
      prisma.$queryRaw.mockResolvedValue([]);
      prisma.ledgerBalance.findUnique.mockResolvedValue(null);

      await expect(
        service.applyRepayment(tx(), 'unknown-user', new Prisma.Decimal('10')),
      ).rejects.toBeInstanceOf(LedgerNotFoundException);
    });
  });

  describe('getBalanceSummary', () => {
    it('aggregates the raw balance with the computed purchasing/withdrawable indicators', async () => {
      const balance = buildBalance({
        availableBalance: new Prisma.Decimal('0'),
        lockedCollateral: new Prisma.Decimal('2000'),
        grantedCredit: new Prisma.Decimal('3000'),
        usedCredit: new Prisma.Decimal('0'),
      });
      prisma.ledgerBalance.findUnique.mockResolvedValue(balance);

      const summary = await service.getBalanceSummary('user-1');

      expect(summary.balance).toEqual(balance);
      expect(summary.totalPurchasingPower.toString()).toBe('5000');
      expect(summary.withdrawableBalance.toString()).toBe('0');
    });
  });

  describe('creditAvailableBalance', () => {
    const tx = () => prisma as never;

    it('atomically increments the available balance', async () => {
      prisma.ledgerBalance.updateMany.mockResolvedValue({ count: 1 });
      const updated = buildBalance({
        availableBalance: new Prisma.Decimal('500'),
      });
      prisma.ledgerBalance.findUnique.mockResolvedValue(updated);

      const result = await service.creditAvailableBalance(
        tx(),
        'user-1',
        new Prisma.Decimal('500'),
      );

      expect(prisma.ledgerBalance.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { availableBalance: { increment: new Prisma.Decimal('500') } },
      });
      expect(result).toEqual(updated);
    });

    it('throws LedgerNotFoundException when the user has no ledger at all', async () => {
      prisma.ledgerBalance.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.creditAvailableBalance(
          tx(),
          'unknown-user',
          new Prisma.Decimal('500'),
        ),
      ).rejects.toBeInstanceOf(LedgerNotFoundException);
    });
  });

  describe('debitAvailableBalance', () => {
    const tx = () => prisma as never;

    it('atomically decrements the available balance when sufficient funds exist', async () => {
      prisma.ledgerBalance.updateMany.mockResolvedValue({ count: 1 });
      const updated = buildBalance({
        availableBalance: new Prisma.Decimal('500'),
      });
      prisma.ledgerBalance.findUnique.mockResolvedValue(updated);

      const result = await service.debitAvailableBalance(
        tx(),
        'user-1',
        new Prisma.Decimal('500'),
      );

      expect(prisma.ledgerBalance.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          availableBalance: { gte: new Prisma.Decimal('500') },
        },
        data: { availableBalance: { decrement: new Prisma.Decimal('500') } },
      });
      expect(result).toEqual(updated);
    });

    it('throws InsufficientFundsException when the guarded update matches no row but the ledger exists', async () => {
      prisma.ledgerBalance.updateMany.mockResolvedValue({ count: 0 });
      prisma.ledgerBalance.findUnique.mockResolvedValue(buildBalance());

      await expect(
        service.debitAvailableBalance(
          tx(),
          'user-1',
          new Prisma.Decimal('9999'),
        ),
      ).rejects.toBeInstanceOf(InsufficientFundsException);
    });

    it('throws LedgerNotFoundException when the user has no ledger at all', async () => {
      prisma.ledgerBalance.updateMany.mockResolvedValue({ count: 0 });
      prisma.ledgerBalance.findUnique.mockResolvedValue(null);

      await expect(
        service.debitAvailableBalance(
          tx(),
          'unknown-user',
          new Prisma.Decimal('500'),
        ),
      ).rejects.toBeInstanceOf(LedgerNotFoundException);
    });
  });

  // Wallet investissement (cf. §2H CLAUDE.md entrée #31) — solde SÉPARÉ
  // d'availableBalance, alimenté uniquement par virement interne (jamais un dépôt
  // on-chain/bancaire direct).
  describe('creditInvestmentBalance / debitInvestmentBalance', () => {
    const tx = () => prisma as never;

    it('atomically increments investmentBalance, never availableBalance', async () => {
      prisma.ledgerBalance.updateMany.mockResolvedValue({ count: 1 });
      const updated = buildBalance({
        investmentBalance: new Prisma.Decimal('100'),
      });
      prisma.ledgerBalance.findUnique.mockResolvedValue(updated);

      const result = await service.creditInvestmentBalance(
        tx(),
        'user-1',
        new Prisma.Decimal('100'),
      );

      expect(prisma.ledgerBalance.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { investmentBalance: { increment: new Prisma.Decimal('100') } },
      });
      expect(result).toEqual(updated);
    });

    it('debitInvestmentBalance throws InsufficientFundsException rather than allow investmentBalance to go negative', async () => {
      prisma.ledgerBalance.updateMany.mockResolvedValue({ count: 0 });
      prisma.ledgerBalance.findUnique.mockResolvedValue(buildBalance());

      await expect(
        service.debitInvestmentBalance(
          tx(),
          'user-1',
          new Prisma.Decimal('9999'),
        ),
      ).rejects.toBeInstanceOf(InsufficientFundsException);
    });
  });

  describe('transferToInvestmentWallet / transferFromInvestmentWallet', () => {
    const tx = () => prisma as never;

    it('transferToInvestmentWallet debits availableBalance and credits investmentBalance by the same amount', async () => {
      prisma.ledgerBalance.updateMany.mockResolvedValue({ count: 1 });
      prisma.ledgerBalance.findUnique.mockResolvedValue(
        buildBalance({ investmentBalance: new Prisma.Decimal('50') }),
      );

      await service.transferToInvestmentWallet(
        tx(),
        'user-1',
        new Prisma.Decimal('50'),
      );

      expect(prisma.ledgerBalance.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          availableBalance: { gte: new Prisma.Decimal('50') },
        },
        data: { availableBalance: { decrement: new Prisma.Decimal('50') } },
      });
      expect(prisma.ledgerBalance.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { investmentBalance: { increment: new Prisma.Decimal('50') } },
      });
    });

    it('transferToInvestmentWallet fails without crediting investmentBalance when availableBalance is insufficient', async () => {
      prisma.ledgerBalance.updateMany.mockResolvedValueOnce({ count: 0 });
      prisma.ledgerBalance.findUnique.mockResolvedValue(buildBalance());

      await expect(
        service.transferToInvestmentWallet(
          tx(),
          'user-1',
          new Prisma.Decimal('9999'),
        ),
      ).rejects.toBeInstanceOf(InsufficientFundsException);
      // Un seul updateMany appelé (le débit, qui a échoué) — jamais le crédit ensuite.
      expect(prisma.ledgerBalance.updateMany).toHaveBeenCalledTimes(1);
    });

    it('transferFromInvestmentWallet debits investmentBalance and credits availableBalance by the same amount', async () => {
      prisma.ledgerBalance.updateMany.mockResolvedValue({ count: 1 });
      prisma.ledgerBalance.findUnique.mockResolvedValue(buildBalance());

      await service.transferFromInvestmentWallet(
        tx(),
        'user-1',
        new Prisma.Decimal('20'),
      );

      expect(prisma.ledgerBalance.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          investmentBalance: { gte: new Prisma.Decimal('20') },
        },
        data: { investmentBalance: { decrement: new Prisma.Decimal('20') } },
      });
      expect(prisma.ledgerBalance.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { availableBalance: { increment: new Prisma.Decimal('20') } },
      });
    });
  });
});
