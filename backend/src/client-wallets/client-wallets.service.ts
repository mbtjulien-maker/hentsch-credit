import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ClientManagedWallet } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Provisionnement à la volée du wallet "personnel" interne d'un client (cf.
// ClientManagedWallet) — jamais créé en masse ni à l'inscription, seulement au premier
// besoin réel (consultation du profil, ou première déclaration de dépôt, cf.
// DepositIntentsService.declare).
@Injectable()
export class ClientWalletsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(userId: string): Promise<ClientManagedWallet> {
    const existing = await this.prisma.clientManagedWallet.findUnique({
      where: { userId },
    });
    if (existing) {
      return existing;
    }

    // Référence façon numéro de compte interne — dérivée d'un UUID aléatoire, pas de
    // l'id utilisateur (pour ne jamais exposer/dériver l'UUID technique du User).
    const reference = `CW-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
    return this.prisma.clientManagedWallet.create({
      data: { userId, reference },
    });
  }
}
