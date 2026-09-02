import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  FixedTermPlanId,
  FixedTermPlanRun,
  FixedTermPosition,
  LedgerBalance,
  Prisma,
} from '@prisma/client';
import { toPositiveDecimal } from '../common/decimal.util';
import { LedgerService } from '../ledger/ledger.service';
import { PrismaService } from '../prisma/prisma.service';
import { StockMarketDataService } from '../stock-market-data/stock-market-data.service';
import { TreasuryBotService } from '../treasury-bot/treasury-bot.service';
import { INDICATIVE_ANNUAL_YIELD_PCT } from './investment.constants';
import {
  FIXED_TERM_PLAN_IDS,
  FIXED_TERM_PLANS,
  TICKER_DIVIDEND_YIELD_PCT,
} from './fixed-term-plan.constants';

const DAYS_PER_YEAR = 365;
const MONTHS_PER_YEAR = 12;

// Vue calculée d'un plan à échéance fixe (cf. FIXED_TERM_PLANS, GET
// /investment/fixed-term-plans) — l'objectif affiché (`annualizedPct`) est le même calcul
// que celui réellement appliqué à l'accrual (cf. recordFixedTermPlanRun), jamais un
// chiffre fourni tel quel par le client.
export interface FixedTermPlanView {
  id: FixedTermPlanId;
  horizonMonths: number;
  riskScore: number;
  tickers: string[];
  includesRwa: boolean;
  annualizedPct: string;
  // Le même objectif, composé sur la durée réelle du plan (horizonMonths) — ce que le
  // client verrait affiché sur la carte du plan ("X% sur 3 mois", pas seulement "/an").
  periodPct: string;
  // Signal de marché réel du jour pour les composants du plan (Finnhub pour les tickers,
  // dernier TreasuryBotRun.blendedReturnPct pour la composante RWA) — `null` si aucun
  // composant n'a pu être interrogé, jamais un chiffre fabriqué.
  latestSignalPct: string | null;
}

export interface FixedTermAccrualResult {
  positionId: string;
  plan: FixedTermPlanId;
  applied: boolean;
  yieldAmount: Prisma.Decimal;
}

export interface FixedTermMaturityResult {
  positionId: string;
  userId: string;
  plan: FixedTermPlanId;
  payoutAmount: Prisma.Decimal;
  balance: LedgerBalance;
}

// Plans à échéance fixe (cf. §2H CLAUDE.md entrée #30) — DEUXIÈME mode de placement,
// distinct des 6 paniers perpétuels (InvestmentService) : chaque dépôt crée sa propre
// position, verrouillée jusqu'à sa propre échéance (3/6/12 mois selon le plan) — aucun
// retrait anticipé (choix produit explicite, cf. journal), contrairement au retrait libre
// des paniers perpétuels. Le rendement quotidien composé peut être négatif (vrai risque
// de perte, même principe que les paniers) ; à l'échéance, principal + rendement accru
// sont automatiquement reversés sur le solde disponible par le cron quotidien, sans geste
// du client.
@Injectable()
export class FixedTermPlanService {
  private readonly logger = new Logger(FixedTermPlanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
    private readonly treasuryBotService: TreasuryBotService,
    private readonly stockMarketDataService: StockMarketDataService,
  ) {}

  // Moyenne des rendements de dividende réels des composants du plan (+ l'objectif
  // indicatif RWA le cas échéant) — la SEULE source de l'objectif annualisé, partagée
  // entre l'affichage (getFixedTermPlans) et l'accrual réellement appliqué
  // (recordFixedTermPlanRun) : les deux ne doivent jamais diverger.
  private computeAnnualPct(planId: FixedTermPlanId): Prisma.Decimal {
    const plan = FIXED_TERM_PLANS[planId];
    const componentYields = [...plan.tickers].map(
      (ticker) => TICKER_DIVIDEND_YIELD_PCT[ticker],
    );
    if (plan.includesRwa) {
      componentYields.push(INDICATIVE_ANNUAL_YIELD_PCT.RWA_STRATEGY);
    }
    return componentYields
      .reduce((sum, y) => sum.plus(y), new Prisma.Decimal(0))
      .dividedBy(componentYields.length);
  }

