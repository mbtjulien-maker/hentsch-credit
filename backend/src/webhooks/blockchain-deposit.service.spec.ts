import { LedgerBalance, Prisma, Transaction, Wallet } from '@prisma/client';
import { WalletNotFoundException } from '../common/exceptions/wallet.exceptions';
import { CreditRequestsService } from '../credit-requests/credit-requests.service';
import { LedgerService } from '../ledger/ledger.service';
import { MarketDataService } from '../market-data/market-data.service';
import { BlockchainDepositService } from './blockchain-deposit.service';
import { BlockchainDepositDto } from './dto/blockchain-deposit.dto';

function buildWallet(overrides: Partial<Wallet> = {}): Wallet {
  return {
    id: 'wallet-1',
    userId: 'user-1',
    chain: 'ETHEREUM',
    address: '0xabc',
    currency: 'USDS',
    createdAt: new Date(),
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
    status: 'COMPLETED',
    currency: 'USDS',
    tokenAmount: new Prisma.Decimal(500),
    chain: null,
    destinationAddress: null,
    withdrawalMethod: null,
    withdrawalCurrency: null,
    bankAccountHolder: null,
    bankBic: null,
    referenceTx: '0xhash',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildDto(
  overrides: Partial<BlockchainDepositDto> = {},
): BlockchainDepositDto {
  return {
    chain: 'ETHEREUM',
    address: '0xabc',
    currency: 'USDS',
    amount: '500.000000',
    txHash: '0xhash',
    ...overrides,
  };
}

describe('BlockchainDepositService', () => {
  let prisma: {
    wallet: { findUnique: jest.Mock };
    transaction: { findUniqueOrThrow: jest.Mock };
    $transaction: jest.Mock;
  };
  let ledgerService: {
    creditAvailableBalance: jest.Mock;
    getBalance: jest.Mock;
  };
  let marketDataService: { getUsdValue: jest.Mock };
  let creditRequestsService: { tryAutoFulfill: jest.Mock };
  let tx: { transaction: { create: jest.Mock } };
  let service: BlockchainDepositService;

  beforeEach(() => {
    tx = { transaction: { create: jest.fn() } };
    prisma = {
      wallet: { findUnique: jest.fn() },
      transaction: { findUniqueOrThrow: jest.fn() },
      $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
        callback(tx),
      ),
    };
    ledgerService = {
      creditAvailableBalance: jest.fn(),
      getBalance: jest.fn(),
    };
    // Par défaut, identité (comme le ferait le vrai service pour un stablecoin 1:1).
    marketDataService = {
      getUsdValue: jest.fn((_currency, amount) => Promise.resolve(amount)),
    };
    creditRequestsService = { tryAutoFulfill: jest.fn() };
    service = new BlockchainDepositService(
      prisma as never,
      ledgerService as unknown as LedgerService,
      marketDataService as unknown as MarketDataService,
      creditRequestsService as unknown as CreditRequestsService,
    );
  });

  it('throws WalletNotFoundException for an unrecognized deposit address', async () => {
    prisma.wallet.findUnique.mockResolvedValue(null);

    await expect(service.processDeposit(buildDto())).rejects.toBeInstanceOf(
      WalletNotFoundException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(marketDataService.getUsdValue).not.toHaveBeenCalled();
  });

  it('looks up the wallet by the composite (chain, address, currency) key', async () => {
    prisma.wallet.findUnique.mockResolvedValue(buildWallet());
    ledgerService.creditAvailableBalance.mockResolvedValue(buildBalance());
    tx.transaction.create.mockResolvedValue(buildTransaction());

    await service.processDeposit(buildDto());

    expect(prisma.wallet.findUnique).toHaveBeenCalledWith({
      where: {
        chainAddressCurrency: {
          chain: 'ETHEREUM',
          address: '0xabc',
          currency: 'USDS',
        },
      },
    });
  });

  it('credits the USD-converted amount and journals a COMPLETED DEPOSIT transaction with the raw token quantity', async () => {
    const wallet = buildWallet();
    const balance = buildBalance({ availableBalance: new Prisma.Decimal(500) });
    const transaction = buildTransaction();
    prisma.wallet.findUnique.mockResolvedValue(wallet);
    ledgerService.creditAvailableBalance.mockResolvedValue(balance);
    tx.transaction.create.mockResolvedValue(transaction);

    const result = await service.processDeposit(buildDto());

    expect(marketDataService.getUsdValue).toHaveBeenCalledWith(
      'USDS',
      new Prisma.Decimal('500.000000'),
    );
    expect(ledgerService.creditAvailableBalance).toHaveBeenCalledWith(
      tx,
      wallet.userId,
      new Prisma.Decimal('500.000000'),
    );
    expect(tx.transaction.create).toHaveBeenCalledWith({
      data: {
        userId: wallet.userId,
        type: 'DEPOSIT',
        amount: new Prisma.Decimal('500.000000'),
        currency: 'USDS',
        tokenAmount: new Prisma.Decimal('500.000000'),
        status: 'COMPLETED',
        referenceTx: '0xhash',
      },
    });
    expect(result).toEqual({ balance, transaction, duplicate: false });
    expect(creditRequestsService.tryAutoFulfill).toHaveBeenCalledWith(
      wallet.userId,
    );
  });

  it('converts a gold-backed deposit (PAXG) to its live USD value before crediting the ledger', async () => {
    const wallet = buildWallet({ currency: 'PAXG' });
    marketDataService.getUsdValue.mockResolvedValue(new Prisma.Decimal('1200'));
    ledgerService.creditAvailableBalance.mockResolvedValue(buildBalance());
    tx.transaction.create.mockResolvedValue(buildTransaction());

    prisma.wallet.findUnique.mockResolvedValue(wallet);

    await service.processDeposit(buildDto({ currency: 'PAXG', amount: '0.5' }));

    expect(marketDataService.getUsdValue).toHaveBeenCalledWith(
      'PAXG',
      new Prisma.Decimal('0.5'),
    );
    expect(ledgerService.creditAvailableBalance).toHaveBeenCalledWith(
      tx,
      wallet.userId,
      new Prisma.Decimal('1200'),
    );
    expect(tx.transaction.create).toHaveBeenCalledWith({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- jest.fn() has no generic signature to narrow against
      data: expect.objectContaining({
        amount: new Prisma.Decimal('1200'),
        currency: 'PAXG',
        tokenAmount: new Prisma.Decimal('0.5'),
      }),
    });
  });

  it('propagates a market-data failure without crediting anything (no fallback valuation)', async () => {
    prisma.wallet.findUnique.mockResolvedValue(
      buildWallet({ currency: 'PAXG' }),
    );
    const priceError = new Error('price unavailable');
    marketDataService.getUsdValue.mockRejectedValue(priceError);

    await expect(
      service.processDeposit(buildDto({ currency: 'PAXG', amount: '0.5' })),
    ).rejects.toBe(priceError);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('treats a duplicate webhook delivery (same txHash) as idempotent, without re-crediting', async () => {
    const wallet = buildWallet();
    const existingTransaction = buildTransaction();
    const balance = buildBalance({ availableBalance: new Prisma.Decimal(500) });
    prisma.wallet.findUnique.mockResolvedValue(wallet);

    const duplicateError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: '6.19.3',
      },
    );
    ledgerService.creditAvailableBalance.mockRejectedValue(duplicateError);
    prisma.transaction.findUniqueOrThrow.mockResolvedValue(existingTransaction);
    ledgerService.getBalance.mockResolvedValue(balance);

    const result = await service.processDeposit(buildDto());

    expect(prisma.transaction.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { referenceTx: '0xhash' },
    });
    expect(result).toEqual({
      balance,
      transaction: existingTransaction,
      duplicate: true,
    });
    expect(creditRequestsService.tryAutoFulfill).not.toHaveBeenCalled();
  });

  it('propagates unexpected errors instead of treating them as idempotent replays', async () => {
    prisma.wallet.findUnique.mockResolvedValue(buildWallet());
    const unexpected = new Error('database is down');
    ledgerService.creditAvailableBalance.mockRejectedValue(unexpected);

    await expect(service.processDeposit(buildDto())).rejects.toBe(unexpected);
  });
});
