import { Injectable, NotFoundException } from '@nestjs/common';
import { MarketDataService } from '../market-data/market-data.service';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly marketDataService: MarketDataService,
  ) {}

  async generate(
    userId: string,
    periodMonths: StatementPeriod,
    locale: StatementLocale,
    currencyOverride?: 'USD' | 'EUR',
    now: Date = new Date(),
  ): Promise<{ filename: string; pdf: Uint8Array }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayCurrency: true,
        clientProfile: { select: { firstName: true, lastName: true } },
        addresses: {
          where: { label: 'DOMICILE' },
          select: {
            street: true,
            addressLine2: true,
            postalCode: true,
            city: true,
            country: true,
          },
          take: 1,
        },
      },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');

    const [txs, baskets, plans] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          type: { in: STATEMENT_TRANSACTION_TYPES },
        },
        select: {
          id: true,
          type: true,
          amount: true,
          createdAt: true,
          currency: true,
          creditTarget: true,
          referenceTx: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.investmentPosition.findMany({ where: { userId } }),
      this.prisma.fixedTermPosition.findMany({ where: { userId } }),
    ]);

    const positions: StatementPositionRow[] = [
      ...baskets.map((p) => ({
        id: p.id,
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
        id: p.id,
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
    const fullName = [
      user.clientProfile?.firstName,
      user.clientProfile?.lastName,
    ]
      .filter(Boolean)
      .join(' ');
    // Monnaie du relevé : celle demandée, sinon celle choisie par le client pour son compte.
    const currency = currencyOverride ?? user.displayCurrency;
    const eurPerUsd =
      currency === 'EUR'
        ? (await this.marketDataService.getEurPerUsd()).toNumber()
        : 1;
    const addr = user.addresses[0];
    const clientAddressLines = addr
      ? [
          addr.street,
          addr.addressLine2,
          `${addr.postalCode} ${addr.city}`.trim(),
          addr.country,
        ].filter((l): l is string => !!l)
      : [];
    const pdf = await renderStatementPdf({
      data,
      locale,
      clientName: fullName || user.email,
      clientAddressLines,
      currency,
      eurPerUsd,
      email: user.email,
      accountRef: `HV-${user.id.slice(0, 8).toUpperCase()}`,
      issuedAt: now,
    });
    const stamp = now.toISOString().slice(0, 10);
    return { filename: `releve-investissement-${stamp}.pdf`, pdf };
  }
}
