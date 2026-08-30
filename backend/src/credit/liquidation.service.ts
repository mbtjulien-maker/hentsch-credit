import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CreditPosition, Prisma } from '@prisma/client';
import { LedgerService } from '../ledger/ledger.service';
import { YIELD_ELIGIBLE_CURRENCIES } from '../market-data/market-data.constants';
import { MarketDataService } from '../market-data/market-data.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  LIQUIDATION_TRIGGER_DEPRECIATION_PCT,
  LIQUIDATION_WARNING_DEPRECIATION_PCT,
} from './rate.constants';

export interface LiquidationCheckResult {
  positionId: string;
  action: 'NONE' | 'WARNING_SET' | 'WARNING_CLEARED' | 'LIQUIDATED';
  depreciationPct: Prisma.Decimal | null;
}

// Comble le vide identifié dans l'algorithme de crédit (cf. /admin/algorithme, "Aucun
// mécanisme de liquidation automatique") : jusqu'ici, rien ne réagissait si la valeur
// d'un gage volatil (métaux précieux, ETH, RWA industriels) s'effondrait après
// verrouillage — seule la hausse était exploitée (CollateralYieldService). Ce service
// couvre la baisse : au-delà d'un seuil de dépréciation par rapport à la valeur d'entrée
// du gage, la position est retirée du bilan (LedgerService.liquidateCollateral), sans
// affecter le crédit déjà utilisé, qui reste dû (exposition non garantie pour la banque,
// cf. CreditPositionStatus.LIQUIDATED). Non-rétroactif par construction : chaque position
// est évaluée par rapport à SA propre valeur d'entrée, jamais recalculée si les seuils
// changent ensuite.
@Injectable()
export class LiquidationService {
  private readonly logger = new Logger(LiquidationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
    private readonly marketDataService: MarketDataService,
  ) {}

  // Tourne quotidiennement en production (décalé de CollateralYieldService pour éviter
  // tout chevauchement) ; reste appelable directement (tests, déclenchement manuel
  // back-office) indépendamment du calendrier.
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async runDailyLiquidationCheck(): Promise<LiquidationCheckResult[]> {
    const positions = await this.prisma.creditPosition.findMany({
      where: {
        status: 'ACTIVE',
        collateralCurrency: { in: Array.from(YIELD_ELIGIBLE_CURRENCIES) },
        collateralTokenAmount: { not: null },
      },
    });

    const results: LiquidationCheckResult[] = [];
    for (const position of positions) {
      // Une position en échec ne doit jamais bloquer la vérification des autres positions
      // du même passage (même principe d'isolation que CollateralYieldService).
      try {
        results.push(await this.checkPositionForLiquidation(position));
      } catch (error) {
        this.logger.error(
          `Échec de la vérification de liquidation pour la position ${position.id}, ignorée pour ce passage`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
    return results;
  }

  async checkPositionForLiquidation(
    position: CreditPosition,
  ): Promise<LiquidationCheckResult> {
    const noop: LiquidationCheckResult = {
      positionId: position.id,
      action: 'NONE',
      depreciationPct: null,
    };

    if (
      position.status !== 'ACTIVE' ||
      !position.collateralCurrency ||
      !YIELD_ELIGIBLE_CURRENCIES.has(position.collateralCurrency) ||
      !position.collateralTokenAmount
    ) {
      return noop;
    }

    const currentPrice = await this.marketDataService.getSpotPriceUsd(
      position.collateralCurrency,
    );
    const currentValueUsd = new Prisma.Decimal(
      position.collateralTokenAmount,
    ).times(currentPrice);
    const entryValueUsd = new Prisma.Decimal(position.collateralAmount);

    // Dépréciation par rapport à la valeur d'ENTRÉE du gage (jamais par rapport au crédit
    // utilisé, cf. commentaire de tête) — nulle ou négative (le gage a pris de la valeur)
    // : aucune action, on efface une éventuelle alerte antérieure si le cours s'est redressé.
    const depreciationPct = new Prisma.Decimal(1)
      .minus(currentValueUsd.dividedBy(entryValueUsd))
      .times(100);

    if (
      depreciationPct.greaterThanOrEqualTo(LIQUIDATION_TRIGGER_DEPRECIATION_PCT)
    ) {
      await this.liquidatePosition(position);
      return { positionId: position.id, action: 'LIQUIDATED', depreciationPct };
    }

    const shouldWarn = depreciationPct.greaterThanOrEqualTo(
      LIQUIDATION_WARNING_DEPRECIATION_PCT,
    );
    if (shouldWarn !== position.liquidationWarning) {
      await this.prisma.creditPosition.update({
        where: { id: position.id },
        data: { liquidationWarning: shouldWarn },
      });
      return {
        positionId: position.id,
        action: shouldWarn ? 'WARNING_SET' : 'WARNING_CLEARED',
        depreciationPct,
      };
    }

    return { positionId: position.id, action: 'NONE', depreciationPct };
  }

  private async liquidatePosition(position: CreditPosition): Promise<void> {
    const collateralAmount = new Prisma.Decimal(position.collateralAmount);
    const creditIssued = new Prisma.Decimal(position.creditIssued);

    await this.prisma.$transaction(async (tx) => {
      await this.ledgerService.liquidateCollateral(
        tx,
        position.userId,
        collateralAmount,
        creditIssued,
      );

      await tx.creditPosition.update({
        where: { id: position.id },
        data: { status: 'LIQUIDATED', liquidationWarning: false },
      });

      await tx.transaction.create({
        data: {
          userId: position.userId,
          type: 'LIQUIDATION',
          amount: collateralAmount,
          status: 'COMPLETED',
        },
      });
    });

    this.logger.warn(
      `Position ${position.id} (userId=${position.userId}) liquidée : dépréciation du gage ≥ ${LIQUIDATION_TRIGGER_DEPRECIATION_PCT.toString()}% depuis le verrouillage.`,
    );
  }
}
