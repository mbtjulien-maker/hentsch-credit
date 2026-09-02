import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  InvestmentBasket,
  InvestmentPosition,
  LedgerBalance,
  Prisma,
  StockBasketRun,
} from '@prisma/client';
import { toPositiveDecimal } from '../common/decimal.util';
import { NoActiveInvestmentException } from '../common/exceptions/financial.exceptions';
import { LedgerService } from '../ledger/ledger.service';
import { PrismaService } from '../prisma/prisma.service';
import { StockMarketDataService } from '../stock-market-data/stock-market-data.service';
import { STOCK_BASKET_DIVIDEND_YIELD_PCT } from '../stock-market-data/stock-market-data.constants';
import { TreasuryBotService } from '../treasury-bot/treasury-bot.service';

const DAYS_PER_YEAR = 365;

export interface WithdrawResult {
  balance: LedgerBalance;
  withdrawnAmount: Prisma.Decimal;
}

export interface AccrualResult {
  positionId: string;
  basket: InvestmentBasket;
  applied: boolean;
  yieldAmount: Prisma.Decimal;
}

// Investissement direct (cf. §2H CLAUDE.md) : le client place des fonds réels depuis son
// solde disponible dans l'un des deux paniers (RWA_STRATEGY ou STOCKS), ouvert aux
// comptes PARTICULIER et BUSINESS (contrairement au crédit direct, réservé BUSINESS) —
// aucun gage, aucun crédit émis, un placement à part entière avec un vrai risque de perte
// (le rendement quotidien peut être négatif). Un seul dépôt/retrait par passage : pas de
// retrait partiel à ce stade (cf. NoActiveInvestmentException), le client retire toujours
// l'intégralité de sa position sur un panier donné.
@Injectable()
export class InvestmentService {
  private readonly logger = new Logger(InvestmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
    private readonly treasuryBotService: TreasuryBotService,
    private readonly stockMarketDataService: StockMarketDataService,
  ) {}

  async deposit(
    userId: string,
    basket: InvestmentBasket,
    amount: Prisma.Decimal.Value,
  ): Promise<InvestmentPosition> {
    const value = toPositiveDecimal(amount);

    return this.prisma.$transaction(async (tx) => {
      await this.ledgerService.debitAvailableBalance(tx, userId, value);

      const existing = await tx.investmentPosition.findFirst({
        where: { userId, basket, status: 'ACTIVE' },
      });

      const position = existing
        ? await tx.investmentPosition.update({
            where: { id: existing.id },
            data: { principalAmount: { increment: value } },
          })
        : await tx.investmentPosition.create({
            data: { userId, basket, principalAmount: value, status: 'ACTIVE' },
          });

      await tx.transaction.create({
        data: {
          userId,
          type: 'INVESTMENT_DEPOSIT',
          amount: value,
          status: 'COMPLETED',
        },
      });

      return position;
    });
  }

  // Retrait complet : verse principalAmount + accruedYield sur le solde disponible et
  // clôture la position. Pas de retrait partiel à ce stade — un client qui veut réduire
  // son exposition retire tout puis, s'il le souhaite, redépose un montant moindre.
  async withdraw(
    userId: string,
    basket: InvestmentBasket,
  ): Promise<WithdrawResult> {
    return this.prisma.$transaction(async (tx) => {
      const position = await tx.investmentPosition.findFirst({
        where: { userId, basket, status: 'ACTIVE' },
      });
      if (!position) {
        throw new NoActiveInvestmentException(userId);
      }

      const withdrawnAmount = new Prisma.Decimal(position.principalAmount).plus(
        position.accruedYield,
      );

      const balance = await this.ledgerService.creditAvailableBalance(
        tx,
        userId,
        withdrawnAmount,
      );

      await tx.investmentPosition.update({
        where: { id: position.id },
        data: { status: 'CLOSED', closedAt: new Date() },
      });

      await tx.transaction.create({
        data: {
          userId,
          type: 'INVESTMENT_WITHDRAWAL',
          amount: withdrawnAmount,
          status: 'COMPLETED',
        },
      });

      return { balance, withdrawnAmount };
    });
  }

  async getActivePositions(userId: string): Promise<InvestmentPosition[]> {
    return this.prisma.investmentPosition.findMany({
      where: { userId, status: 'ACTIVE' },
    });
  }

