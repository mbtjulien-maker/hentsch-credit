import { UnauthorizedException } from '@nestjs/common';
import { User } from '@prisma/client';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { SESSION_COOKIE_NAME } from './auth.constants';

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'user@example.com',
    passwordHash: 'hashed',
    kycStatus: 'VERIFIED',
    role: 'CLIENT',
    accountType: 'PARTICULIER',
    createdAt: new Date(),
    updatedAt: new Date(),
    twoFactorSecret: null,
    twoFactorEnabled: false,
    failedLoginAttempts: 0,
    lockedUntil: null,
    ...overrides,
  };
}

// Le point le plus critique de ce fichier : un compte avec la 2FA activée ne doit
// JAMAIS obtenir de cookie de session directement depuis /auth/login, même mot de passe
// correct — cf. les deux premiers tests du describe('login').
describe('AuthController', () => {
  let authService: {
    validateCredentials: jest.Mock;
    signToken: jest.Mock;
    signPendingTwoFactorToken: jest.Mock;
    verifyPendingTwoFactorToken: jest.Mock;
  };
  let twoFactorService: {
    generateSecret: jest.Mock;
    buildOtpauthUrl: jest.Mock;
    generateQrCodeDataUrl: jest.Mock;
    verifyToken: jest.Mock;
  };
  let prisma: {
    user: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
    };
  };
  let res: { cookie: jest.Mock; clearCookie: jest.Mock };
  let controller: AuthController;

  beforeEach(() => {
    authService = {
      validateCredentials: jest.fn(),
      signToken: jest.fn(),
      signPendingTwoFactorToken: jest.fn(),
      verifyPendingTwoFactorToken: jest.fn(),
    };
    twoFactorService = {
      generateSecret: jest.fn(),
      buildOtpauthUrl: jest.fn(),
      generateQrCodeDataUrl: jest.fn(),
      verifyToken: jest.fn(),
    };
    prisma = {
      user: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
    };
    res = { cookie: jest.fn(), clearCookie: jest.fn() };
    controller = new AuthController(
      authService as unknown as AuthService,
      twoFactorService,
      prisma as unknown as PrismaService,
      new ConfigService(),
    );
  });

  describe('login', () => {
    it('issues a session cookie immediately for an account without 2FA', async () => {
      const user = buildUser();
      authService.validateCredentials.mockResolvedValue(user);
      authService.signToken.mockResolvedValue('session.jwt');

      const result = await controller.login(
        { email: user.email, password: 'correct' },
        res as never,
      );

      expect(res.cookie).toHaveBeenCalledWith(
        SESSION_COOKIE_NAME,
        'session.jwt',
        expect.any(Object),
      );
      expect(authService.signPendingTwoFactorToken).not.toHaveBeenCalled();
      expect(result).toMatchObject({ id: user.id, email: user.email });
    });

    it('does NOT issue a session cookie for an account with 2FA enabled, returns a pending token instead', async () => {
      const user = buildUser({
        twoFactorEnabled: true,
        twoFactorSecret: 'SECRET',
      });
      authService.validateCredentials.mockResolvedValue(user);
      authService.signPendingTwoFactorToken.mockResolvedValue('pending.jwt');

      const result = await controller.login(
        { email: user.email, password: 'correct' },
        res as never,
      );

      expect(res.cookie).not.toHaveBeenCalled();
      expect(authService.signToken).not.toHaveBeenCalled();
      expect(result).toEqual({
        requiresTwoFactor: true,
        pendingToken: 'pending.jwt',
      });
    });

    it('rejects invalid credentials with a generic message before any 2FA branching', async () => {
      authService.validateCredentials.mockResolvedValue(null);

      await expect(
        controller.login(
          { email: 'ghost@example.com', password: 'wrong' },
          res as never,
        ),
      ).rejects.toThrow(UnauthorizedException);
      expect(res.cookie).not.toHaveBeenCalled();
    });
  });

  describe('twoFactorChallenge', () => {
    it('issues the session cookie only after both the pending token and the TOTP code are valid', async () => {
      const user = buildUser({
        twoFactorEnabled: true,
        twoFactorSecret: 'SECRET',
      });
      authService.verifyPendingTwoFactorToken.mockResolvedValue(user.id);
      prisma.user.findUnique.mockResolvedValue(user);
      twoFactorService.verifyToken.mockResolvedValue(true);
      authService.signToken.mockResolvedValue('session.jwt');

      const result = await controller.twoFactorChallenge(
        { pendingToken: 'pending.jwt', code: '123456' },
        res as never,
      );

      expect(twoFactorService.verifyToken).toHaveBeenCalledWith(
        '123456',
        'SECRET',
      );
      expect(res.cookie).toHaveBeenCalledWith(
        SESSION_COOKIE_NAME,
        'session.jwt',
        expect.any(Object),
      );
      expect(result).toMatchObject({ id: user.id });
    });

    it('rejects an invalid TOTP code without issuing a cookie', async () => {
      const user = buildUser({
        twoFactorEnabled: true,
        twoFactorSecret: 'SECRET',
      });
      authService.verifyPendingTwoFactorToken.mockResolvedValue(user.id);
      prisma.user.findUnique.mockResolvedValue(user);
      twoFactorService.verifyToken.mockResolvedValue(false);

      await expect(
        controller.twoFactorChallenge(
          { pendingToken: 'pending.jwt', code: '000000' },
          res as never,
        ),
      ).rejects.toThrow(UnauthorizedException);
      expect(res.cookie).not.toHaveBeenCalled();
    });

    it('rejects if the account no longer has 2FA enabled (disabled between login and challenge)', async () => {
      const user = buildUser({
        twoFactorEnabled: false,
        twoFactorSecret: null,
      });
      authService.verifyPendingTwoFactorToken.mockResolvedValue(user.id);
      prisma.user.findUnique.mockResolvedValue(user);

      await expect(
        controller.twoFactorChallenge(
          { pendingToken: 'pending.jwt', code: '123456' },
          res as never,
        ),
      ).rejects.toThrow(UnauthorizedException);
      expect(twoFactorService.verifyToken).not.toHaveBeenCalled();
    });
  });

  describe('setupTwoFactor / enableTwoFactor / disableTwoFactor', () => {
    it('setup generates and persists a secret, returns a QR code, without enabling 2FA yet', async () => {
      const user = buildUser();
      prisma.user.findUniqueOrThrow.mockResolvedValue(user);
      twoFactorService.generateSecret.mockReturnValue('NEWSECRET');
      twoFactorService.buildOtpauthUrl.mockReturnValue('otpauth://totp/...');
      twoFactorService.generateQrCodeDataUrl.mockResolvedValue(
        'data:image/png;base64,...',
      );

      const result = await controller.setupTwoFactor({
        id: user.id,
        role: user.role,
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: { twoFactorSecret: 'NEWSECRET' },
      });
      expect(result).toEqual({
        secret: 'NEWSECRET',
        otpauthUrl: 'otpauth://totp/...',
        qrCodeDataUrl: 'data:image/png;base64,...',
      });
    });

    it('setup refuses if 2FA is already enabled', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue(
        buildUser({ twoFactorEnabled: true }),
      );

      await expect(
        controller.setupTwoFactor({ id: 'user-1', role: 'ADMIN' }),
      ).rejects.toThrow('La 2FA est déjà activée sur ce compte');
    });

    it('enable flips twoFactorEnabled to true only with a valid code', async () => {
      const user = buildUser({ twoFactorSecret: 'PENDINGSECRET' });
      prisma.user.findUniqueOrThrow.mockResolvedValue(user);
      twoFactorService.verifyToken.mockResolvedValue(true);

      await controller.enableTwoFactor(
        { id: user.id, role: user.role },
        { code: '123456' },
      );

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: { twoFactorEnabled: true },
      });
    });

    it('enable rejects an invalid confirmation code, does not enable 2FA', async () => {
      const user = buildUser({ twoFactorSecret: 'PENDINGSECRET' });
      prisma.user.findUniqueOrThrow.mockResolvedValue(user);
      twoFactorService.verifyToken.mockResolvedValue(false);

      await expect(
        controller.enableTwoFactor(
          { id: user.id, role: user.role },
          { code: '000000' },
        ),
      ).rejects.toThrow(UnauthorizedException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('disable clears the secret and flips twoFactorEnabled to false with a valid code', async () => {
      const user = buildUser({
        twoFactorEnabled: true,
        twoFactorSecret: 'SECRET',
      });
      prisma.user.findUniqueOrThrow.mockResolvedValue(user);
      twoFactorService.verifyToken.mockResolvedValue(true);

      await controller.disableTwoFactor(
        { id: user.id, role: user.role },
        { code: '123456' },
      );

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: { twoFactorEnabled: false, twoFactorSecret: null },
      });
    });
  });
});
