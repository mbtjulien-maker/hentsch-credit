import {
  LedgerBalance,
  ManagedDepositAddress,
  Prisma,
  Transaction,
} from '@prisma/client';
import { ClientWalletsService } from '../client-wallets/client-wallets.service';
import {
  DepositIntentAlreadyProcessedException,
  DepositIntentNotFoundException,
  ManagedDepositAddressNotFoundException,
} from '../common/exceptions/deposit-intent.exceptions';
import { CreditRequestsService } from '../credit-requests/credit-requests.service';
import { LedgerService } from '../ledger/ledger.service';
import { MarketDataService } from '../market-data/market-data.service';
import { DepositIntentsService } from './deposit-intents.service';
import { DeclareDepositDto } from './dto/declare-deposit.dto';

function buildManagedAddress(
  overrides: Partial<ManagedDepositAddress> = {},
): ManagedDepositAddress {
  return {
    id: 'managed-1',
    chain: 'ETHEREUM',
    currency: 'USDT',
    address: '0x3b688A6285f44C95489A5464495eCe963E112C36',
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
    lockedCollateral: new Prisma.Decimal(0),
    grantedCredit: new Prisma.Decimal(0),
    usedCredit: new Prisma.Decimal(0),
    investmentBalance: new Prisma.Decimal(0),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    userId: 'user-1',
    type: 'DEPOSIT',
    amount: new Prisma.Decimal(500),
    status: 'PENDING',
    currency: 'USDT',
    tokenAmount: new Prisma.Decimal(500),
    chain: 'ETHEREUM',
    destinationAddress: '0x3b688A6285f44C95489A5464495eCe963E112C36',
    withdrawalMethod: null,
    withdrawalCurrency: null,
    bankAccountHolder: null,
    bankBic: null,
    referenceTx: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('DepositIntentsService', () => {
  let prisma: {
    managedDepositAddress: { findUnique: jest.Mock };
    transaction: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let ledgerService: { creditAvailableBalance: jest.Mock };
  let marketDataService: { getUsdValue: jest.Mock };
  let creditRequestsService: { tryAutoFulfill: jest.Mock };
  let clientWalletsService: { getOrCreate: jest.Mock };
  let tx: { transaction: { update: jest.Mock } };
  let service: DepositIntentsService;

  beforeEach(() => {
    tx = { transaction: { update: jest.fn() } };
    prisma = {
      managedDepositAddress: { findUnique: jest.fn() },
      transaction: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
        callback(tx),
      ),
    };
    ledgerService = { creditAvailableBalance: jest.fn() };
    marketDataService = {
      getUsdValue: jest.fn((_currency, amount) => Promise.resolve(amount)),
    };
    creditRequestsService = { tryAutoFulfill: jest.fn() };
    clientWalletsService = { getOrCreate: jest.fn() };
    service = new DepositIntentsService(
      prisma as never,
      ledgerService as unknown as LedgerService,
      marketDataService as unknown as MarketDataService,
      creditRequestsService as unknown as CreditRequestsService,
      clientWalletsService as unknown as ClientWalletsService,
    );
  });

  describe('getManagedAddress', () => {
    it('throws ManagedDepositAddressNotFoundException when no pooled address is configured', async () => {
      prisma.managedDepositAddress.findUnique.mockResolvedValue(null);

      await expect(
        service.getManagedAddress('ETHEREUM', 'USDT'),
      ).rejects.toBeInstanceOf(ManagedDepositAddressNotFoundException);
    });

    it('returns the configured pooled address for the (chain, currency) pair', async () => {
      const managed = buildManagedAddress();
      prisma.managedDepositAddress.findUnique.mockResolvedValue(managed);

      const result = await service.getManagedAddress('ETHEREUM', 'USDT');

      expect(prisma.managedDepositAddress.findUnique).toHaveBeenCalledWith({
        where: { chain_currency: { chain: 'ETHEREUM', currency: 'USDT' } },
      });
      expect(result).toBe(managed);
    });
  });

  describe('declare', () => {
    const dto: DeclareDepositDto = {
      chain: 'ETHEREUM',
      currency: 'USDT',
      tokenAmount: '500',
    };

    it('creates a PENDING deposit transaction targeting the pooled address, without touching the ledger', async () => {
      prisma.managedDepositAddress.findUnique.mockResolvedValue(
        buildManagedAddress(),
      );
      const created = buildTransaction();
      prisma.transaction.create.mockResolvedValue(created);

      const result = await service.declare('user-1', dto);

      expect(marketDataService.getUsdValue).toHaveBeenCalledWith(
        'USDT',
        new Prisma.Decimal('500'),
      );
      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: 'DEPOSIT',
          amount: new Prisma.Decimal('500'),
          status: 'PENDING',
          currency: 'USDT',
          tokenAmount: new Prisma.Decimal('500'),
          chain: 'ETHEREUM',
          destinationAddress: '0x3b688A6285f44C95489A5464495eCe963E112C36',
        },
      });
      expect(ledgerService.creditAvailableBalance).not.toHaveBeenCalled();
      expect(clientWalletsService.getOrCreate).toHaveBeenCalledWith('user-1');
      expect(result).toBe(created);
    });

    it('propagates ManagedDepositAddressNotFoundException without ever pricing the deposit or provisioning a wallet', async () => {
      prisma.managedDepositAddress.findUnique.mockResolvedValue(null);

      await expect(
        service.declare('user-1', { ...dto, currency: 'DAI' }),
      ).rejects.toBeInstanceOf(ManagedDepositAddressNotFoundException);
      expect(marketDataService.getUsdValue).not.toHaveBeenCalled();
      expect(prisma.transaction.create).not.toHaveBeenCalled();
      expect(clientWalletsService.getOrCreate).not.toHaveBeenCalled();
    });
  });

  describe('listPending', () => {
    it("includes each declaring client's identity and internal wallet reference", async () => {
      prisma.transaction.findMany.mockResolvedValue([]);

      await service.listPending();

      expect(prisma.transaction.findMany).toHaveBeenCalledWith({
        where: { type: 'DEPOSIT', status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              managedWallet: { select: { reference: true } },
            },
          },
        },
      });
    });
  });

  describe('confirm', () => {
    it('throws DepositIntentNotFoundException for an unknown or non-DEPOSIT transaction', async () => {
      prisma.transaction.findUnique.mockResolvedValue(null);

      await expect(service.confirm('tx-1')).rejects.toBeInstanceOf(
        DepositIntentNotFoundException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('throws DepositIntentAlreadyProcessedException when the transaction is no longer PENDING', async () => {
      prisma.transaction.findUnique.mockResolvedValue(
        buildTransaction({ status: 'COMPLETED' }),
      );

      await expect(service.confirm('tx-1')).rejects.toBeInstanceOf(
        DepositIntentAlreadyProcessedException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('credits the declared USD amount, marks the transaction COMPLETED and auto-fulfills any approved request', async () => {
      const pending = buildTransaction();
      const balance = buildBalance({
        availableBalance: new Prisma.Decimal(500),
      });
      const completed = buildTransaction({
        status: 'COMPLETED',
        referenceTx: '0xreal',
      });
      prisma.transaction.findUnique.mockResolvedValue(pending);
      ledgerService.creditAvailableBalance.mockResolvedValue(balance);
      tx.transaction.update.mockResolvedValue(completed);

      const result = await service.confirm('tx-1', '0xreal');

      expect(ledgerService.creditAvailableBalance).toHaveBeenCalledWith(
        tx,
        'user-1',
        new Prisma.Decimal(pending.amount),
      );
      expect(tx.transaction.update).toHaveBeenCalledWith({
        where: { id: 'tx-1' },
        data: { status: 'COMPLETED', referenceTx: '0xreal' },
      });
      expect(creditRequestsService.tryAutoFulfill).toHaveBeenCalledWith(
        'user-1',
      );
      expect(result).toEqual({ balance, transaction: completed });
    });

    it('omits referenceTx from the update when none is provided', async () => {
      prisma.transaction.findUnique.mockResolvedValue(buildTransaction());
      ledgerService.creditAvailableBalance.mockResolvedValue(buildBalance());
      tx.transaction.update.mockResolvedValue(
        buildTransaction({ status: 'COMPLETED' }),
      );

      await service.confirm('tx-1');

      expect(tx.transaction.update).toHaveBeenCalledWith({
        where: { id: 'tx-1' },
        data: { status: 'COMPLETED' },
      });
    });
  });

  describe('reject', () => {
    it('marks a PENDING deposit intent as FAILED without touching the ledger', async () => {
      prisma.transaction.findUnique.mockResolvedValue(buildTransaction());
      const rejected = buildTransaction({ status: 'FAILED' });
      prisma.transaction.update.mockResolvedValue(rejected);

      const result = await service.reject('tx-1');

      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: 'tx-1' },
        data: { status: 'FAILED' },
      });
      expect(ledgerService.creditAvailableBalance).not.toHaveBeenCalled();
      expect(result).toEqual(rejected);
    });

    it('throws DepositIntentAlreadyProcessedException for an already-completed transaction', async () => {
      prisma.transaction.findUnique.mockResolvedValue(
        buildTransaction({ status: 'FAILED' }),
      );

      await expect(service.reject('tx-1')).rejects.toBeInstanceOf(
        DepositIntentAlreadyProcessedException,
      );
    });
  });
});
