import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildStatementData,
  STATEMENT_TRANSACTION_TYPES,
  type StatementLocale,
  type StatementPeriod,
  type StatementPositionRow,
} from './investment-statement';
import { renderStatementPdf } from './investment-statement-pdf';

// Relevé d'opérations d'investissement (PDF) — synthèse des placements, des rendements et
// des opérations d'une période, reconstitué depuis le même journal que le graphique de
// performance de l'espace Investissement (cf. buildInvestmentPerformance).
@Injectable()
export class InvestmentStatementService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(
    userId: string,
    periodMonths: StatementPeriod,
    locale: StatementLocale,
    now: Date = new Date(),
  ): Promise<{ filename: string; pdf: Uint8Array }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, clientProfile: { select: { firstName: true, lastName: true } } },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');

    const [txs, baskets, plans] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId, status: 'COMPLETED', type: { in: STATEMENT_TRANSACTION_TYPES } },
        select: { type: true, amount: true, createdAt: true, currency: true, creditTarget: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.investmentPosition.findMany({ where: { userId } }),
      this.prisma.fixedTermPosition.findMany({ where: { userId } }),
    ]);

    const positions: StatementPositionRow[] = [
      ...baskets.map((p) => ({
        kind: 'BASKET' as const,
        key: p.basket,
        status: p.status,
        openedAt: p.createdAt,
        closedAt: p.closedAt,
        maturityDate: null,
        principal: p.principalAmount,
        accruedYield: p.accruedYield,
      })),
      ...plans.map((p) => ({
        kind: 'PLAN' as const,
        key: p.plan,
        status: p.status,
        openedAt: p.createdAt,
        closedAt: p.maturedAt,
        maturityDate: p.maturityDate,
        principal: p.principalAmount,
        accruedYield: p.accruedYield,
      })),
    ];

    const data = buildStatementData(txs, positions, periodMonths, now);
    const fullName = [user.clientProfile?.firstName, user.clientProfile?.lastName]
      .filter(Boolean)
      .join(' ');
    const pdf = await renderStatementPdf({
      data,
      locale,
      clientName: fullName || user.email,
      email: user.email,
      accountRef: `HV-${user.id.slice(0, 8).toUpperCase()}`,
      issuedAt: now,
    });
    const stamp = now.toISOString().slice(0, 10);
    return { filename: `releve-investissement-${stamp}.pdf`, pdf };
  }
}