  async getFixedTermPlans(): Promise<FixedTermPlanView[]> {
    const [latestRwaRun] = await this.treasuryBotService.getHistory(1);
    const rwaSignal = latestRwaRun
      ? Number(latestRwaRun.blendedReturnPct)
      : null;

    return Promise.all(
      FIXED_TERM_PLAN_IDS.map(async (id) => {
        const plan = FIXED_TERM_PLANS[id];
        const tickers: string[] = [...plan.tickers];

        const annualPct = this.computeAnnualPct(id);
        const periodPct =
          (Math.pow(
            1 + annualPct.toNumber() / 100,
            plan.horizonMonths / MONTHS_PER_YEAR,
          ) -
            1) *
          100;

        const stockSignal =
          tickers.length > 0
            ? await this.stockMarketDataService.getSignalForTickers(tickers)
            : null;
        const signals = [
          stockSignal,
          plan.includesRwa ? rwaSignal : null,
        ].filter((s): s is number => s !== null);
        const latestSignalPct =
          signals.length > 0
            ? signals.reduce((sum, s) => sum + s, 0) / signals.length
            : null;

        return {
          id,
          horizonMonths: plan.horizonMonths,
          riskScore: plan.riskScore,
          tickers,
          includesRwa: plan.includesRwa,
          annualizedPct: annualPct.toDecimalPlaces(2).toString(),
          periodPct: periodPct.toFixed(2),
          latestSignalPct:
            latestSignalPct != null ? latestSignalPct.toFixed(4) : null,
        };
      }),
    );
  }

  // Bloqué jusqu'à l'échéance dès le dépôt (§6 entrée #30) : contrairement à
  // InvestmentService.deposit, jamais cumulé à une position existante — chaque dépôt a sa
  // propre date de maturité, calculée à partir de MAINTENANT (pas de la date d'un dépôt
  // antérieur sur le même plan).
  async deposit(
    userId: string,
    plan: FixedTermPlanId,
    amount: Prisma.Decimal.Value,
  ): Promise<FixedTermPosition> {
    const value = toPositiveDecimal(amount);
    const maturityDate = new Date();
    maturityDate.setMonth(
      maturityDate.getMonth() + FIXED_TERM_PLANS[plan].horizonMonths,
    );

    return this.prisma.$transaction(async (tx) => {
      await this.ledgerService.debitAvailableBalance(tx, userId, value);

      const position = await tx.fixedTermPosition.create({
        data: { userId, plan, principalAmount: value, maturityDate },
      });

      await tx.transaction.create({
        data: {
          userId,
          type: 'FIXED_TERM_DEPOSIT',
          amount: value,
          status: 'COMPLETED',
        },
      });

      return position;
    });
  }

