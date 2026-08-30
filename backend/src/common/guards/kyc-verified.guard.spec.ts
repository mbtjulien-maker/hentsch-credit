import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { KycVerifiedGuard } from './kyc-verified.guard';

function buildContext(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('KycVerifiedGuard', () => {
  let prisma: { user: { findUnique: jest.Mock } };
  let guard: KycVerifiedGuard;

  beforeEach(() => {
    prisma = { user: { findUnique: jest.fn() } };
    guard = new KycVerifiedGuard(prisma as never);
  });

  it('allows the request when the user is KYC VERIFIED', async () => {
    prisma.user.findUnique.mockResolvedValue({ kycStatus: 'VERIFIED' });

    await expect(
      guard.canActivate(buildContext({ id: 'user-1', role: 'CLIENT' })),
    ).resolves.toBe(true);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { kycStatus: true },
    });
  });

  it('rejects when the user is KYC PENDING', async () => {
    prisma.user.findUnique.mockResolvedValue({ kycStatus: 'PENDING' });

    await expect(
      guard.canActivate(buildContext({ id: 'user-1', role: 'CLIENT' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects when the user is KYC REJECTED', async () => {
    prisma.user.findUnique.mockResolvedValue({ kycStatus: 'REJECTED' });

    await expect(
      guard.canActivate(buildContext({ id: 'user-1', role: 'CLIENT' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects when the user no longer exists in the database', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      guard.canActivate(buildContext({ id: 'ghost', role: 'CLIENT' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects when no authenticated user is present on the request', async () => {
    await expect(
      guard.canActivate(buildContext(undefined)),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('re-reads KYC status live rather than trusting a stale JWT claim', async () => {
    // Le JWT ne porte que id/role (cf. AuthenticatedUser) : même un token émis avant un
    // rejet KYC doit être bloqué dès que le statut change en base.
    prisma.user.findUnique.mockResolvedValue({ kycStatus: 'REJECTED' });

    await expect(
      guard.canActivate(buildContext({ id: 'user-1', role: 'CLIENT' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
