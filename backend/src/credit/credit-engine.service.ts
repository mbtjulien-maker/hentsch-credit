import { Injectable } from '@nestjs/common';
import {
  AcceptedCurrency,
  AccountCurrency,
  CreditPosition,
  LedgerBalance,
  Prisma,
  TransactionType,
} from '@prisma/client';
import { toPositiveDecimal } from '../common/decimal.util';
import { CREDIT_RATIO } from '../ledger/ledger.constants';
import { LedgerService } from '../ledger/ledger.service';
import { YIELD_ELIGIBLE_CURRENCIES } from '../market-data/market-data.constants';
import { MarketDataService } from '../market-data/market-data.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CUSTODY_FEE_PCT,
  DEFAULT_TERM_MONTHS,
  ORIGINATION_FEE_PCT,
  getInterestRatePct,
} from './rate.constants';

export interface LockCollateralResult {
  balance: LedgerBalance;
  position: CreditPosition;
}

export interface RepayCreditResult {
  balance: LedgerBalance;
  collateralUnlocked: boolean;
  closedPositions: number;
  interestCharged: Prisma.Decimal;
}

const DAY_MS = 1000 * 60 * 60 * 24;
const DAYS_PER_YEAR = 365;

// Moteur de crédit : orchestre la mise en gage / le remboursement en s'appuyant sur le
// LedgerService pour la tenue de compte, et journalise chaque mouvement (CreditPosition,
// Transaction) au sein d'une même transaction Prisma pour garantir l'atomicité (CLAUDE.md §5 Step 2).
@Injectable()
export class CreditEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
    private readonly marketDataService: MarketDataService,
  ) {}

  async lockCollateralAndIssueCredit(
    userId: string,
    collateralAmount: Prisma.Decimal.Value,
    currency: AccountCurrency = 'USD',
    collateralCurrency?: AcceptedCurrency,
  ): Promise<LockCollateralResult> {
    const amount = toPositiveDecimal(collateralAmount);
    const creditToIssue = amount.times(CREDIT_RATIO);
    const originationFee = creditToIssue
      .times(ORIGINATION_FEE_PCT)
      .dividedBy(100);
    const interestRatePct = getInterestRatePct(currency);

    // Résolu avant la transaction DB : appel réseau, ne doit pas retenir de verrou Postgres.
    const exchangeRateAtLock =
      currency === 'EUR'
        ? await this.marketDataService.getEurPerUsd()
        : new Prisma.Decimal(1);
    const creditIssuedInCurrency = creditToIssue.times(exchangeRateAtLock);

    // Capture le prix d'entrée de l'actif réellement mis en gage — uniquement pour les
    // actifs éligibles au rendement indexé (métaux précieux PAXG/XAUT/KAG + ETH, cf.
    // YIELD_ELIGIBLE_CURRENCIES), seuls actifs dont la valeur bouge (stablecoins toujours
    // 1:1, aucune plus-value possible). Sert de référence au rendement indexé sur la
    // performance réelle du gage (CollateralYieldService) ; `collateralYieldAppliedPriceUsd`
    // démarre au même niveau (cliquet, cf. schema.prisma). Résolu avant la transaction DB
    // comme le taux de change ci-dessus : appel réseau, pas de verrou Postgres retenu.
    let collateralTokenAmount: Prisma.Decimal | undefined;
    let collateralEntryPriceUsd: Prisma.Decimal | undefined;
    if (
      collateralCurrency &&
      YIELD_ELIGIBLE_CURRENCIES.has(collateralCurrency)
    ) {
      collateralEntryPriceUsd =
        await this.marketDataService.getSpotPriceUsd(collateralCurrency);
      collateralTokenAmount = amount.dividedBy(collateralEntryPriceUsd);
    }

    const maturityDate = new Date();
    maturityDate.setMonth(maturityDate.getMonth() + DEFAULT_TERM_MONTHS);

    return this.prisma.$transaction(async (tx) => {
      // Verrouille le gage, puis prélève les frais d'origination sur le solde disponible
      // restant — si le solde ne couvre pas les frais, toute l'opération est annulée
      // (transaction Prisma) : pas de gage verrouillé sans frais payé.
      await this.ledgerService.lockCollateral(
        tx,
        userId,
        amount,
        creditToIssue,
      );
      const balance = await this.ledgerService.debitAvailableBalance(
        tx,
        userId,
        originationFee,
      );

      const position = await tx.creditPosition.create({
        data: {
          userId,
          collateralAmount: amount,
          creditIssued: creditToIssue,
          status: 'ACTIVE',
          currency,
          exchangeRateAtLock,
          creditIssuedInCurrency,
          interestRatePct,
          originationFeePct: ORIGINATION_FEE_PCT,
          originationFeeAmount: originationFee,
          custodyFeePct: CUSTODY_FEE_PCT,
          termMonths: DEFAULT_TERM_MONTHS,
          maturityDate,
          collateralCurrency: collateralCurrency ?? null,
          collateralTokenAmount: collateralTokenAmount ?? null,
          collateralEntryPriceUsd: collateralEntryPriceUsd ?? null,
          collateralYieldAppliedPriceUsd: collateralEntryPriceUsd ?? null,
        },
      });

      await tx.transaction.createMany({
        data: [
          { userId, type: 'COLLATERAL_LOCK', amount, status: 'COMPLETED' },
          {
            userId,
            type: 'CREDIT_ISSUED',
            amount: creditToIssue,
            status: 'COMPLETED',
          },
          {
            userId,
            type: 'ORIGINATION_FEE',
            amount: originationFee,
            status: 'COMPLETED',
          },
        ],
      });

      return { balance, position };
    });
  }

  async repayCreditAndUnlockCollateral(
    userId: string,
    amount: Prisma.Decimal.Value,
    // 'REPAYMENT' = geste explicite du client (défaut, comportement inchangé).
    // 'YIELD_REPAYMENT' = remboursement automatique généré par la plus-value du gage
    // (cf. CollateralYieldService) — même mécanique de ledger et d'intérêts, seul le
    // type journalisé change, pour rester distinguable dans l'historique/l'audit.
    transactionType: TransactionType = 'REPAYMENT',
  ): Promise<RepayCreditResult> {
    const repaymentAmount = toPositiveDecimal(amount);

    return this.prisma.$transaction(async (tx) => {
      // Intérêts "in fine" : calculés sur le montant remboursé au taux et depuis la date
      // de la position active la plus ancienne. Simplification documentée — usedCredit
      // est un solde agrégé (pas encore de suivi par tirage individuel, cf. Étape 4 cartes,
      // non construite) ; cette branche est actuellement inatteignable en conditions réelles
      // puisque usedCredit reste à 0 tant que le paiement par carte n'existe pas.
      const oldestActivePosition = await tx.creditPosition.findFirst({
        where: { userId, status: 'ACTIVE' },
        orderBy: { createdAt: 'asc' },
      });
      const interestCharged = oldestActivePosition
        ? this.calculateAccruedInterest(oldestActivePosition, repaymentAmount)
        : new Prisma.Decimal(0);

      const { balance: balanceAfterRepayment, collateralUnlocked } =
        await this.ledgerService.applyRepayment(tx, userId, repaymentAmount);

      await tx.transaction.create({
        data: {
          userId,
          type: transactionType,
          amount: repaymentAmount,
          status: 'COMPLETED',
        },
      });

      let balance = balanceAfterRepayment;
      if (interestCharged.greaterThan(0)) {
        balance = await this.ledgerService.debitAvailableBalance(
          tx,
          userId,
          interestCharged,
        );
        await tx.transaction.create({
          data: {
            userId,
            type: 'INTEREST_PAYMENT',
            amount: interestCharged,
            status: 'COMPLETED',
          },
        });
      }

      let closedPositions = 0;
      if (collateralUnlocked) {
        const result = await tx.creditPosition.updateMany({
          where: { userId, status: 'ACTIVE' },
          data: { status: 'CLOSED' },
        });
        closedPositions = result.count;
      }

      return { balance, collateralUnlocked, closedPositions, interestCharged };
    });
  }

  private calculateAccruedInterest(
    position: CreditPosition,
    principalRepaid: Prisma.Decimal,
    now: Date = new Date(),
  ): Prisma.Decimal {
    const msElapsed = Math.max(now.getTime() - position.createdAt.getTime(), 0);
    const daysElapsed = new Prisma.Decimal(msElapsed).dividedBy(DAY_MS);
    const annualRate = new Prisma.Decimal(position.interestRatePct).dividedBy(
      100,
    );
    return principalRepaid
      .times(annualRate)
      .times(daysElapsed)
      .dividedBy(DAYS_PER_YEAR);
  }
}
