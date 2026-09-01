import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/auth.service';
import { AdminGuard } from './admin.guard';

function buildContext(
  user: AuthenticatedUser | undefined,
  path = '/admin/clients',
): ExecutionContext {
  const request = { user, path };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('AdminGuard', () => {
  let findUnique: jest.Mock;
  let guard: AdminGuard;

  beforeEach(() => {
    findUnique = jest.fn();
    guard = new AdminGuard({ user: { findUnique } } as never);
  });

  it('allows an ADMIN account with 2FA enabled', async () => {
    findUnique.mockResolvedValue({ twoFactorEnabled: true });
    await expect(
      guard.canActivate(buildContext({ id: 'user-1', role: 'ADMIN' })),
    ).resolves.toBe(true);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { twoFactorEnabled: true },
    });
  });

  it('rejects an ADMIN account without 2FA enabled', async () => {
    findUnique.mockResolvedValue({ twoFactorEnabled: false });
    await expect(
      guard.canActivate(buildContext({ id: 'user-1', role: 'ADMIN' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('lets an ADMIN account without 2FA reach the three 2FA bootstrap routes', async () => {
    for (const path of [
      '/auth/2fa/setup',
      '/auth/2fa/enable',
      '/auth/2fa/disable',
    ]) {
      await expect(
        guard.canActivate(buildContext({ id: 'user-1', role: 'ADMIN' }, path)),
      ).resolves.toBe(true);
    }
    // Le rôle seul suffit sur ces trois routes : jamais besoin de relire twoFactorEnabled.
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('rejects a CLIENT account with ForbiddenException', async () => {
    await expect(
      guard.canActivate(buildContext({ id: 'user-1', role: 'CLIENT' })),
    ).rejects.toThrow(ForbiddenException);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('rejects a request with no authenticated user (JwtAuthGuard should have run first)', async () => {
    await expect(guard.canActivate(buildContext(undefined))).rejects.toThrow(
      ForbiddenException,
    );
  });
});
