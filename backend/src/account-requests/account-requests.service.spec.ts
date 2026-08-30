import { AccountOpeningRequest, User } from '@prisma/client';
import * as passwordUtil from '../common/password.util';
import {
  AccountAlreadyExistsException,
  AccountCapacityReachedException,
  AccountRequestNotFoundException,
  AccountRequestNotPendingException,
  ActiveAccountRequestExistsException,
} from '../common/exceptions/account-request.exceptions';
import { AccountRequestsService } from './account-requests.service';
import { MAX_CLIENT_ACCOUNTS } from './account-requests.constants';

function buildRequest(
  overrides: Partial<AccountOpeningRequest> = {},
): AccountOpeningRequest {
  return {
    id: 'request-1',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    phone: null,
    message: null,
    status: 'PENDING',
    createdAt: new Date(),
    reviewedAt: null,
    userId: null,
    ...overrides,
  };
}

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'ada@example.com',
    passwordHash: 'hash',
    kycStatus: 'PENDING',
    role: 'CLIENT',
    createdAt: new Date(),
    updatedAt: new Date(),
    twoFactorSecret: null,
    twoFactorEnabled: false,
    ...overrides,
  };
}

describe('AccountRequestsService', () => {
  let prisma: {
    user: { findUnique: jest.Mock; count: jest.Mock };
    accountOpeningRequest: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      updateMany: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let tx: {
    user: { create: jest.Mock; count: jest.Mock };
    accountOpeningRequest: { update: jest.Mock };
  };
  let service: AccountRequestsService;

  beforeEach(() => {
    tx = {
      user: { create: jest.fn(), count: jest.fn().mockResolvedValue(0) },
      accountOpeningRequest: { update: jest.fn() },
    };
    prisma = {
      user: { findUnique: jest.fn(), count: jest.fn() },
      accountOpeningRequest: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
        callback(tx),
      ),
    };
    service = new AccountRequestsService(prisma as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    it('creates a PENDING request when no account or active request exists for the email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.accountOpeningRequest.findFirst.mockResolvedValue(null);
      const created = buildRequest();
      prisma.accountOpeningRequest.create.mockResolvedValue(created);

      const result = await service.create({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
      });

      expect(prisma.accountOpeningRequest.create).toHaveBeenCalledWith({
        data: {
          firstName: 'Ada',
          lastName: 'Lovelace',
          email: 'ada@example.com',
          phone: undefined,
          message: undefined,
        },
      });
      expect(result).toBe(created);
    });

    it('throws AccountAlreadyExistsException when a User already exists for the email', async () => {
      prisma.user.findUnique.mockResolvedValue(buildUser());

      await expect(
        service.create({
          firstName: 'Ada',
          lastName: 'Lovelace',
          email: 'ada@example.com',
        }),
      ).rejects.toBeInstanceOf(AccountAlreadyExistsException);
      expect(prisma.accountOpeningRequest.create).not.toHaveBeenCalled();
    });

    it('throws ActiveAccountRequestExistsException when a PENDING request already exists for the email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.accountOpeningRequest.findFirst.mockResolvedValue(buildRequest());

      await expect(
        service.create({
          firstName: 'Ada',
          lastName: 'Lovelace',
          email: 'ada@example.com',
        }),
      ).rejects.toBeInstanceOf(ActiveAccountRequestExistsException);
      expect(prisma.accountOpeningRequest.create).not.toHaveBeenCalled();
    });
  });

  describe('listPending', () => {
    it('lists PENDING requests oldest first (FIFO review queue)', async () => {
      const requests = [buildRequest()];
      prisma.accountOpeningRequest.findMany.mockResolvedValue(requests);

      const result = await service.listPending();

      expect(prisma.accountOpeningRequest.findMany).toHaveBeenCalledWith({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toBe(requests);
    });
  });

  describe('approve', () => {
    it('creates the User (with an empty ledger) and marks the request APPROVED, returning a one-time temporary password', async () => {
      prisma.accountOpeningRequest.findUnique.mockResolvedValue(buildRequest());
      prisma.user.findUnique.mockResolvedValue(null);
      jest
        .spyOn(passwordUtil, 'generateTemporaryPassword')
        .mockReturnValue('temp-pass-123');
      jest
        .spyOn(passwordUtil, 'hashPassword')
        .mockResolvedValue('hashed-temp-pass');
      const createdUser = buildUser({ id: 'user-42' });
      tx.user.create.mockResolvedValue(createdUser);
      const updatedRequest = buildRequest({
        status: 'APPROVED',
        userId: 'user-42',
      });
      tx.accountOpeningRequest.update.mockResolvedValue(updatedRequest);

      const result = await service.approve('request-1');

      expect(tx.user.create).toHaveBeenCalledWith({
        data: {
          email: 'ada@example.com',
          passwordHash: 'hashed-temp-pass',
          kycStatus: 'PENDING',
          role: 'CLIENT',
          ledgerBalance: { create: {} },
        },
      });
      expect(tx.accountOpeningRequest.update).toHaveBeenCalledWith({
        where: { id: 'request-1' },
        data: {
          status: 'APPROVED',
          reviewedAt: expect.any(Date) as Date,
          userId: 'user-42',
        },
      });
      expect(result).toEqual({
        request: updatedRequest,
        temporaryPassword: 'temp-pass-123',
      });
    });

    it('throws AccountRequestNotFoundException for an unknown request', async () => {
      prisma.accountOpeningRequest.findUnique.mockResolvedValue(null);

      await expect(service.approve('unknown')).rejects.toBeInstanceOf(
        AccountRequestNotFoundException,
      );
      expect(tx.user.create).not.toHaveBeenCalled();
    });

    it('throws AccountRequestNotPendingException for an already-reviewed request', async () => {
      prisma.accountOpeningRequest.findUnique.mockResolvedValue(
        buildRequest({ status: 'APPROVED' }),
      );

      await expect(service.approve('request-1')).rejects.toBeInstanceOf(
        AccountRequestNotPendingException,
      );
      expect(tx.user.create).not.toHaveBeenCalled();
    });

    it('throws AccountAlreadyExistsException if a User already exists for the email (race condition)', async () => {
      prisma.accountOpeningRequest.findUnique.mockResolvedValue(buildRequest());
      prisma.user.findUnique.mockResolvedValue(buildUser());

      await expect(service.approve('request-1')).rejects.toBeInstanceOf(
        AccountAlreadyExistsException,
      );
      expect(tx.user.create).not.toHaveBeenCalled();
    });

    it('throws AccountCapacityReachedException when the client-account cap is already reached, without creating the User', async () => {
      prisma.accountOpeningRequest.findUnique.mockResolvedValue(buildRequest());
      prisma.user.findUnique.mockResolvedValue(null);
      tx.user.count.mockResolvedValue(MAX_CLIENT_ACCOUNTS);

      await expect(service.approve('request-1')).rejects.toBeInstanceOf(
        AccountCapacityReachedException,
      );
      expect(tx.user.create).not.toHaveBeenCalled();
      expect(tx.accountOpeningRequest.update).not.toHaveBeenCalled();
    });

    it('still approves when exactly one place remains (count = max - 1)', async () => {
      prisma.accountOpeningRequest.findUnique.mockResolvedValue(buildRequest());
      prisma.user.findUnique.mockResolvedValue(null);
      tx.user.count.mockResolvedValue(MAX_CLIENT_ACCOUNTS - 1);
      jest
        .spyOn(passwordUtil, 'generateTemporaryPassword')
        .mockReturnValue('temp-pass-123');
      jest
        .spyOn(passwordUtil, 'hashPassword')
        .mockResolvedValue('hashed-temp-pass');
      tx.user.create.mockResolvedValue(buildUser({ id: 'user-42' }));
      tx.accountOpeningRequest.update.mockResolvedValue(
        buildRequest({ status: 'APPROVED', userId: 'user-42' }),
      );

      await expect(service.approve('request-1')).resolves.toBeDefined();
      expect(tx.user.create).toHaveBeenCalled();
    });
  });

  describe('getCapacity', () => {
    it('reports used/max/remaining based on the current CLIENT count', async () => {
      prisma.user.count.mockResolvedValue(4998);

      const result = await service.getCapacity();

      expect(prisma.user.count).toHaveBeenCalledWith({
        where: { role: 'CLIENT' },
      });
      expect(result).toEqual({
        used: 4998,
        max: MAX_CLIENT_ACCOUNTS,
        remaining: 2,
      });
    });

    it('never reports negative remaining places if the count somehow exceeds the cap', async () => {
      prisma.user.count.mockResolvedValue(MAX_CLIENT_ACCOUNTS + 1);

      const result = await service.getCapacity();

      expect(result.remaining).toBe(0);
    });
  });

  describe('reject', () => {
    it('marks a PENDING request REJECTED and stamps reviewedAt', async () => {
      prisma.accountOpeningRequest.updateMany.mockResolvedValue({ count: 1 });
      const rejected = buildRequest({ status: 'REJECTED' });
      prisma.accountOpeningRequest.findUniqueOrThrow.mockResolvedValue(
        rejected,
      );

      const result = await service.reject('request-1');

      expect(prisma.accountOpeningRequest.updateMany).toHaveBeenCalledWith({
        where: { id: 'request-1', status: 'PENDING' },
        data: { status: 'REJECTED', reviewedAt: expect.any(Date) as Date },
      });
      expect(result).toBe(rejected);
    });

    it('throws AccountRequestNotFoundException for an unknown request', async () => {
      prisma.accountOpeningRequest.updateMany.mockResolvedValue({ count: 0 });
      prisma.accountOpeningRequest.findUnique.mockResolvedValue(null);

      await expect(service.reject('unknown')).rejects.toBeInstanceOf(
        AccountRequestNotFoundException,
      );
    });

    it('throws AccountRequestNotPendingException for an already-reviewed request', async () => {
      prisma.accountOpeningRequest.updateMany.mockResolvedValue({ count: 0 });
      prisma.accountOpeningRequest.findUnique.mockResolvedValue(
        buildRequest({ status: 'APPROVED' }),
      );

      await expect(service.reject('request-1')).rejects.toBeInstanceOf(
        AccountRequestNotPendingException,
      );
    });
  });
});
