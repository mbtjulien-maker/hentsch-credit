import { User } from '@prisma/client';
import * as passwordUtil from '../common/password.util';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'user@example.com',
    passwordHash: 'hashed',
    kycStatus: 'VERIFIED',
    role: 'CLIENT',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('AuthService', () => {
  let prisma: { user: { findUnique: jest.Mock } };
  let jwtService: { signAsync: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    prisma = { user: { findUnique: jest.fn() } };
    jwtService = { signAsync: jest.fn() };
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validateCredentials', () => {
    it('returns the user when the email exists and the password matches the hash', async () => {
      const user = buildUser();
      prisma.user.findUnique.mockResolvedValue(user);
      jest.spyOn(passwordUtil, 'verifyPassword').mockResolvedValue(true);

      const result = await service.validateCredentials(
        'user@example.com',
        'correct-password',
      );

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
      });
      expect(passwordUtil.verifyPassword).toHaveBeenCalledWith(
        'correct-password',
        'hashed',
      );
      expect(result).toBe(user);
    });

    it('returns null when the email is unknown (never hits bcrypt)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const verifySpy = jest.spyOn(passwordUtil, 'verifyPassword');

      const result = await service.validateCredentials(
        'ghost@example.com',
        'whatever',
      );

      expect(result).toBeNull();
      expect(verifySpy).not.toHaveBeenCalled();
    });

    it('returns null when the password does not match', async () => {
      prisma.user.findUnique.mockResolvedValue(buildUser());
      jest.spyOn(passwordUtil, 'verifyPassword').mockResolvedValue(false);

      const result = await service.validateCredentials(
        'user@example.com',
        'wrong-password',
      );

      expect(result).toBeNull();
    });
  });

  describe('signToken', () => {
    it('signs a JWT payload containing the user id and role', async () => {
      jwtService.signAsync.mockResolvedValue('signed.jwt.token');

      const token = await service.signToken({
        id: 'user-1',
        role: 'ADMIN',
      });

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 'user-1',
        role: 'ADMIN',
      });
      expect(token).toBe('signed.jwt.token');
    });
  });
});
