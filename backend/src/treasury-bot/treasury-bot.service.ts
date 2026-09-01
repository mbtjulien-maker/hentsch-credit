import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma, TreasuryBotRun } from '@prisma/client';
import { MarketDataService } from '../market-data/market-data.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  NOTIONAL_CAPITAL_USD,
  PILLAR_MARKET_SENSITIVITY,
  PILLAR_TARGET_APY_PCT,
  TREASURY_BOT_BASKET,
} from './treasury-bot.constants';

const DAYS_PER_YEAR = 365;

// Bot de trésorerie en SIMULATION (paper trading) — aucun ordre réel n'est passé, aucun
// fonds ne bouge, aucune connexion à un exchange ou wallet réel. Simule les 3 piliers de
// la feuille de route "Stratégie d'Investissement & Rendements RWA Métaux" (cf.
// components/marketing/rwa-strategy-section.tsx) à partir de vraies données de marché
// (variation quotidienne moyenne du panier TREASURY_BOT_BASKET), pas d'un tirage
// aléatoire — mais le résultat reste un calcul de démonstration : cette simulation n'a
// aucun effet sur le ledger, le crédit ou tout compte client (cf. TreasuryBotRun,
// entièrement séparée du reste du schéma).
@Injectable()
export class TreasuryBotService {
  private readonly logger = new Logger(TreasuryBotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly marketDataService: MarketDataService,
  ) {}

  // Tourne quotidiennement en production (décalé des autres crons crédit) ; reste
  // appelable directement (déclenchement manuel back-office, tests).
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async runDailySimulation(now: Date = new Date()): Promise<TreasuryBotRun> {
    const runDate = truncateToUtcDate(now);
    const overview = await this.marketDataService.getMarketOverview();
    const marketSignalPct = this.computeMarketSignal(overview);

    return this.recordRun(runDate, marketSignalPct);
  }

  // Reconstitue un historique de simulation sur `days` jours en s'appuyant sur les
  // VRAIES variations de marché passées (cf. MarketDataService.getDailyReturnSeries) —
  // pas des données fabriquées — pour que le tableau de bord admin ait un contenu
  // significatif dès l'activation du bot, sans attendre `days` exécutions du cron
  // quotidien. N'écrase jamais une ligne déjà existante (upsert côté recordRun, mais on
  // s'arrête à la première date déjà connue en remontant depuis aujourd'hui) : un
  // backfill répété ne rejoue pas une simulation déjà réalisée en temps réel.
  async backfillHistory(days = 90): Promise<number> {
    const series = (
      await Promise.all(
        TREASURY_BOT_BASKET.map((currency) =>
          this.marketDataService.getDailyReturnSeries(currency),
        ),
      )
    ).filter((s) => s.length > 0);

    if (series.length === 0) {
      this.logger.warn(
        'Backfill du bot de trésorerie annulé : aucune donnée historique disponible.',
      );
      return 0;
    }

    // Chaque série est indexée depuis SON PROPRE début (elles peuvent différer légèrement
    // en longueur selon la réponse de CoinGecko) — on lit toujours "i jours avant
    // aujourd'hui" en comptant depuis la fin de chaque série, jamais depuis un index absolu
    // partagé, pour rester aligné même si les longueurs diffèrent.
    const availableDays = Math.min(days, ...series.map((s) => s.length));
    if (availableDays <= 0) {
      return 0;
    }

    const today = truncateToUtcDate(new Date());
    let created = 0;
    // Du plus ancien au plus récent, pour que la composition du capital (cumulativeNavUsd)
    // s'enchaîne dans le bon ordre (cf. recordRun, qui se base sur la ligne précédente).
    for (let i = availableDays; i >= 1; i--) {
      const runDate = new Date(today);
      runDate.setUTCDate(runDate.getUTCDate() - i);

      const existing = await this.prisma.treasuryBotRun.findUnique({
        where: { runDate },
      });
      if (existing) continue;

      const dayChanges = series.map((s) => s[s.length - i]);
      const marketSignalPct = dayChanges.length
        ? dayChanges.reduce((sum, v) => sum + v, 0) / dayChanges.length
        : 0;

      await this.recordRun(runDate, marketSignalPct);
      created++;
    }

    return created;
  }

