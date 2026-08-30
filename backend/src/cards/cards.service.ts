import { Injectable } from '@nestjs/common';
import { Card } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Lecture seule pour l'instant : l'émission réelle (Stripe Issuing / Marqeta) est l'Étape 4.
@Injectable()
export class CardsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string): Promise<Card[]> {
    return this.prisma.card.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
