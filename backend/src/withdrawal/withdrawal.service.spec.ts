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
    updatedAt: new Date(),
    ...overrides,
  };
}

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

  it('rejects a non-positive amount without touching the ledger', async () => {
    await expect(
      service.requestWithdrawal('user-1', -5, 'ETHEREUM', 'USDS', '0xdest'),
    ).rejects.toBeInstanceOf(InvalidAmountException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('debits the ledger and journals a COMPLETED withdrawal with its destination', async () => {
    const balance = buildBalance({
      availableBalance: new Prisma.Decimal('500'),
    });
    const transaction: Transaction = {
      id: 'tx-1',
      userId: 'user-1',
      type: 'WITHDRAWAL',
      amount: new Prisma.Decimal('200'),
      status: 'COMPLETED',
      currency: 'USDS',
      tokenAmount: null,
      chain: 'ETHEREUM',
      destinationAddress: '0xdest',
      referenceTx: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    ledgerService.debitAvailableBalance.mockResolvedValue(balance);
    tx.transaction.create.mockResolvedValue(transaction);

    const result = await service.requestWithdrawal(
      'user-1',
      '200',
      'ETHEREUM',
      'USDS',
      '0xdest',
    );

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
      service.requestWithdrawal('user-1', '200', 'ETHEREUM', 'USDS', '0xdest'),
    ).rejects.toBe(error);
    expect(tx.transaction.create).not.toHaveBeenCalled();
  });
});
