import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/auth.service';
import { AdminGuard } from './admin.guard';

function buildContext(user?: AuthenticatedUser): ExecutionContext {
  const request = { user };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('AdminGuard', () => {
  let guard: AdminGuard;

  beforeEach(() => {
    guard = new AdminGuard();
  });

  it('allows a request authenticated as an ADMIN account', () => {
    expect(
      guard.canActivate(buildContext({ id: 'user-1', role: 'ADMIN' })),
    ).toBe(true);
  });

  it('rejects a CLIENT account with ForbiddenException', () => {
    expect(() =>
      guard.canActivate(buildContext({ id: 'user-1', role: 'CLIENT' })),
    ).toThrow(ForbiddenException);
  });

  it('rejects a request with no authenticated user (JwtAuthGuard should have run first)', () => {
    expect(() => guard.canActivate(buildContext(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
