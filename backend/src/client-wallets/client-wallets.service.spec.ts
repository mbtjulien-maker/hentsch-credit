import { ClientManagedWallet } from '@prisma/client';
import { ClientWalletsService } from './client-wallets.service';

function buildWallet(
  overrides: Partial<ClientManagedWallet> = {},
): ClientManagedWallet {
  return {
    id: 'wallet-1',
    userId: 'user-1',
    reference: 'CW-ABCD1234',
    createdAt: new Date(),
    ...overrides,
  };
}

describe('ClientWalletsService', () => {
  let prisma: {
    clientManagedWallet: { findUnique: jest.Mock; create: jest.Mock };
  };
  let service: ClientWalletsService;

  beforeEach(() => {
    prisma = {
      clientManagedWallet: { findUnique: jest.fn(), create: jest.fn() },
    };
    service = new ClientWalletsService(prisma as never);
  });

  describe('getOrCreate', () => {
    it('returns the existing wallet without creating a new one', async () => {
      const existing = buildWallet();
      prisma.clientManagedWallet.findUnique.mockResolvedValue(existing);

      const result = await service.getOrCreate('user-1');

      expect(prisma.clientManagedWallet.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(prisma.clientManagedWallet.create).not.toHaveBeenCalled();
      expect(result).toBe(existing);
    });

    it('provisions a new wallet with a CW-prefixed reference when none exists yet', async () => {
      prisma.clientManagedWallet.findUnique.mockResolvedValue(null);
      const created = buildWallet();
      prisma.clientManagedWallet.create.mockResolvedValue(created);

      const result = await service.getOrCreate('user-1');

      expect(prisma.clientManagedWallet.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- jest.fn() has no generic signature to narrow against
          reference: expect.stringMatching(/^CW-[A-F0-9]{8}$/),
        },
      });
      expect(result).toBe(created);
    });
  });
});
