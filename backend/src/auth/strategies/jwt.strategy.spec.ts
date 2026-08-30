import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  it('throws if JWT_SECRET is not configured (fails fast at startup)', () => {
    const configService = { get: jest.fn().mockReturnValue(undefined) };
    expect(() => new JwtStrategy(configService as never)).toThrow(
      'JWT_SECRET manquant — voir .env.example',
    );
  });

  describe('validate', () => {
    let strategy: JwtStrategy;

    beforeEach(() => {
      const configService = { get: jest.fn().mockReturnValue('test-secret') };
      strategy = new JwtStrategy(configService as never);
    });

    it('maps a valid payload to an AuthenticatedUser', () => {
      const result = strategy.validate({ sub: 'user-1', role: 'ADMIN' });
      expect(result).toEqual({ id: 'user-1', role: 'ADMIN' });
    });

    it('rejects a payload with no subject', () => {
      expect(() => strategy.validate({ sub: '', role: 'CLIENT' })).toThrow(
        UnauthorizedException,
      );
    });
  });
});