  async getHistory(limit = 90): Promise<TreasuryBotRun[]> {
    const rows = await this.prisma.treasuryBotRun.findMany({
      orderBy: { runDate: 'desc' },
      take: limit,
    });
    return rows.reverse();
  }

  private computeMarketSignal(
    overview: { currency: string | null; change24hPct: number | null }[],
  ): number {
    const changes = overview
      .filter(
        (e): e is { currency: string; change24hPct: number } =>
          e.currency !== null &&
          TREASURY_BOT_BASKET.includes(e.currency as never) &&
          e.change24hPct !== null,
      )
      .map((e) => e.change24hPct);
    // Aucune donnée disponible -> signal neutre (0), jamais une erreur bloquante : une
    // simulation de démonstration se dégrade proprement plutôt que d'interrompre le cron.
    return changes.length
      ? changes.reduce((sum, v) => sum + v, 0) / changes.length
      : 0;
  }

  private computePillarReturnPct(
    targetApyPct: Prisma.Decimal,
    sensitivity: Prisma.Decimal,
    marketSignalPct: number,
  ): Prisma.Decimal {
    const baselinePerDay = targetApyPct.dividedBy(DAYS_PER_YEAR);
    const marketContribution = new Prisma.Decimal(marketSignalPct).times(
      sensitivity,
    );
    return baselinePerDay.plus(marketContribution);
  }

  private async recordRun(
    runDate: Date,
    marketSignalPct: number,
  ): Promise<TreasuryBotRun> {
    const pillarA = this.computePillarReturnPct(
      PILLAR_TARGET_APY_PCT.A,
      PILLAR_MARKET_SENSITIVITY.A,
      marketSignalPct,
    );
    const pillarB = this.computePillarReturnPct(
      PILLAR_TARGET_APY_PCT.B,
      PILLAR_MARKET_SENSITIVITY.B,
      marketSignalPct,
    );
    const pillarC = this.computePillarReturnPct(
      PILLAR_TARGET_APY_PCT.C,
      PILLAR_MARKET_SENSITIVITY.C,
      marketSignalPct,
    );
    // Moyenne simple (pondération égale) des 3 piliers — choix documenté, pas une
    // allocation réelle de capital entre piliers (qui varierait dans une vraie stratégie).
    const blended = pillarA.plus(pillarB).plus(pillarC).dividedBy(3);

    const previousRun = await this.prisma.treasuryBotRun.findFirst({
      where: { runDate: { lt: runDate } },
      orderBy: { runDate: 'desc' },
    });
    const previousNav = previousRun
      ? new Prisma.Decimal(previousRun.cumulativeNavUsd)
      : NOTIONAL_CAPITAL_USD;
    const dailyPnlUsd = previousNav.times(blended).dividedBy(100);
    const cumulativeNavUsd = previousNav.plus(dailyPnlUsd);

    return this.prisma.treasuryBotRun.upsert({
      where: { runDate },
      create: {
        runDate,
        pillarAReturnPct: pillarA,
        pillarBReturnPct: pillarB,
        pillarCReturnPct: pillarC,
        blendedReturnPct: blended,
        marketSignalPct: new Prisma.Decimal(marketSignalPct),
        notionalCapitalUsd: NOTIONAL_CAPITAL_USD,
        dailyPnlUsd,
        cumulativeNavUsd,
      },
      update: {
        pillarAReturnPct: pillarA,
        pillarBReturnPct: pillarB,
        pillarCReturnPct: pillarC,
        blendedReturnPct: blended,
        marketSignalPct: new Prisma.Decimal(marketSignalPct),
        dailyPnlUsd,
        cumulativeNavUsd,
      },
    });
  }
}

function truncateToUtcDate(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}
