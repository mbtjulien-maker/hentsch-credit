import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import type { AuthenticatedUser } from '../../auth/auth.service';

// Garde de rôle — s'appuie sur req.user posé par JwtAuthGuard (session vérifiée), donc
// TOUJOURS empilé après lui : @UseGuards(JwtAuthGuard, AdminGuard). Ne fait plus sa
// propre vérification d'identité (c'était l'ancien modèle par en-tête x-user-id, non
// authentifié) — ici on ne fait que vérifier le rôle d'une identité déjà prouvée.
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;
    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Cette action est réservée aux comptes back-office (rôle ADMIN)',
      );
    }
    return true;
  }
}
