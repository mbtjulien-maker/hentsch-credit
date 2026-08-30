import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';
import type { AuthenticatedUser, JwtPayload } from '../auth.service';
import { SESSION_COOKIE_NAME } from '../auth.constants';

// Extrait le JWT depuis le cookie httpOnly de session — pas depuis un header
// Authorization (le token n'est jamais exposé à du JavaScript côté frontend, seul le
// navigateur le renvoie automatiquement, cf. AuthController.login).
function extractFromCookie(req: Request): string | null {
  return (req.cookies?.[SESSION_COOKIE_NAME] as string | undefined) ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET manquant — voir .env.example');
    }
    super({
      jwtFromRequest: extractFromCookie,
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  // Le retour de validate() devient req.user — on ne fait pas de lecture base ici (le
  // rôle/id du JWT signé suffit pour l'autorisation courante, cf. AuthService.JwtPayload).
  validate(payload: JwtPayload): AuthenticatedUser {
    if (!payload?.sub) {
      throw new UnauthorizedException();
    }
    return { id: payload.sub, role: payload.role };
  }
}
