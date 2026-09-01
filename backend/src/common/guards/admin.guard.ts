import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import type { AuthenticatedUser } from '../../auth/auth.service';
import { PrismaService } from '../../prisma/prisma.service';

// Un compte ADMIN sans 2FA activée doit malgré tout pouvoir atteindre ces trois routes
// pour l'activer — sinon aucun compte ADMIN nouvellement créé ne pourrait jamais franchir
// sa propre exigence (poule et œuf). Ce sont les seules routes de auth.controller.ts
// gardées par AdminGuard ; toutes les autres exigent déjà une session (JwtAuthGuard).
const TWO_FACTOR_BOOTSTRAP_PATHS = new Set([
  '/auth/2fa/setup',
  '/auth/2fa/enable',
  '/auth/2fa/disable',
]);

// Garde de rôle — s'appuie sur req.user posé par JwtAuthGuard (session vérifiée), donc
// TOUJOURS empilé après lui : @UseGuards(JwtAuthGuard, AdminGuard). Vérifie aussi que la
// 2FA est activée (relue en base à chaque requête, jamais depuis le JWT qui ne porte que
// id/role, cf. JwtPayload) : un mot de passe seul ne suffit plus pour aucune action
// back-office, cf. journal des modifications CLAUDE.md.
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;
    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Cette action est réservée aux comptes back-office (rôle ADMIN)',
      );
    }

    if (TWO_FACTOR_BOOTSTRAP_PATHS.has(request.path)) {
      return true;
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { twoFactorEnabled: true },
    });
    if (!dbUser?.twoFactorEnabled) {
      throw new ForbiddenException(
        'La vérification en deux étapes (2FA) est obligatoire pour tout accès back-office. Activez-la via POST /auth/2fa/setup avant de continuer.',
      );
    }

    return true;
  }
}
