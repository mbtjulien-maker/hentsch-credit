import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from './auth.service';

// Un client authentifié ne peut agir que sur ses propres données ; un compte ADMIN peut
// agir sur celles de n'importe quel client (back-office). Utilisé dans chaque contrôleur
// qui expose une ressource identifiée par un userId (chemin ou corps de requête) — la
// vérification d'authentification (JwtAuthGuard) prouve seulement "qui es-tu", celle-ci
// prouve "as-tu le droit d'agir sur CE compte".
export function assertSelfOrAdmin(
  currentUser: AuthenticatedUser,
  targetUserId: string,
): void {
  if (currentUser.role === 'ADMIN') return;
  if (currentUser.id === targetUserId) return;
  throw new ForbiddenException(
    "Vous n'avez pas accès aux données de ce compte",
  );
}