  async listForUser(userId: string): Promise<FixedTermPosition[]> {
    return this.prisma.fixedTermPosition.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAll(): Promise<FixedTermPosition[]> {
    return this.prisma.fixedTermPosition.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  // Tourne quotidiennement, décalé après l'accrual des paniers perpétuels (3h15) — reste
  // appelable directement (déclenchement manuel back-office, tests) indépendamment du
  // calendrier. Accrue d'abord toutes les positions ACTIVE (y compris celles qui
  // atteignent leur échéance aujourd'hui — le jour de maturité compte plein), puis règle
  // les positions arrivées à échéance.
  @Cron('0 30 3 * * *')
  async runDailyAccrual(
    now: Date = new Date(),
  ): Promise<FixedTermAccrualResult[]> {
    const runDate = truncateToUtcDate(now);

    // Réutilise TreasuryBotService.runDailySimulation() (upsert idempotent) plutôt que de
    // dépendre de l'ordre réel des crons — même principe que InvestmentService.
    const rwaRun = await this.treasuryBotService.runDailySimulation(now);

    const planRunsById = new Map<FixedTermPlanId, FixedTermPlanRun>();
    for (const planId of FIXED_TERM_PLAN_IDS) {
      planRunsById.set(
        planId,
        await this.recordFixedTermPlanRun(
          runDate,
          planId,
          rwaRun.blendedReturnPct,
        ),
      );
    }

    const positions = await this.prisma.fixedTermPosition.findMany({
      where: { status: 'ACTIVE' },
    });

    const results: FixedTermAccrualResult[] = [];
    for (const position of positions) {
      const planRun = planRunsById.get(position.plan)!;
      try {
        results.push(
          await this.accrueFixedTermPosition(position, planRun.dailyReturnPct),
        );
      } catch (error) {
        this.logger.error(
          `Échec de l'accrual à échéance fixe pour la position ${position.id}, ignorée pour ce passage`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    await this.settleMaturedPositions(now);

    return results;
  }

  async accrueFixedTermPosition(
    position: FixedTermPosition,
    dailyReturnPct: Prisma.Decimal.Value,
  ): Promise<FixedTermAccrualResult> {
    const currentValue = new Prisma.Decimal(position.principalAmount).plus(
      position.accruedYield,
    );
    // Composé quotidien — peut être négatif un jour de marché défavorable, même vrai
    // risque de perte que les paniers perpétuels (cf. InvestmentService
    // .accrueYieldForPosition) : le rendement affiché n'est jamais garanti, ici non plus.
    const dailyYield = currentValue.times(dailyReturnPct).dividedBy(100);

    await this.prisma.fixedTermPosition.update({
      where: { id: position.id },
      data: { accruedYield: { increment: dailyYield } },
    });

    if (!dailyYield.isZero()) {
      await this.prisma.transaction.create({
        data: {
          userId: position.userId,
          type: 'FIXED_TERM_YIELD_ACCRUAL',
          amount: dailyYield,
          status: 'COMPLETED',
        },
      });
    }

    return {
      positionId: position.id,
      plan: position.plan,
      applied: true,
      yieldAmount: dailyYield,
    };
  }

  // Règlement automatique à l'échéance — jamais un geste du client (contrairement au
  // retrait des paniers perpétuels) : dès que `maturityDate` est atteinte, la position
  // suivante du cron la solde sans attendre d'action. Une position en échec ne bloque pas
  // les autres (même discipline que runDailyAccrual).
  async settleMaturedPositions(
    now: Date = new Date(),
  ): Promise<FixedTermMaturityResult[]> {
    const matured = await this.prisma.fixedTermPosition.findMany({
      where: { status: 'ACTIVE', maturityDate: { lte: now } },
    });

    const results: FixedTermMaturityResult[] = [];
    for (const position of matured) {
      try {
        results.push(await this.settlePosition(position));
      } catch (error) {
        this.logger.error(
          `Échec du règlement à l'échéance de la position ${position.id}, ignorée pour ce passage`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
    return results;
  }

  private async settlePosition(
    position: FixedTermPosition,
  ): Promise<FixedTermMaturityResult> {
    return this.prisma.$transaction(async (tx) => {
      // Plancher à 0 : un règlement automatique sans validation humaine ne doit jamais
      // débiter davantage le compte (cf. LedgerService.creditAvailableBalance, qui
      // incrémente tel quel — un montant négatif déciderait silencieusement). Un
      // enchaînement de très mauvais jours pourrait en théorie faire tomber
      // principal + rendement accru sous zéro ; dans ce cas, le client ne récupère rien
      // plutôt que d'être débité davantage.
      const rawPayout = new Prisma.Decimal(position.principalAmount).plus(
        position.accruedYield,
      );
      const payoutAmount = Prisma.Decimal.max(rawPayout, 0);

      const balance = await this.ledgerService.creditAvailableBalance(
        tx,
        position.userId,
        payoutAmount,
      );

      await tx.fixedTermPosition.update({
        where: { id: position.id },
        data: { status: 'MATURED', maturedAt: new Date() },
      });

      await tx.transaction.create({
        data: {
          userId: position.userId,
          type: 'FIXED_TERM_MATURITY_PAYOUT',
          amount: payoutAmount,
          status: 'COMPLETED',
        },
      });

      return {
        positionId: position.id,
        userId: position.userId,
        plan: position.plan,
        payoutAmount,
        balance,
      };
    });
  }

  // Calcule et journalise (upsert par (jour, plan), jamais recalculé à la relecture) le
  // rendement quotidien réel d'un plan — pendant de
  // InvestmentService.recordStockBasketRun. Signal indisponible -> rendement neutre (0)
  // pour ce jour plutôt qu'un accrual bloqué, mais jamais un signal fabriqué.
  private async recordFixedTermPlanRun(
    runDate: Date,
    planId: FixedTermPlanId,
    rwaBlendedReturnPct: Prisma.Decimal,
  ): Promise<FixedTermPlanRun> {
    const existing = await this.prisma.fixedTermPlanRun.findUnique({
      where: { runDate_plan: { runDate, plan: planId } },
    });
    if (existing) {
      return existing;
    }

    const plan = FIXED_TERM_PLANS[planId];
    const tickers = [...plan.tickers];

    const stockSignal =
      tickers.length > 0
        ? await this.stockMarketDataService.getSignalForTickers(tickers)
        : null;
    const signals = [
      stockSignal,
      plan.includesRwa ? Number(rwaBlendedReturnPct) : null,
    ].filter((s): s is number => s !== null);
    if (signals.length === 0) {
      this.logger.warn(
        `Signal de marché indisponible pour le plan ${planId} le ${runDate.toISOString()} — rendement neutre appliqué ce jour-là.`,
      );
    }
    const marketSignalPct =
      signals.length > 0
        ? signals.reduce((sum, s) => sum + s, 0) / signals.length
        : 0;

    const dividendBaselinePerDay =
      this.computeAnnualPct(planId).dividedBy(DAYS_PER_YEAR);
    const dailyReturnPct = dividendBaselinePerDay.plus(marketSignalPct);

    return this.prisma.fixedTermPlanRun.create({
      data: {
        runDate,
        plan: planId,
        marketSignalPct: new Prisma.Decimal(marketSignalPct),
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
