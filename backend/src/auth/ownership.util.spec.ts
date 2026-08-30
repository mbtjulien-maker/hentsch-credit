import { ForbiddenException } from '@nestjs/common';
import { assertSelfOrAdmin } from './ownership.util';

describe('assertSelfOrAdmin', () => {
  it('allows a client acting on their own userId', () => {
    expect(() =>
      assertSelfOrAdmin({ id: 'user-1', role: 'CLIENT' }, 'user-1'),
    ).not.toThrow();
  });

  it('allows an ADMIN acting on any userId', () => {
    expect(() =>
      assertSelfOrAdmin({ id: 'admin-1', role: 'ADMIN' }, 'user-1'),
    ).not.toThrow();
  });

  it("rejects a client acting on another client's userId", () => {
    expect(() =>
      assertSelfOrAdmin({ id: 'user-1', role: 'CLIENT' }, 'user-2'),
    ).toThrow(ForbiddenException);
  });
});
