import { LedgerBalance, Prisma, Transaction } from '@prisma/client';
import { PaymentNotFoundException } from '../common/exceptions/payment.exceptions';
import { InvalidAmountException } from '../common/exceptions/financial.exceptions';
import { CreditRequestsService } from '../credit-requests/credit-requests.service';
import { LedgerService } from '../ledger/ledger.service';
import { MollieService } from './mollie.service';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: () => Promise.resolve(body) } as Response;
}

function buildTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'txn-1',
    userId: 'user-1',
    type: 'CARD_TOPUP',
    amount: new Prisma.Decimal('100'),
    status: 'PENDING',
    currency: null,
    tokenAmount: null,
    chain: null,
    destinationAddress: null,
    referenceTx: 'sandbox_tr_abc',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildBalance(overrides: Partial<LedgerBalance> = {}): LedgerBalance {
  return {
    id: 'balance-1',
    userId: 'user-1',
    availableBalance: new Prisma.Decimal(100),
    lockedCollateral: new Prisma.Decimal(0),
    grantedCredit: new Prisma.Decimal(0),
    usedCredit: new Prisma.Decimal(0),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('MollieService', () => {
  let prisma: {
    $transaction: jest.Mock;
    transaction: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      updateMany: jest.Mock;
      update: jest.Mock;
    };
  };
  let tx: {
    transaction: { updateMany: jest.Mock; findUniqueOrThrow: jest.Mock };
  };
  let ledgerService: {
    getBalance: jest.Mock;
    creditAvailableBalance: jest.Mock;
  };
  let creditRequestsService: { tryAutoFulfill: jest.Mock };
  let configValues: Record<string, string>;
  let configService: { get: jest.Mock };
  let fetchSpy: jest.SpiedFunction<typeof fetch>;
  let service: MollieService;

  beforeEach(() => {
    tx = {
      transaction: { updateMany: jest.fn(), findUniqueOrThrow: jest.fn() },
    };
    prisma = {
      $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
        callback(tx),
      ),
      transaction: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
      },
    };
    ledgerService = {
      getBalance: jest.fn(),
      creditAvailableBalance: jest.fn(),
    };
    creditRequestsService = { tryAutoFulfill: jest.fn() };
    configValues = {};
    configService = { get: jest.fn((key: string) => configValues[key]) };
    fetchSpy = jest.spyOn(global, 'fetch');
    service = new MollieService(
      prisma as never,
      ledgerService as unknown as LedgerService,
      configService as never,
      creditRequestsService as unknown as CreditRequestsService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createCardTopup — mode sandbox (pas de MOLLIE_API_KEY)', () => {
    it('generates a local sandbox payment id, an internal simulated checkout URL, and a PENDING transaction, without calling Mollie', async () => {
      const result = await service.createCardTopup('user-1', '100');

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(result.paymentId).toMatch(/^sandbox_tr_/);
      expect(result.checkoutUrl).toBe(
        `http://localhost:3001/paiement-simule/${result.paymentId}`,
      );
      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: 'CARD_TOPUP',
          amount: new Prisma.Decimal('100'),
          status: 'PENDING',
          referenceTx: result.paymentId,
        },
      });
    });

    it('rejects a non-positive amount before creating anything', async () => {
      await expect(
        service.createCardTopup('user-1', '-5'),
      ).rejects.toBeInstanceOf(InvalidAmountException);
      expect(prisma.transaction.create).not.toHaveBeenCalled();
    });

    it('honours a configured FRONTEND_ORIGIN for the simulated checkout URL', async () => {
      configValues.FRONTEND_ORIGIN = 'https://app.example.com';
      const result = await service.createCardTopup('user-1', '50');
      expect(result.checkoutUrl).toBe(
        `https://app.example.com/paiement-simule/${result.paymentId}`,
      );
    });
  });

  describe('createCardTopup — mode réel (MOLLIE_API_KEY configurée)', () => {
    beforeEach(() => {
      configValues.MOLLIE_API_KEY = 'test_abc123';
      configValues.BACKEND_PUBLIC_URL = 'https://api.example.com';
    });

    it('falls back to localhost:3000 for the webhook URL when BACKEND_PUBLIC_URL is unset', async () => {
      delete configValues.BACKEND_PUBLIC_URL;
      fetchSpy.mockResolvedValue(
        jsonResponse({
          id: 'tr_realpayment',
          _links: { checkout: { href: 'https://mollie.com/checkout/xyz' } },
        }),
      );

      await service.createCardTopup('user-1', '250');

      const [, init] = fetchSpy.mock.calls[0];
      const body = JSON.parse(init?.body as string) as {
        webhookUrl: string;
      };
      expect(body.webhookUrl).toBe(
        'http://localhost:3000/payments/mollie-webhook',
      );
    });

    it('calls the real Mollie API and persists the returned payment id', async () => {
      fetchSpy.mockResolvedValue(
        jsonResponse({
          id: 'tr_realpayment',
          _links: { checkout: { href: 'https://mollie.com/checkout/xyz' } },
        }),
      );

      const result = await service.createCardTopup('user-1', '250');

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.mollie.com/v2/payments',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test_abc123',
          }) as unknown,
        }),
      );
      expect(result).toEqual({
        paymentId: 'tr_realpayment',
        checkoutUrl: 'https://mollie.com/checkout/xyz',
      });
      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: 'CARD_TOPUP',
          amount: new Prisma.Decimal('250'),
          status: 'PENDING',
          referenceTx: 'tr_realpayment',
        },
      });
    });

    it('propagates an error when Mollie is unreachable, without creating a transaction', async () => {
      fetchSpy.mockRejectedValue(new Error('network down'));

      await expect(service.createCardTopup('user-1', '250')).rejects.toThrow(
        'network down',
      );
      expect(prisma.transaction.create).not.toHaveBeenCalled();
    });

    it('throws when Mollie omits a checkout URL', async () => {
      fetchSpy.mockResolvedValue(
        jsonResponse({ id: 'tr_realpayment', _links: {} }),
      );
      await expect(service.createCardTopup('user-1', '250')).rejects.toThrow(
        "Mollie n'a renvoyé aucune URL de paiement",
      );
    });

    it('treats a non-OK HTTP response the same as a network failure', async () => {
      fetchSpy.mockResolvedValue(jsonResponse({}, false, 503));
      await expect(service.createCardTopup('user-1', '250')).rejects.toThrow(
        'Mollie a répondu 503',
      );
    });
  });

  describe('getStatus', () => {
    it('returns the status and amount of a known payment', async () => {
      prisma.transaction.findUnique.mockResolvedValue(
        buildTransaction({
          status: 'COMPLETED',
          amount: new Prisma.Decimal('75'),
        }),
      );
      const result = await service.getStatus('sandbox_tr_abc');
      expect(result.status).toBe('COMPLETED');
      expect(result.amount.toString()).toBe('75');
      expect(result.userId).toBe('user-1');
    });

    it('throws PaymentNotFoundException for an unknown payment id', async () => {
      prisma.transaction.findUnique.mockResolvedValue(null);
      await expect(service.getStatus('unknown')).rejects.toBeInstanceOf(
        PaymentNotFoundException,
      );
    });
  });

  describe('confirmPayment — mode sandbox', () => {
    it('credits the available balance and marks the transaction COMPLETED on first confirmation', async () => {
      prisma.transaction.findUnique.mockResolvedValue(buildTransaction());
      tx.transaction.updateMany.mockResolvedValue({ count: 1 });
      const completed = buildTransaction({ status: 'COMPLETED' });
      tx.transaction.findUniqueOrThrow.mockResolvedValue(completed);
      const credited = buildBalance({
        availableBalance: new Prisma.Decimal('200'),
      });
      ledgerService.creditAvailableBalance.mockResolvedValue(credited);

      const result = await service.confirmPayment('sandbox_tr_abc');

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(ledgerService.creditAvailableBalance).toHaveBeenCalledWith(
        tx,
        'user-1',
        new Prisma.Decimal('100'),
      );
      expect(result).toEqual({
        balance: credited,
        transaction: completed,
        credited: true,
      });
      expect(creditRequestsService.tryAutoFulfill).toHaveBeenCalledWith(
        'user-1',
      );
    });

    it('throws PaymentNotFoundException for an unknown payment id', async () => {
      prisma.transaction.findUnique.mockResolvedValue(null);
      await expect(service.confirmPayment('unknown')).rejects.toBeInstanceOf(
        PaymentNotFoundException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('is idempotent: a redelivered webhook for an already-COMPLETED payment does not credit again', async () => {
      prisma.transaction.findUnique.mockResolvedValue(
        buildTransaction({ status: 'COMPLETED' }),
      );
      const existingBalance = buildBalance();
      ledgerService.getBalance.mockResolvedValue(existingBalance);

      const result = await service.confirmPayment('sandbox_tr_abc');

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(ledgerService.creditAvailableBalance).not.toHaveBeenCalled();
      expect(result.credited).toBe(false);
      expect(result.balance).toBe(existingBalance);
      expect(creditRequestsService.tryAutoFulfill).not.toHaveBeenCalled();
    });

    it('does not credit an already-FAILED payment', async () => {
      prisma.transaction.findUnique.mockResolvedValue(
        buildTransaction({ status: 'FAILED' }),
      );

      const result = await service.confirmPayment('sandbox_tr_abc');

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(result).toEqual({
        balance: null,
        transaction: expect.objectContaining({ status: 'FAILED' }) as unknown,
        credited: false,
      });
    });

    it('guards against a race where the transaction was completed between the read and the credit attempt', async () => {
      prisma.transaction.findUnique.mockResolvedValue(buildTransaction());
      tx.transaction.updateMany.mockResolvedValue({ count: 0 });
      const alreadyCompleted = buildTransaction({ status: 'COMPLETED' });
      tx.transaction.findUniqueOrThrow.mockResolvedValue(alreadyCompleted);
      const existingBalance = buildBalance();
      ledgerService.getBalance.mockResolvedValue(existingBalance);

      const result = await service.confirmPayment('sandbox_tr_abc');

      expect(ledgerService.creditAvailableBalance).not.toHaveBeenCalled();
      expect(result).toEqual({
        balance: existingBalance,
        transaction: alreadyCompleted,
        credited: false,
      });
      expect(creditRequestsService.tryAutoFulfill).not.toHaveBeenCalled();
    });

    it('does not fetch a balance when the race-guard finds the transaction settled to a non-COMPLETED status', async () => {
      prisma.transaction.findUnique.mockResolvedValue(buildTransaction());
      tx.transaction.updateMany.mockResolvedValue({ count: 0 });
      const settledFailed = buildTransaction({ status: 'FAILED' });
      tx.transaction.findUniqueOrThrow.mockResolvedValue(settledFailed);

      const result = await service.confirmPayment('sandbox_tr_abc');

      expect(ledgerService.getBalance).not.toHaveBeenCalled();
      expect(result).toEqual({
        balance: null,
        transaction: settledFailed,
        credited: false,
      });
    });
  });

  describe('confirmPayment — mode réel (MOLLIE_API_KEY configurée)', () => {
    beforeEach(() => {
      configValues.MOLLIE_API_KEY = 'test_abc123';
    });

    it('re-fetches the authoritative status from Mollie and credits only when it is "paid"', async () => {
      prisma.transaction.findUnique.mockResolvedValue(buildTransaction());
      fetchSpy.mockResolvedValue(jsonResponse({ status: 'paid' }));
      tx.transaction.updateMany.mockResolvedValue({ count: 1 });
      const completed = buildTransaction({ status: 'COMPLETED' });
      tx.transaction.findUniqueOrThrow.mockResolvedValue(completed);
      ledgerService.creditAvailableBalance.mockResolvedValue(buildBalance());

      await service.confirmPayment('tr_realpayment');

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.mollie.com/v2/payments/tr_realpayment',
        expect.objectContaining({
          headers: { Authorization: 'Bearer test_abc123' },
        }),
      );
      expect(ledgerService.creditAvailableBalance).toHaveBeenCalled();
    });

    it.each(['failed', 'expired', 'canceled'])(
      'marks the transaction FAILED and never credits when Mollie reports "%s"',
      async (mollieStatus) => {
        prisma.transaction.findUnique.mockResolvedValue(buildTransaction());
        fetchSpy.mockResolvedValue(jsonResponse({ status: mollieStatus }));
        const failed = buildTransaction({ status: 'FAILED' });
        prisma.transaction.update.mockResolvedValue(failed);

        const result = await service.confirmPayment('tr_realpayment');

        expect(prisma.transaction.update).toHaveBeenCalledWith({
          where: { referenceTx: 'tr_realpayment' },
          data: { status: 'FAILED' },
        });
        expect(ledgerService.creditAvailableBalance).not.toHaveBeenCalled();
        expect(result).toEqual({
          balance: null,
          transaction: failed,
          credited: false,
        });
      },
    );

    it.each(['open', 'pending', 'authorized'])(
      'leaves the transaction PENDING and does nothing further when Mollie reports the transitory status "%s"',
      async (mollieStatus) => {
        const pending = buildTransaction();
        prisma.transaction.findUnique.mockResolvedValue(pending);
        fetchSpy.mockResolvedValue(jsonResponse({ status: mollieStatus }));

        const result = await service.confirmPayment('tr_realpayment');

        expect(prisma.transaction.update).not.toHaveBeenCalled();
        expect(prisma.$transaction).not.toHaveBeenCalled();
        expect(result).toEqual({
          balance: null,
          transaction: pending,
          credited: false,
        });
      },
    );

    it('propagates an error when Mollie is unreachable while re-checking the status', async () => {
      prisma.transaction.findUnique.mockResolvedValue(buildTransaction());
      fetchSpy.mockRejectedValue(new Error('network down'));

      await expect(service.confirmPayment('tr_realpayment')).rejects.toThrow(
        'network down',
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('treats a non-OK HTTP response while re-checking the status the same as a network failure', async () => {
      prisma.transaction.findUnique.mockResolvedValue(buildTransaction());
      fetchSpy.mockResolvedValue(jsonResponse({}, false, 503));

      await expect(service.confirmPayment('tr_realpayment')).rejects.toThrow(
        'Mollie a répondu 503',
      );
    });
  });
});
