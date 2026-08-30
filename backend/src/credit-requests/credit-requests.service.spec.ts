import {
  CreditPosition,
  CreditRequest,
  LedgerBalance,
  Prisma,
  Wallet,
} from '@prisma/client';
import {
  ActiveCreditRequestExistsException,
  CollateralCurrencyMismatchException,
  CreditRequestNotApprovedException,
  CreditRequestNotFoundException,
  CreditRequestNotPendingException,
} from '../common/exceptions/credit-request.exceptions';
import { InvalidAmountException } from '../common/exceptions/financial.exceptions';
import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.service';
import { CreditEngineService } from '../credit/credit-engine.service';
import { LedgerService } from '../ledger/ledger.service';
import { WalletService } from '../wallet/wallet.service';
import { CreditRequestsService } from './credit-requests.service';

// Correspond au userId par défaut de buildRequest() ci-dessous — le propriétaire de la
// demande dans la plupart des scénarios de test.
const SELF: AuthenticatedUser = { id: 'user-1', role: 'CLIENT' };

function buildRequest(overrides: Partial<CreditRequest> = {}): CreditRequest {
  return {
    id: 'request-1',
    userId: 'user-1',
    collateralAmount: new Prisma.Decimal('2000'),
    currency: 'USD',
    status: 'PENDING',
    createdAt: new Date(),
    validatedAt: null,
    fulfilledAt: null,
    creditPositionId: null,
    collateralCurrency: null,
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

function buildPosition(
  overrides: Partial<CreditPosition> = {},
): CreditPosition {
  return {
    id: 'position-1',
    userId: 'user-1',
    collateralAmount: new Prisma.Decimal('2000'),
    creditIssued: new Prisma.Decimal('3000'),
    status: 'ACTIVE',
    currency: 'USD',
    exchangeRateAtLock: new Prisma.Decimal(1),
    creditIssuedInCurrency: new Prisma.Decimal('3000'),
    interestRatePct: new Prisma.Decimal('13.5'),
    originationFeePct: new Prisma.Decimal('2.0'),
    originationFeeAmount: new Prisma.Decimal('60'),
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

describe('CreditRequestsService', () => {
  let prisma: {
    creditRequest: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      updateMany: jest.Mock;
      update: jest.Mock;
    };
  };
  let ledgerService: { getBalance: jest.Mock };
  let creditEngineService: { lockCollateralAndIssueCredit: jest.Mock };
  let walletService: { createDepositAddress: jest.Mock };
  let service: CreditRequestsService;

  beforeEach(() => {
    prisma = {
      creditRequest: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
      },
    };
    ledgerService = { getBalance: jest.fn() };
    creditEngineService = { lockCollateralAndIssueCredit: jest.fn() };
    walletService = { createDepositAddress: jest.fn() };
    service = new CreditRequestsService(
      prisma as never,
      ledgerService as unknown as LedgerService,
      creditEngineService as unknown as CreditEngineService,
      walletService as unknown as WalletService,
    );
  });

  describe('createRequest', () => {
    it('creates a PENDING request when the user has no active request', async () => {
      prisma.creditRequest.findFirst.mockResolvedValue(null);
      const created = buildRequest();
      prisma.creditRequest.create.mockResolvedValue(created);

      const result = await service.createRequest('user-1', '2000', 'USD');

      expect(prisma.creditRequest.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: { in: ['PENDING', 'APPROVED'] } },
      });
      expect(prisma.creditRequest.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          collateralAmount: new Prisma.Decimal('2000'),
          currency: 'USD',
        },
      });
      expect(result).toBe(created);
    });

    it('defaults to USD when no currency is provided', async () => {
      prisma.creditRequest.findFirst.mockResolvedValue(null);
      prisma.creditRequest.create.mockResolvedValue(buildRequest());

      await service.createRequest('user-1', '2000');

      expect(prisma.creditRequest.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          collateralAmount: new Prisma.Decimal('2000'),
          currency: 'USD',
        },
      });
    });

    it.each([
      ['zero', 0],
      ['negative', -5],
      ['non-finite', Infinity],
    ])('rejects a %s collateral amount', async (_label, value) => {
      await expect(
        service.createRequest('user-1', value),
      ).rejects.toBeInstanceOf(InvalidAmountException);
      expect(prisma.creditRequest.create).not.toHaveBeenCalled();
    });

    it('rejects a second request while one is already PENDING or APPROVED', async () => {
      prisma.creditRequest.findFirst.mockResolvedValue(
        buildRequest({ status: 'APPROVED' }),
      );

      await expect(
        service.createRequest('user-1', '500'),
      ).rejects.toBeInstanceOf(ActiveCreditRequestExistsException);
      expect(prisma.creditRequest.create).not.toHaveBeenCalled();
    });
  });

  describe('listForUser / listPending', () => {
    it('lists a user’s requests newest first', async () => {
      const requests = [buildRequest()];
      prisma.creditRequest.findMany.mockResolvedValue(requests);

      const result = await service.listForUser('user-1');

      expect(prisma.creditRequest.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toBe(requests);
    });

    it('lists PENDING requests oldest first (FIFO review queue)', async () => {
      const requests = [buildRequest()];
      prisma.creditRequest.findMany.mockResolvedValue(requests);

      const result = await service.listPending();

      expect(prisma.creditRequest.findMany).toHaveBeenCalledWith({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toBe(requests);
    });
  });

  describe('approve / reject', () => {
    it('approves a PENDING request and stamps validatedAt', async () => {
      prisma.creditRequest.updateMany.mockResolvedValue({ count: 1 });
      const approved = buildRequest({ status: 'APPROVED' });
      prisma.creditRequest.findUniqueOrThrow.mockResolvedValue(approved);

      const result = await service.approve('request-1');

      expect(prisma.creditRequest.updateMany).toHaveBeenCalledWith({
        where: { id: 'request-1', status: 'PENDING' },
        data: { status: 'APPROVED', validatedAt: expect.any(Date) as Date },
      });
      expect(result).toBe(approved);
    });

    it('rejects a PENDING request', async () => {
      prisma.creditRequest.updateMany.mockResolvedValue({ count: 1 });
      const rejected = buildRequest({ status: 'REJECTED' });
      prisma.creditRequest.findUniqueOrThrow.mockResolvedValue(rejected);

      const result = await service.reject('request-1');

      expect(prisma.creditRequest.updateMany).toHaveBeenCalledWith({
        where: { id: 'request-1', status: 'PENDING' },
        data: { status: 'REJECTED', validatedAt: expect.any(Date) as Date },
      });
      expect(result).toBe(rejected);
    });

    it('throws CreditRequestNotFoundException when approving an unknown id', async () => {
      prisma.creditRequest.updateMany.mockResolvedValue({ count: 0 });
      prisma.creditRequest.findUnique.mockResolvedValue(null);

      await expect(service.approve('unknown')).rejects.toBeInstanceOf(
        CreditRequestNotFoundException,
      );
    });

    it('throws CreditRequestNotPendingException when approving an already-settled request', async () => {
      prisma.creditRequest.updateMany.mockResolvedValue({ count: 0 });
      prisma.creditRequest.findUnique.mockResolvedValue(
        buildRequest({ status: 'APPROVED' }),
      );

      await expect(service.approve('request-1')).rejects.toBeInstanceOf(
        CreditRequestNotPendingException,
      );
    });

    it('throws CreditRequestNotPendingException when rejecting an already-settled request', async () => {
      prisma.creditRequest.updateMany.mockResolvedValue({ count: 0 });
      prisma.creditRequest.findUnique.mockResolvedValue(
        buildRequest({ status: 'REJECTED' }),
      );

      await expect(service.reject('request-1')).rejects.toBeInstanceOf(
        CreditRequestNotPendingException,
      );
    });
  });

  describe('generateDepositAddress', () => {
    it('generates a deposit address only once the request is APPROVED', async () => {
      prisma.creditRequest.findUnique.mockResolvedValue(
        buildRequest({ status: 'APPROVED' }),
      );
      const wallet = buildWallet();
      walletService.createDepositAddress.mockResolvedValue(wallet);

      const result = await service.generateDepositAddress(
        'request-1',
        'ETHEREUM',
        'USDS',
        SELF,
      );

      expect(walletService.createDepositAddress).toHaveBeenCalledWith(
        'user-1',
        'ETHEREUM',
        'USDS',
      );
      expect(result).toBe(wallet);
    });

    it('throws CreditRequestNotFoundException for an unknown request', async () => {
      prisma.creditRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.generateDepositAddress('unknown', 'ETHEREUM', 'USDS', SELF),
      ).rejects.toBeInstanceOf(CreditRequestNotFoundException);
      expect(walletService.createDepositAddress).not.toHaveBeenCalled();
    });

    it("throws ForbiddenException when a different client tries to act on someone else's request", async () => {
      prisma.creditRequest.findUnique.mockResolvedValue(
        buildRequest({ status: 'APPROVED', userId: 'user-1' }),
      );
      const otherClient: AuthenticatedUser = { id: 'user-2', role: 'CLIENT' };

      await expect(
        service.generateDepositAddress(
          'request-1',
          'ETHEREUM',
          'USDS',
          otherClient,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(walletService.createDepositAddress).not.toHaveBeenCalled();
    });

    it("allows an ADMIN to act on any client's request", async () => {
      prisma.creditRequest.findUnique.mockResolvedValue(
        buildRequest({ status: 'APPROVED', userId: 'user-1' }),
      );
      walletService.createDepositAddress.mockResolvedValue(buildWallet());
      const admin: AuthenticatedUser = { id: 'admin-1', role: 'ADMIN' };

      await service.generateDepositAddress(
        'request-1',
        'ETHEREUM',
        'USDS',
        admin,
      );

      expect(walletService.createDepositAddress).toHaveBeenCalledWith(
        'user-1',
        'ETHEREUM',
        'USDS',
      );
    });

    it('throws CreditRequestNotApprovedException for a PENDING request', async () => {
      prisma.creditRequest.findUnique.mockResolvedValue(
        buildRequest({ status: 'PENDING' }),
      );

      await expect(
        service.generateDepositAddress('request-1', 'ETHEREUM', 'USDS', SELF),
      ).rejects.toBeInstanceOf(CreditRequestNotApprovedException);
      expect(walletService.createDepositAddress).not.toHaveBeenCalled();
    });

    it('commits the request to the first asset requested (no collateralCurrency yet)', async () => {
      prisma.creditRequest.findUnique.mockResolvedValue(
        buildRequest({ status: 'APPROVED', collateralCurrency: null }),
      );
      walletService.createDepositAddress.mockResolvedValue(buildWallet());

      await service.generateDepositAddress(
        'request-1',
        'ETHEREUM',
        'PAXG',
        SELF,
      );

      expect(prisma.creditRequest.update).toHaveBeenCalledWith({
        where: { id: 'request-1' },
        data: { collateralCurrency: 'PAXG' },
      });
    });

    it('reuses the already-committed asset without re-writing it', async () => {
      prisma.creditRequest.findUnique.mockResolvedValue(
        buildRequest({ status: 'APPROVED', collateralCurrency: 'PAXG' }),
      );
      walletService.createDepositAddress.mockResolvedValue(buildWallet());

      await service.generateDepositAddress(
        'request-1',
        'ETHEREUM',
        'PAXG',
        SELF,
      );

      expect(prisma.creditRequest.update).not.toHaveBeenCalled();
      expect(walletService.createDepositAddress).toHaveBeenCalledWith(
        'user-1',
        'ETHEREUM',
        'PAXG',
      );
    });

    it('throws CollateralCurrencyMismatchException when a different asset is requested for an already-committed request', async () => {
      prisma.creditRequest.findUnique.mockResolvedValue(
        buildRequest({ status: 'APPROVED', collateralCurrency: 'PAXG' }),
      );

      await expect(
        service.generateDepositAddress('request-1', 'ETHEREUM', 'USDS', SELF),
      ).rejects.toBeInstanceOf(CollateralCurrencyMismatchException);
      expect(walletService.createDepositAddress).not.toHaveBeenCalled();
      expect(prisma.creditRequest.update).not.toHaveBeenCalled();
    });
  });

  describe('tryAutoFulfill', () => {
    it('does nothing when the user has no APPROVED request', async () => {
      prisma.creditRequest.findFirst.mockResolvedValue(null);

      await service.tryAutoFulfill('user-1');

      expect(ledgerService.getBalance).not.toHaveBeenCalled();
      expect(
        creditEngineService.lockCollateralAndIssueCredit,
      ).not.toHaveBeenCalled();
    });

    it('does nothing when the available balance does not yet cover the collateral plus the origination fee', async () => {
      prisma.creditRequest.findFirst.mockResolvedValue(
        buildRequest({ collateralAmount: new Prisma.Decimal('2000') }),
      );
      // 2000 requis + 2% de 7000 (350% de 2000) = 140 de frais => il faut 2140.
      ledgerService.getBalance.mockResolvedValue(
        buildBalance({ availableBalance: new Prisma.Decimal('2139') }),
      );

      await service.tryAutoFulfill('user-1');

      expect(prisma.creditRequest.updateMany).not.toHaveBeenCalled();
      expect(
        creditEngineService.lockCollateralAndIssueCredit,
      ).not.toHaveBeenCalled();
    });

    it('claims the request, issues credit, and links the resulting position once the balance covers collateral + fee', async () => {
      const request = buildRequest({
        collateralAmount: new Prisma.Decimal('2000'),
        currency: 'USD',
      });
      prisma.creditRequest.findFirst.mockResolvedValue(request);
      ledgerService.getBalance.mockResolvedValue(
        buildBalance({ availableBalance: new Prisma.Decimal('2140') }),
      );
      prisma.creditRequest.updateMany.mockResolvedValue({ count: 1 });
      const position = buildPosition({ id: 'position-42' });
      creditEngineService.lockCollateralAndIssueCredit.mockResolvedValue({
        balance: buildBalance(),
        position,
      });

      await service.tryAutoFulfill('user-1');

      expect(prisma.creditRequest.updateMany).toHaveBeenCalledWith({
        where: { id: 'request-1', status: 'APPROVED' },
        data: { status: 'FULFILLED', fulfilledAt: expect.any(Date) as Date },
      });
      expect(
        creditEngineService.lockCollateralAndIssueCredit,
      ).toHaveBeenCalledWith(
        'user-1',
        new Prisma.Decimal('2000'),
        'USD',
        undefined,
      );
      expect(prisma.creditRequest.update).toHaveBeenCalledWith({
        where: { id: 'request-1' },
        data: { creditPositionId: 'position-42' },
      });
    });

    it('forwards the collateral asset committed on the request, for the yield engine to track', async () => {
      const request = buildRequest({
        collateralAmount: new Prisma.Decimal('2000'),
        currency: 'USD',
        collateralCurrency: 'PAXG',
      });
      prisma.creditRequest.findFirst.mockResolvedValue(request);
      ledgerService.getBalance.mockResolvedValue(
        buildBalance({ availableBalance: new Prisma.Decimal('2140') }),
      );
      prisma.creditRequest.updateMany.mockResolvedValue({ count: 1 });
      creditEngineService.lockCollateralAndIssueCredit.mockResolvedValue({
        balance: buildBalance(),
        position: buildPosition({ id: 'position-42' }),
      });

      await service.tryAutoFulfill('user-1');

      expect(
        creditEngineService.lockCollateralAndIssueCredit,
      ).toHaveBeenCalledWith(
        'user-1',
        new Prisma.Decimal('2000'),
        'USD',
        'PAXG',
      );
    });

    it('does not double-issue credit when the request was already claimed by a concurrent call', async () => {
      prisma.creditRequest.findFirst.mockResolvedValue(buildRequest());
      ledgerService.getBalance.mockResolvedValue(
        buildBalance({ availableBalance: new Prisma.Decimal('10000') }),
      );
      prisma.creditRequest.updateMany.mockResolvedValue({ count: 0 });

      await service.tryAutoFulfill('user-1');

      expect(
        creditEngineService.lockCollateralAndIssueCredit,
      ).not.toHaveBeenCalled();
    });

    it('reverts the request to APPROVED for a future retry when credit issuance fails after the claim', async () => {
      prisma.creditRequest.findFirst.mockResolvedValue(buildRequest());
      ledgerService.getBalance.mockResolvedValue(
        buildBalance({ availableBalance: new Prisma.Decimal('10000') }),
      );
      prisma.creditRequest.updateMany.mockResolvedValueOnce({ count: 1 });
      creditEngineService.lockCollateralAndIssueCredit.mockRejectedValue(
        new Error('insufficient funds'),
      );

      await service.tryAutoFulfill('user-1');

      expect(prisma.creditRequest.update).not.toHaveBeenCalled();
      expect(prisma.creditRequest.updateMany).toHaveBeenLastCalledWith({
        where: {
          id: 'request-1',
          status: 'FULFILLED',
          creditPositionId: null,
        },
        data: { status: 'APPROVED', fulfilledAt: null },
      });
    });
  });
});
