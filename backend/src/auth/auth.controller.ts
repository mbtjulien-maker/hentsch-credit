import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AdminGuard } from '../common/guards/admin.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import {
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
} from './auth.constants';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { TwoFactorChallengeDto } from './dto/two-factor-challenge.dto';
import { TwoFactorCodeDto } from './dto/two-factor-code.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedUser } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly twoFactorService: TwoFactorService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private setSessionCookie(res: Response, token: string) {
    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.configService.get('NODE_ENV') === 'production',
      maxAge: SESSION_DURATION_SECONDS * 1000,
      path: '/',
    });
  }

  // Limite dédiée, plus stricte que le défaut global (cf. AppModule) : 5 tentatives par
  // minute par IP — ralentit une attaque par force brute sur les mots de passe sans gêner
  // un utilisateur légitime qui se trompe une ou deux fois.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateCredentials(
      dto.email,
      dto.password,
    );
    // Message générique volontaire : ne jamais indiquer si c'est l'email ou le mot de
    // passe qui est incorrect (évite l'énumération de comptes existants).
    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    // Mot de passe validé, mais un compte avec la 2FA activée n'obtient pas de session
    // tout de suite : cf. POST /auth/2fa/challenge pour la suite. Aucun cookie n'est posé
    // à ce stade.
    if (user.twoFactorEnabled) {
      const pendingToken = await this.authService.signPendingTwoFactorToken(
        user.id,
      );
      return { requiresTwoFactor: true, pendingToken };
    }

    const token = await this.authService.signToken(user);
    this.setSessionCookie(res, token);

    return {
      id: user.id,
      email: user.email,
      kycStatus: user.kycStatus,
      role: user.role,
      accountType: user.accountType,
      createdAt: user.createdAt,
    };
  }

  // Seconde étape du login pour un compte avec la 2FA activée — pendingToken prouve que
  // l'étape mot de passe a déjà réussi (cf. login ci-dessus), le code TOTP prouve la
  // possession du second facteur. C'est seulement ici que le cookie de session est posé.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('2fa/challenge')
  @HttpCode(HttpStatus.OK)
  async twoFactorChallenge(
    @Body() dto: TwoFactorChallengeDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId = await this.authService.verifyPendingTwoFactorToken(
      dto.pendingToken,
    );
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new UnauthorizedException(
        'Jeton de vérification invalide ou expiré',
      );
    }

    const valid = await this.twoFactorService.verifyToken(
      dto.code,
      user.twoFactorSecret,
    );
    if (!valid) {
      throw new UnauthorizedException('Code de vérification invalide');
    }

    const token = await this.authService.signToken(user);
    this.setSessionCookie(res, token);

    return {
      id: user.id,
      email: user.email,
      kycStatus: user.kycStatus,
      role: user.role,
      accountType: user.accountType,
      createdAt: user.createdAt,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    return { success: true };
  }

  // Relit la base (pas seulement le JWT) pour que le rafraîchissement de page reflète un
  // éventuel changement de statut KYC/rôle survenu depuis le login, sans exiger une
  // reconnexion — sert à restaurer la session côté frontend au chargement de l'app.
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() currentUser: AuthenticatedUser) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: currentUser.id },
      select: {
        id: true,
        email: true,
        kycStatus: true,
        role: true,
        accountType: true,
        createdAt: true,
        twoFactorEnabled: true,
      },
    });
    return user;
  }

  // ── Authentification à deux facteurs (TOTP) — réservée aux comptes ADMIN ──
  //
  // Séquence : setup (génère un secret + QR, ne l'active pas encore) → enable (confirme
  // un premier code valide, active réellement) → un login suivant exige désormais un code
  // (cf. twoFactorChallenge ci-dessus) → disable (désactive, exige un code valide).
  // Toutes ces routes supposent une session déjà valide (mot de passe déjà prouvé) : ce
  // n'est pas le login lui-même, c'est la gestion du second facteur depuis les paramètres
  // du compte.

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('2fa/setup')
  @HttpCode(HttpStatus.OK)
  async setupTwoFactor(@CurrentUser() currentUser: AuthenticatedUser) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: currentUser.id },
    });
    if (user.twoFactorEnabled) {
      throw new BadRequestException('La 2FA est déjà activée sur ce compte');
    }

    const secret = this.twoFactorService.generateSecret();
    // Le secret est déjà persisté ici, mais twoFactorEnabled reste false : un secret
    // généré puis jamais confirmé (utilisateur qui ferme l'onglet) ne bloque jamais le
    // login, cf. schema.prisma.
    await this.prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: secret },
    });

    const otpauthUrl = this.twoFactorService.buildOtpauthUrl(
      user.email,
      secret,
    );
    const qrCodeDataUrl =
      await this.twoFactorService.generateQrCodeDataUrl(otpauthUrl);

    return { secret, otpauthUrl, qrCodeDataUrl };
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  async enableTwoFactor(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: TwoFactorCodeDto,
  ) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: currentUser.id },
    });
    if (user.twoFactorEnabled) {
      throw new BadRequestException('La 2FA est déjà activée sur ce compte');
    }
    if (!user.twoFactorSecret) {
      throw new BadRequestException(
        'Aucune configuration en attente : appelez POST /auth/2fa/setup en premier',
      );
    }

    const valid = await this.twoFactorService.verifyToken(
      dto.code,
      user.twoFactorSecret,
    );
    if (!valid) {
      throw new UnauthorizedException('Code de vérification invalide');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true },
    });

    return { success: true };
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  async disableTwoFactor(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: TwoFactorCodeDto,
  ) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: currentUser.id },
    });
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException("La 2FA n'est pas activée sur ce compte");
    }

    const valid = await this.twoFactorService.verifyToken(
      dto.code,
      user.twoFactorSecret,
    );
    if (!valid) {
      throw new UnauthorizedException('Code de vérification invalide');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });

    return { success: true };
  }
}
