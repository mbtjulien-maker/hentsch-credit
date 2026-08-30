import { User } from '@prisma/client';
import * as passwordUtil from '../common/password.util';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { PENDING_TWO_FACTOR_TOKEN_TTL_SECONDS } from './auth.constants';

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'user@example.com',
    passwordHash: 'hashed',
    kycStatus: 'VERIFIED',
    role: 'CLIENT',
    createdAt: new Date(),
    updatedAt: new Date(),
    twoFactorSecret: null,
    twoFactorEnabled: false,
    ...overrides,
  };
}

describe('AuthService', () => {
  let prisma: { user: { findUnique: jest.Mock } };
  let jwtService: { signAsync: jest.Mock; verifyAsync: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    prisma = { user: { findUnique: jest.fn() } };
    jwtService = { signAsync: jest.fn(), verifyAsync: jest.fn() };
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

  describe('signPendingTwoFactorToken', () => {
    it('signs a distinctly-shaped payload (pending2fa: true, no role) with a short TTL', async () => {
      jwtService.signAsync.mockResolvedValue('pending.jwt.token');

      const token = await service.signPendingTwoFactorToken('user-1');

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: 'user-1', pending2fa: true },
        { expiresIn: PENDING_TWO_FACTOR_TOKEN_TTL_SECONDS },
      );
      expect(token).toBe('pending.jwt.token');
    });
  });

  describe('verifyPendingTwoFactorToken', () => {
    it('returns the user id when the payload has the expected pending2fa shape', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'user-1',
        pending2fa: true,
      });

      const userId = await service.verifyPendingTwoFactorToken('valid.token');

      expect(userId).toBe('user-1');
    });

    it('rejects a token that fails signature/expiry verification', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(
        service.verifyPendingTwoFactorToken('expired.token'),
      ).rejects.toThrow('Jeton de vérification invalide ou expiré');
    });

    // Un JWT de session normale (JwtPayload : { sub, role }) est signé avec le même
    // secret que le jeton intermédiaire — la vérification cryptographique seule ne suffit
    // donc pas à les distinguer. C'est le test le plus important de ce fichier : un jeton
    // de session valide ne doit JAMAIS pouvoir servir à franchir l'étape 2FA.
    it('rejects a well-formed, validly-signed session token (missing pending2fa: true)', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'user-1',
        role: 'ADMIN',
      });

      await expect(
        service.verifyPendingTwoFactorToken('session.token'),
      ).rejects.toThrow('Jeton de vérification invalide ou expiré');
    });
  });
});
