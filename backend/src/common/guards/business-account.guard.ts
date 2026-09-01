import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import type { AuthenticatedUser } from '../../auth/auth.service';
import { PrismaService } from '../../prisma/prisma.service';

// Réserve une route aux comptes BUSINESS (cf. AccountType, CLAUDE.md §2) — le crédit
// direct finance des projets professionnels, jamais un compte PARTICULIER. Même
// construction que KycVerifiedGuard : relit `accountType` en base à chaque requête
// plutôt que de faire confiance à une valeur portée par le JWT (AuthenticatedUser ne
// porte que id/role), et s'utilise toujours après JwtAuthGuard :
// @UseGuards(JwtAuthGuard, BusinessAccountGuard).
@Injectable()
export class BusinessAccountGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;
    if (!user) {
      throw new ForbiddenException('Authentification requise');
    }

    const record = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { accountType: true },
    });

    if (!record || record.accountType !== 'BUSINESS') {
      throw new ForbiddenException(
        'Cette action est réservée aux comptes business',
      );
    }

    return true;
  }
}
