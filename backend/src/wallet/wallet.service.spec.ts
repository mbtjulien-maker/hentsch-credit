import { Wallet } from '@prisma/client';
import { UnsupportedChainException } from '../common/exceptions/wallet.exceptions';
import { WalletService } from './wallet.service';

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

describe('WalletService', () => {
  let prisma: {
    wallet: { findFirst: jest.Mock; create: jest.Mock; findMany: jest.Mock };
  };
  let service: WalletService;

  beforeEach(() => {
    prisma = {
      wallet: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn() },
    };
    service = new WalletService(prisma as never);
  });

  describe('generateSandboxAddress', () => {
    it.each(['ETHEREUM', 'POLYGON', 'ARBITRUM'] as const)(
      'generates a checksummed EVM address for %s',
      (chain) => {
        const address = service.generateSandboxAddress(chain);
        expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      },
    );

    it.each(['TRON', 'SOLANA'] as const)(
      'rejects unsupported chain %s',
      (chain) => {
        expect(() => service.generateSandboxAddress(chain)).toThrow(
          UnsupportedChainException,
        );
      },
    );

    it('generates a different address on each call', () => {
      const a = service.generateSandboxAddress('ETHEREUM');
      const b = service.generateSandboxAddress('ETHEREUM');
      expect(a).not.toBe(b);
    });
  });

  describe('createDepositAddress', () => {
    it('returns the existing wallet when one already exists for (userId, chain, currency)', async () => {
      const existing = buildWallet();
      prisma.wallet.findFirst.mockResolvedValue(existing);

      const result = await service.createDepositAddress(
        'user-1',
        'ETHEREUM',
        'USDS',
      );

      expect(result).toEqual(existing);
      expect(prisma.wallet.create).not.toHaveBeenCalled();
    });

    it('generates and persists a new wallet when none exists yet', async () => {
      prisma.wallet.findFirst.mockResolvedValue(null);
      const created = buildWallet({ id: 'wallet-2' });
      prisma.wallet.create.mockResolvedValue(created);

      const result = await service.createDepositAddress(
        'user-1',
        'ETHEREUM',
        'USDS',
      );

      expect(prisma.wallet.create).toHaveBeenCalledWith({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- jest.fn() has no generic signature to narrow against
        data: expect.objectContaining({
          userId: 'user-1',
          chain: 'ETHEREUM',
          currency: 'USDS',
        }),
      });
      expect(result).toEqual(created);
    });

    it('propagates UnsupportedChainException for non-EVM chains instead of persisting anything', async () => {
      prisma.wallet.findFirst.mockResolvedValue(null);

      await expect(
        service.createDepositAddress('user-1', 'TRON', 'DAI'),
      ).rejects.toBeInstanceOf(UnsupportedChainException);
      expect(prisma.wallet.create).not.toHaveBeenCalled();
    });
  });

  describe('listWallets', () => {
    it('returns all wallets for a user', async () => {
      const wallets = [buildWallet()];
      prisma.wallet.findMany.mockResolvedValue(wallets);

      await expect(service.listWallets('user-1')).resolves.toEqual(wallets);
      expect(prisma.wallet.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });
  });
});
