import {
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
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import {
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
} from './auth.constants';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedUser } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

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

    const token = await this.authService.signToken(user);
    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.configService.get('NODE_ENV') === 'production',
      maxAge: SESSION_DURATION_SECONDS * 1000,
      path: '/',
    });

    return {
      id: user.id,
      email: user.email,
      kycStatus: user.kycStatus,
      role: user.role,
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
        createdAt: true,
      },
    });
    return user;
  }
}
