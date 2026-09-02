import { BadRequestException } from '@nestjs/common';
import { LedgerBalance, Prisma, Transaction } from '@prisma/client';
import { InvalidAmountException } from '../common/exceptions/financial.exceptions';
import { LedgerService } from '../ledger/ledger.service';
import { WithdrawalService } from './withdrawal.service';

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

// IBAN officiel valide (exemple Wikipédia) — utilisé partout où un IBAN plausible est
// nécessaire mais non le sujet du test.
const VALID_FR_IBAN = 'FR7630006000011234567890189';
const VALID_DE_IBAN = 'DE89370400440532013000';
const VALID_BR_IBAN = 'BR9700360305000010009795493P1'; // hors zone SEPA

describe('WithdrawalService', () => {
  let prisma: { $transaction: jest.Mock };
  let ledgerService: { debitAvailableBalance: jest.Mock };
  let tx: { transaction: { create: jest.Mock } };
  let service: WithdrawalService;

  beforeEach(() => {
    tx = { transaction: { create: jest.fn() } };
    prisma = {
      $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
        callback(tx),
      ),
    };
    ledgerService = { debitAvailableBalance: jest.fn() };
    service = new WithdrawalService(
      prisma as never,
      ledgerService as unknown as LedgerService,
    );
  });

  describe('CRYPTO', () => {
    it('rejects a non-positive amount without touching the ledger', async () => {
      await expect(
        service.requestWithdrawal('user-1', {
          method: 'CRYPTO',
          amount: -5,
          chain: 'ETHEREUM',
          currency: 'USDS',
          destinationAddress: '0xdest',
        }),
      ).rejects.toBeInstanceOf(InvalidAmountException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('debits the ledger and journals a COMPLETED withdrawal with its destination', async () => {
      const balance = buildBalance({
        availableBalance: new Prisma.Decimal('500'),
      });
      const transaction = { id: 'tx-1' } as Transaction;
      ledgerService.debitAvailableBalance.mockResolvedValue(balance);
      tx.transaction.create.mockResolvedValue(transaction);

      const result = await service.requestWithdrawal('user-1', {
        method: 'CRYPTO',
        amount: '200',
        chain: 'ETHEREUM',
        currency: 'USDS',
        destinationAddress: '0xdest',
      });

      expect(ledgerService.debitAvailableBalance).toHaveBeenCalledWith(
        tx,
        'user-1',
        new Prisma.Decimal('200'),
      );
      expect(tx.transaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: 'WITHDRAWAL',
          amount: new Prisma.Decimal('200'),
          status: 'COMPLETED',
          withdrawalMethod: 'CRYPTO',
          chain: 'ETHEREUM',
          currency: 'USDS',
          destinationAddress: '0xdest',
        },
      });
      expect(result).toEqual({ balance, transaction });
    });

    it('propagates errors raised by the ledger (e.g. insufficient funds)', async () => {
      const error = new Error('insufficient funds');
      ledgerService.debitAvailableBalance.mockRejectedValue(error);

      await expect(
        service.requestWithdrawal('user-1', {
          method: 'CRYPTO',
          amount: '200',
          chain: 'ETHEREUM',
          currency: 'USDS',
          destinationAddress: '0xdest',
        }),
      ).rejects.toBe(error);
      expect(tx.transaction.create).not.toHaveBeenCalled();
    });
  });

  describe('SEPA', () => {
    it('rejects a SEPA withdrawal not denominated in EUR', async () => {
      await expect(
        service.requestWithdrawal('user-1', {
          method: 'SEPA',
          amount: '200',
          withdrawalCurrency: 'USD',
          bankAccountHolder: 'Jane Doe',
          destinationIban: VALID_FR_IBAN,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects a SEPA withdrawal to an IBAN outside the SEPA zone', async () => {
      await expect(
        service.requestWithdrawal('user-1', {
          method: 'SEPA',
          amount: '200',
          withdrawalCurrency: 'EUR',
          bankAccountHolder: 'Jane Doe',
          destinationIban: VALID_BR_IBAN,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects a SEPA withdrawal with a structurally invalid IBAN (bad checksum)', async () => {
      await expect(
        service.requestWithdrawal('user-1', {
          method: 'SEPA',
          amount: '200',
          withdrawalCurrency: 'EUR',
          bankAccountHolder: 'Jane Doe',
          destinationIban: 'FR7630006000011234567890188', // last digit tampered
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('debits the ledger and journals a COMPLETED SEPA withdrawal (BIC optional)', async () => {
      const balance = buildBalance({ availableBalance: new Prisma.Decimal('500') });
      const transaction = { id: 'tx-2' } as Transaction;
      ledgerService.debitAvailableBalance.mockResolvedValue(balance);
      tx.transaction.create.mockResolvedValue(transaction);

      const result = await service.requestWithdrawal('user-1', {
        method: 'SEPA',
        amount: '200',
        withdrawalCurrency: 'EUR',
        bankAccountHolder: 'Jane Doe',
        destinationIban: 'fr76 3000 6000 0112 3456 7890 189', // lower-case + spaces
      });

      expect(tx.transaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: 'WITHDRAWAL',
          amount: new Prisma.Decimal('200'),
          status: 'COMPLETED',
          withdrawalMethod: 'SEPA',
          withdrawalCurrency: 'EUR',
          bankAccountHolder: 'Jane Doe',
          destinationAddress: VALID_FR_IBAN, // normalized (no spaces, uppercase)
          bankBic: undefined,
        },
      });
      expect(result).toEqual({ balance, transaction });
    });

    it('normalizes a provided BIC to uppercase without spaces', async () => {
      ledgerService.debitAvailableBalance.mockResolvedValue(buildBalance());
      tx.transaction.create.mockResolvedValue({ id: 'tx-3' } as Transaction);

      await service.requestWithdrawal('user-1', {
        method: 'SEPA',
        amount: '50',
        withdrawalCurrency: 'EUR',
        bankAccountHolder: 'Jane Doe',
        destinationIban: VALID_FR_IBAN,
        bankBic: 'bnpafrpp',
      });

      expect(tx.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ bankBic: 'BNPAFRPP' }),
        }),
      );
    });
  });

  describe('SWIFT', () => {
    it('rejects a SWIFT withdrawal without a BIC', async () => {
      await expect(
        service.requestWithdrawal('user-1', {
          method: 'SWIFT',
          amount: '200',
          withdrawalCurrency: 'USD',
          bankAccountHolder: 'Jane Doe',
          destinationIban: VALID_BR_IBAN,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('accepts a SWIFT withdrawal to a non-SEPA IBAN, in any currency, with a BIC', async () => {
      const balance = buildBalance({ availableBalance: new Prisma.Decimal('500') });
      const transaction = { id: 'tx-4' } as Transaction;
      ledgerService.debitAvailableBalance.mockResolvedValue(balance);
      tx.transaction.create.mockResolvedValue(transaction);

      const result = await service.requestWithdrawal('user-1', {
        method: 'SWIFT',
        amount: '300',
        withdrawalCurrency: 'USD',
        bankAccountHolder: 'John Smith',
        destinationIban: VALID_BR_IBAN,
        bankBic: 'BRASBRRJ',
      });

      expect(tx.transaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: 'WITHDRAWAL',
          amount: new Prisma.Decimal('300'),
          status: 'COMPLETED',
          withdrawalMethod: 'SWIFT',
          withdrawalCurrency: 'USD',
          bankAccountHolder: 'John Smith',
          destinationAddress: VALID_BR_IBAN,
          bankBic: 'BRASBRRJ',
        },
      });
      expect(result).toEqual({ balance, transaction });
    });

    it('allows a SWIFT withdrawal to a SEPA-zone IBAN too (SWIFT is a superset, unlike SEPA)', async () => {
      ledgerService.debitAvailableBalance.mockResolvedValue(buildBalance());
      tx.transaction.create.mockResolvedValue({ id: 'tx-5' } as Transaction);

      await expect(
        service.requestWithdrawal('user-1', {
          method: 'SWIFT',
          amount: '100',
          withdrawalCurrency: 'EUR',
          bankAccountHolder: 'Jane Doe',
          destinationIban: VALID_DE_IBAN,
          bankBic: 'DEUTDEFF',
        }),
      ).resolves.toBeDefined();
    });
  });
});
