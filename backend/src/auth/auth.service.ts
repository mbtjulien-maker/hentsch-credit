import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { verifyPassword } from '../common/password.util';
import { PrismaService } from '../prisma/prisma.service';
import { PENDING_TWO_FACTOR_TOKEN_TTL_SECONDS } from './auth.constants';

// Contenu du JWT de session — volontairement minimal (id + rôle). Le rôle est figé au
// moment du login : un changement de rôle en base ne prend effet qu'à la prochaine
// connexion (compromis standard JWT, cf. AuthController.me qui relit la base pour
// l'écran de profil si une fraîcheur immédiate est nécessaire).
export interface JwtPayload {
  sub: string;
  role: User['role'];
}

export interface AuthenticatedUser {
  id: string;
  role: User['role'];
}

// Jeton intermédiaire (2FA en attente) — forme délibérément différente de JwtPayload
// (pas de `role`, présence de `pending2fa: true`) pour qu'un jeton de l'un ne puisse
// jamais être confondu avec l'autre même si le secret de signature est partagé.
export interface PendingTwoFactorPayload {
  sub: string;
  pending2fa: true;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // Retourne l'utilisateur si email + mot de passe correspondent, sinon null — jamais
  // d'exception ici (le contrôleur décide du message générique à renvoyer, pour ne pas
  // laisser deviner si c'est l'email ou le mot de passe qui est erroné).
  async validateCredentials(
    email: string,
    password: string,
  ): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return null;
    }
    const valid = await verifyPassword(password, user.passwordHash);
    return valid ? user : null;
  }

  async signToken(user: Pick<User, 'id' | 'role'>): Promise<string> {
    const payload: JwtPayload = { sub: user.id, role: user.role };
    return this.jwtService.signAsync(payload);
  }

  // cf. PendingTwoFactorPayload — jamais posé en cookie, retourné en clair dans le corps
  // de la réponse de POST /auth/login pour que le frontend le renvoie explicitement à
  // POST /auth/2fa/challenge (pas une session, juste une preuve que l'étape mot de passe
  // a déjà réussi).
  async signPendingTwoFactorToken(userId: string): Promise<string> {
    const payload: PendingTwoFactorPayload = { sub: userId, pending2fa: true };
    return this.jwtService.signAsync(payload, {
      expiresIn: PENDING_TWO_FACTOR_TOKEN_TTL_SECONDS,
    });
  }

  // Valide un jeton intermédiaire de 2FA et retourne l'id utilisateur qu'il porte. Rejette
  // tout jeton qui n'a pas exactement la forme attendue (pending2fa: true) — un jeton de
  // session normal ne doit jamais être accepté ici, même signé avec le même secret.
  async verifyPendingTwoFactorToken(token: string): Promise<string> {
    let payload: PendingTwoFactorPayload;
    try {
      payload =
        await this.jwtService.verifyAsync<PendingTwoFactorPayload>(token);
    } catch {
      throw new UnauthorizedException(
        'Jeton de vérification invalide ou expiré',
      );
    }
    if (!payload?.sub || payload.pending2fa !== true) {
      throw new UnauthorizedException(
        'Jeton de vérification invalide ou expiré',
      );
    }
    return payload.sub;
  }
}
