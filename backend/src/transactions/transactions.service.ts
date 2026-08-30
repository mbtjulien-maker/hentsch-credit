import { Injectable } from '@nestjs/common';
import { Transaction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
