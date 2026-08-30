import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import type { AuthenticatedUser } from '../../auth/auth.service';
import { PrismaService } from '../../prisma/prisma.service';

// Garde-fou CLAUDE.md §5 : bloque la génération d'une adresse de dépôt et l'octroi de
// crédit tant que le KYC n'est pas VERIFIED — jusqu'ici documenté mais jamais appliqué
// (aucune vérification de kycStatus dans le chemin credit-requests/wallet). S'appuie
// toujours après JwtAuthGuard : @UseGuards(JwtAuthGuard, KycVerifiedGuard).
//
// Relit `kycStatus` en base à chaque requête plutôt que de faire confiance à une valeur
// posée dans le JWT au login (AuthenticatedUser ne porte que id/role) : le statut KYC peut
// changer entre deux connexions (validation manuelle par un agent), un token déjà émis ne
// doit pas rester valide pour ces actions si le statut a depuis été rejeté.
@Injectable()
export class KycVerifiedGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;
    if (!user) {
      throw new ForbiddenException('Authentification requise');
    }

    const record = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { kycStatus: true },
    });

    if (!record || record.kycStatus !== 'VERIFIED') {
      throw new ForbiddenException(
        "Cette action nécessite une vérification d'identité (KYC) complétée",
      );
    }

    return true;
  }
}