  async listForUser(userId: string): Promise<InvestmentPosition[]> {
    return this.prisma.investmentPosition.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAll(): Promise<InvestmentPosition[]> {
    return this.prisma.investmentPosition.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  // Historique réel du rendement quotidien du panier STOCKS (cf. StockBasketRun) — pendant
  // de TreasuryBotService.getHistory() pour la stratégie RWA. Consommé par
  // GET /investment/history pour tracer une tendance (cf. MiniSparkline côté frontend) à
  // partir de vraies valeurs déjà persistées jour après jour, jamais recalculées à la volée.
  async getStockBasketHistory(limit = 30): Promise<StockBasketRun[]> {
    const rows = await this.prisma.stockBasketRun.findMany({
      orderBy: { runDate: 'desc' },
      take: limit,
    });
    return rows.reverse();
  }

  // Tourne quotidiennement, décalé après le bot de trésorerie (3h) et la génération des
  // rendements de gage (1h) — reste appelable directement (déclenchement manuel
  // back-office, tests) indépendamment du calendrier.
  @Cron('0 15 3 * * *')
  async runDailyAccrual(now: Date = new Date()): Promise<AccrualResult[]> {
    const runDate = truncateToUtcDate(now);

    // Réutilise TreasuryBotService.runDailySimulation() plutôt que de relire une ligne
    // déjà écrite par son propre cron (@Cron(EVERY_DAY_AT_3AM)) : upsert idempotent par
    // date, donc l'appeler ici garantit que la ligne du jour existe quel que soit l'ordre
    // réel d'exécution des deux crons, sans dupliquer le calcul des 3 piliers.
    const rwaRun = await this.treasuryBotService.runDailySimulation(now);
    const stockRun = await this.recordStockBasketRun(runDate);

    const positions = await this.prisma.investmentPosition.findMany({
      where: { status: 'ACTIVE' },
    });

    const results: AccrualResult[] = [];
    for (const position of positions) {
      const dailyReturnPct =
        position.basket === 'RWA_STRATEGY'
          ? rwaRun.blendedReturnPct
          : stockRun.dailyReturnPct;
      // Une position en échec ne doit jamais bloquer l'accrual des autres (même
      // discipline que CollateralYieldService.runDailyAccrual).
      try {
        results.push(
          await this.accrueYieldForPosition(position, dailyReturnPct),
        );
      } catch (error) {
        this.logger.error(
          `Échec de l'accrual d'investissement pour la position ${position.id}, ignorée pour ce passage`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
    return results;
  }

  async accrueYieldForPosition(
    position: InvestmentPosition,
    dailyReturnPct: Prisma.Decimal.Value,
  ): Promise<AccrualResult> {
    const currentValue = new Prisma.Decimal(position.principalAmount).plus(
      position.accruedYield,
    );
    // Composé quotidien — peut être négatif un jour de marché défavorable (contrairement
    // au rendement indexé du gage, §2A, qui ne rembourse jamais que sur plus-value) :
    // c'est un vrai placement, avec un vrai risque de perte sur le capital.
    const dailyYield = currentValue.times(dailyReturnPct).dividedBy(100);

    await this.prisma.investmentPosition.update({
      where: { id: position.id },
      data: { accruedYield: { increment: dailyYield } },
    });

    if (!dailyYield.isZero()) {
      await this.prisma.transaction.create({
        data: {
          userId: position.userId,
          type: 'INVESTMENT_YIELD_ACCRUAL',
          amount: dailyYield,
          status: 'COMPLETED',
        },
      });
    }

    return {
      positionId: position.id,
      basket: position.basket,
      applied: true,
      yieldAmount: dailyYield,
    };
  }

  // Calcule et journalise (upsert par jour, jamais recalculé à la relecture) le
  // rendement quotidien réel du panier STOCKS — pendant de
  // TreasuryBotService.recordRun, en plus simple (pas de ventilation par pilier ni de NAV
  // cumulée, cf. schema.prisma). Signal indisponible (clé Finnhub absente ou panne
  // totale) -> rendement neutre (0) pour ce jour plutôt qu'un accrual bloqué : dégradation
  // gracieuse cohérente avec le reste du produit, mais jamais un signal de marché fabriqué.
  private async recordStockBasketRun(runDate: Date): Promise<StockBasketRun> {
    const existing = await this.prisma.stockBasketRun.findUnique({
      where: { runDate },
    });
    if (existing) {
      return existing;
    }

    const marketSignalPct =
      await this.stockMarketDataService.getBasketMarketSignal();
    if (marketSignalPct === null) {
      this.logger.warn(
        `Signal de marché actions indisponible pour ${runDate.toISOString()} — rendement neutre appliqué au panier STOCKS ce jour-là.`,
      );
    }

    const dividendBaselinePerDay =
      STOCK_BASKET_DIVIDEND_YIELD_PCT.dividedBy(DAYS_PER_YEAR);
    const dailyReturnPct = dividendBaselinePerDay.plus(marketSignalPct ?? 0);

    return this.prisma.stockBasketRun.create({
      data: {
        runDate,
        marketSignalPct: new Prisma.Decimal(marketSignalPct ?? 0),
        dailyReturnPct,
      },
    });
  }
}

function truncateToUtcDate(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}
