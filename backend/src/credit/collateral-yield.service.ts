import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CreditPosition, Prisma } from '@prisma/client';
import { LedgerService } from '../ledger/ledger.service';
import { YIELD_ELIGIBLE_CURRENCIES } from '../market-data/market-data.constants';
import { MarketDataService } from '../market-data/market-data.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreditEngineService } from './credit-engine.service';
import { YIELD_REPAYMENT_CAP_PCT } from './rate.constants';

export interface AccrualResult {
  positionId: string;
  applied: boolean;
  yieldAmount: Prisma.Decimal;
}

// Règle métier (CLAUDE.md §2) : au plus 60% du crédit émis sur une position est remboursé
// par les profits générés par les actifs mis en gage (métaux précieux PAXG/XAUT/KAG + ETH, cf.
// YIELD_ELIGIBLE_CURRENCIES — seuls actifs dont le prix bouge, les stablecoins restant
// 1:1, aucune plus-value possible) ; les 40% restants doivent obligatoirement être
// remboursés par apport personnel du client (dépôt/virement explicite, cf.
// CreditEngineService.repayCreditAndUnlockCollateral). Ce service couvre le premier
// canal : la plus-value réelle du cours depuis le dernier passage réduit automatiquement
// le crédit utilisé, exactement comme un remboursement manuel (même moteur, même calcul
// d'intérêt), simplement journalisée sous un type distinct (YIELD_REPAYMENT) pour rester
// auditable séparément — plafonnée pour ne jamais dépasser YIELD_REPAYMENT_CAP_PCT du
// crédit initialement émis sur la position (`position.creditIssued`, jamais recalculé).
//
// Cliquet (high-water mark) : `collateralYieldAppliedPriceUsd` n'avance QUE lorsque le
// remboursement a réellement été appliqué avec succès, et ne recule jamais si le cours
// baisse ensuite — une plus-value déjà encaissée n'est jamais reprise. `yieldRepaidAmount`
// suit le même principe pour le plafond des 60% : cumul strictement croissant.
@Injectable()
export class CollateralYieldService {
  private readonly logger = new Logger(CollateralYieldService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
    private readonly marketDataService: MarketDataService,
    private readonly creditEngineService: CreditEngineService,
  ) {}

  // Tourne quotidiennement en production ; reste appelable directement (tests,
  // déclenchement manuel back-office) indépendamment du calendrier.
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async runDailyAccrual(): Promise<AccrualResult[]> {
    const positions = await this.prisma.creditPosition.findMany({
      where: {
        status: 'ACTIVE',
        collateralCurrency: { in: Array.from(YIELD_ELIGIBLE_CURRENCIES) },
        collateralTokenAmount: { not: null },
      },
    });

    const results: AccrualResult[] = [];
    for (const position of positions) {
      // Une position en échec (ex: intérêt dû > solde disponible du client) ne doit
      // jamais bloquer l'accrual des autres positions du même passage.
      try {
        results.push(await this.accrueYieldForPosition(position));
      } catch (error) {
        this.logger.error(
          `Échec de l'accrual de rendement pour la position ${position.id}, ignorée pour ce passage`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
    return results;
  }

  async accrueYieldForPosition(
    position: CreditPosition,
  ): Promise<AccrualResult> {
    const noop: AccrualResult = {
      positionId: position.id,
      applied: false,
      yieldAmount: new Prisma.Decimal(0),
    };

    if (
      position.status !== 'ACTIVE' ||
      !position.collateralCurrency ||
      !YIELD_ELIGIBLE_CURRENCIES.has(position.collateralCurrency) ||
      !position.collateralTokenAmount ||
      !position.collateralYieldAppliedPriceUsd
    ) {
      return noop;
    }

    // Plafond des 60% (cf. YIELD_REPAYMENT_CAP_PCT) : porte sur le crédit émis à
    // l'ouverture de la position, jamais recalculé si le taux de crédit change ensuite.
    // Une fois atteint, plus aucun remboursement automatique sur cette position — le
    // reste ne peut être remboursé que manuellement (apport personnel du client).
    const yieldCap = new Prisma.Decimal(position.creditIssued)
      .times(YIELD_REPAYMENT_CAP_PCT)
      .dividedBy(100);
    const alreadyYieldRepaid = new Prisma.Decimal(position.yieldRepaidAmount);
    const remainingYieldCapacity = yieldCap.minus(alreadyYieldRepaid);
    if (remainingYieldCapacity.lessThanOrEqualTo(0)) {
      return noop;
    }

    const currentPrice = await this.marketDataService.getSpotPriceUsd(
      position.collateralCurrency,
    );
    const appliedPrice = new Prisma.Decimal(
      position.collateralYieldAppliedPriceUsd,
    );
    if (currentPrice.lessThanOrEqualTo(appliedPrice)) {
      // Aucune plus-value nouvelle depuis le dernier passage (cours en baisse ou stable).
      return noop;
    }

    const appreciationPerToken = currentPrice.minus(appliedPrice);
    const tokenAmount = new Prisma.Decimal(position.collateralTokenAmount);
    let yieldAmount = appreciationPerToken.times(tokenAmount);
    if (yieldAmount.greaterThan(remainingYieldCapacity)) {
      yieldAmount = remainingYieldCapacity;
    }

    // Le ledger est un pool agrégé par utilisateur, pas un solde par position (cf.
    // CreditEngineService) : ne rembourse jamais plus que le crédit réellement utilisé.
    let usedCredit: Prisma.Decimal;
    try {
      const balance = await this.ledgerService.getBalance(position.userId);
      usedCredit = new Prisma.Decimal(balance.usedCredit);
    } catch {
      return noop;
    }
    if (usedCredit.lessThanOrEqualTo(0)) {
      return noop;
    }
    if (yieldAmount.greaterThan(usedCredit)) {
      yieldAmount = usedCredit;
    }
    if (yieldAmount.lessThanOrEqualTo(0)) {
      return noop;
    }

    try {
      await this.creditEngineService.repayCreditAndUnlockCollateral(
        position.userId,
        yieldAmount,
        'YIELD_REPAYMENT',
      );
    } catch (error) {
      // Ex: l'intérêt dû sur ce remboursement dépasse le solde disponible du client
      // (debitAvailableBalance échoue). On retente au prochain passage plutôt que de
      // perdre la plus-value : le cliquet n'avance QUE si le remboursement a réussi.
      this.logger.warn(
        `Rendement non appliqué pour la position ${position.id} (userId=${position.userId}) : ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return noop;
    }

    await this.prisma.creditPosition.update({
      where: { id: position.id },
      data: {
        collateralYieldAppliedPriceUsd: currentPrice,
        yieldRepaidAmount: alreadyYieldRepaid.plus(yieldAmount),
      },
    });

    return { positionId: position.id, applied: true, yieldAmount };
  }
}
