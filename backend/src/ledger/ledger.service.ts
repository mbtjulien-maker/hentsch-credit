import { Injectable } from '@nestjs/common';
import {
  LedgerBalance,
  Prisma,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';
import {
  InsufficientFundsException,
  LedgerNotFoundException,
  NoOutstandingCreditException,
  OverRepaymentException,
} from '../common/exceptions/financial.exceptions';
import { PrismaService } from '../prisma/prisma.service';
import { INITIAL_DEPOSIT_REQUIREMENT_USD } from '../users/user.constants';

type PrismaClientOrTx = PrismaService | Prisma.TransactionClient;

export interface RepaymentResult {
  balance: LedgerBalance;
  collateralUnlocked: boolean;
}

// Condition d'ouverture de compte (cf. user.constants.ts) — `depositedUsd` cumule tous
// les dépôts réels jamais reçus (DEPOSIT on-chain + CARD_TOPUP Mollie, `COMPLETED`
// uniquement), jamais le solde courant : un client qui a atteint le seuil puis dépensé ou
// retiré une partie de son capital reste `met: true` pour toujours, cohérent avec le
// principe "réutilisable plus tard" (pas un plancher permanent, cf. INITIAL_DEPOSIT_REQUIREMENT_USD).
export interface InitialDepositStatus {
  requiredUsd: Prisma.Decimal;
  depositedUsd: Prisma.Decimal;
  met: boolean;
}

export interface BalanceSummary {
  balance: LedgerBalance;
  totalPurchasingPower: Prisma.Decimal;
  withdrawableBalance: Prisma.Decimal;
  initialDeposit: InitialDepositStatus;
}

// Tenue de comptes du Master Ledger. Toute mutation de solde passe par ce service
// afin de garantir l'intégrité ACID des soldes financiers (CLAUDE.md §2, §3).
@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async getBalance(
    userId: string,
    client: PrismaClientOrTx = this.prisma,
  ): Promise<LedgerBalance> {
    const balance = await client.ledgerBalance.findUnique({
      where: { userId },
    });
    if (!balance) {
      throw new LedgerNotFoundException(userId);
    }
    return balance;
  }

  // Pouvoir d'Achat Total = Solde Disponible + Gage Verrouillé + Crédit Accordé - Crédit Utilisé
  //
  // Utilise `grantedCredit` (déjà persisté par lockCollateral) plutôt que de recalculer
  // `lockedCollateral * CREDIT_RATIO` : le taux de crédit peut changer dans le temps
  // (ex: 75% → 150% → 200% → 350%), et une position verrouillée sous l'ancien taux doit garder son
  // crédit d'origine — seul un nouveau verrouillage utilise le taux courant.
  calculateTotalPurchasingPower(balance: LedgerBalance): Prisma.Decimal {
    return new Prisma.Decimal(balance.availableBalance)
      .plus(balance.lockedCollateral)
      .plus(balance.grantedCredit)
      .minus(balance.usedCredit);
  }

  // Solde Retirable = Solde Disponible (hors gage bloqué)
  getWithdrawableBalance(balance: LedgerBalance): Prisma.Decimal {
    return new Prisma.Decimal(balance.availableBalance);
  }

  // Vue agrégée consommée par le dashboard (Step 6) : solde brut + indicateurs calculés.
  async getBalanceSummary(userId: string): Promise<BalanceSummary> {
    const balance = await this.getBalance(userId);
    const initialDeposit = await this.getInitialDepositStatus(userId);
    return {
      balance,
      totalPurchasingPower: this.calculateTotalPurchasingPower(balance),
      withdrawableBalance: this.getWithdrawableBalance(balance),
      initialDeposit,
    };
  }

  // Cf. INITIAL_DEPOSIT_REQUIREMENT_USD (user.constants.ts) — condition d'ouverture de
  // compte, distincte du crédit gagé/direct : un cumul de dépôts réels à atteindre une
  // seule fois, jamais recalculé à la baisse si le client dépense ou retire ensuite.
  // `findUniqueOrThrow` est sûr ici : appelé uniquement après `getBalance` a réussi
  // (ci-dessus), donc l'utilisateur existe forcément (LedgerBalance a une FK vers User).
  async getInitialDepositStatus(userId: string): Promise<InitialDepositStatus> {
    const [user, aggregate] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { accountType: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId,
          status: TransactionStatus.COMPLETED,
          type: { in: [TransactionType.DEPOSIT, TransactionType.CARD_TOPUP] },
        },
        _sum: { amount: true },
      }),
    ]);
    const requiredUsd = INITIAL_DEPOSIT_REQUIREMENT_USD[user.accountType];
    const depositedUsd = new Prisma.Decimal(aggregate._sum.amount ?? 0);
    return {
      requiredUsd,
      depositedUsd,
      met: depositedUsd.gte(requiredUsd),
    };
  }

  // Déplace `collateralAmount` du solde disponible vers le gage verrouillé et augmente
  // le crédit accordé de `creditToIssue`, en une seule instruction atomique gardée par
  // une clause WHERE sur le solde courant (évite les races sous écritures concurrentes).
  async lockCollateral(
    tx: Prisma.TransactionClient,
    userId: string,
    collateralAmount: Prisma.Decimal,
    creditToIssue: Prisma.Decimal,
  ): Promise<LedgerBalance> {
    const result = await tx.ledgerBalance.updateMany({
      where: { userId, availableBalance: { gte: collateralAmount } },
      data: {
        availableBalance: { decrement: collateralAmount },
        lockedCollateral: { increment: collateralAmount },
        grantedCredit: { increment: creditToIssue },
      },
    });

    if (result.count === 0) {
      const existing = await tx.ledgerBalance.findUnique({ where: { userId } });
      if (!existing) {
        throw new LedgerNotFoundException(userId);
      }
      throw new InsufficientFundsException(userId);
    }

    return this.getBalance(userId, tx);
  }

  // Réduit le crédit utilisé de `amount`. Si le crédit utilisé retombe exactement à zéro,
  // le gage verrouillé est intégralement libéré vers le solde disponible et la ligne de
  // crédit est clôturée (CLAUDE.md §2C : le gage ne peut être retiré tant que le crédit
  // utilisé n'est pas intégralement remboursé). Opération atomique via CASE SQL pour
  // éviter toute lecture-puis-écriture non protégée sous concurrence.
  async applyRepayment(
    tx: Prisma.TransactionClient,
    userId: string,
    amount: Prisma.Decimal,
  ): Promise<RepaymentResult> {
    const rows = await tx.$queryRaw<LedgerBalance[]>(Prisma.sql`
      UPDATE ledger_balances
      SET
        "usedCredit" = "usedCredit" - ${amount},
        "availableBalance" = "availableBalance" + CASE WHEN "usedCredit" - ${amount} = 0 THEN "lockedCollateral" ELSE 0 END,
        "lockedCollateral" = CASE WHEN "usedCredit" - ${amount} = 0 THEN 0 ELSE "lockedCollateral" END,
        "grantedCredit" = CASE WHEN "usedCredit" - ${amount} = 0 THEN 0 ELSE "grantedCredit" END,
        "updatedAt" = NOW()
      WHERE "userId" = ${userId} AND "usedCredit" >= ${amount}
      RETURNING *;
    `);

    if (rows.length === 0) {
      const existing = await tx.ledgerBalance.findUnique({ where: { userId } });
      if (!existing) {
        throw new LedgerNotFoundException(userId);
      }
      if (new Prisma.Decimal(existing.usedCredit).isZero()) {
        throw new NoOutstandingCreditException(userId);
      }
      throw new OverRepaymentException(userId);
    }

    const balance = rows[0];
    return {
      balance,
      collateralUnlocked: new Prisma.Decimal(balance.usedCredit).isZero(),
    };
  }

  // Retire une position liquidée du bilan (cf. LiquidationService) : `lockedCollateral` et
  // `grantedCredit` diminuent du montant de la position, mais contrairement à
  // applyRepayment, ni `usedCredit` ni `availableBalance` ne bougent — le gage a perdu
  // l'essentiel de sa valeur (il n'est pas "rendu" au client) et le crédit déjà utilisé
  // reste dû (il devient une exposition non garantie pour la banque, cf. schema.prisma).
  // GREATEST(x - y, 0) en garde défensive : plusieurs positions partagent le même solde
  // agrégé, une dérive d'arrondi ne doit jamais faire passer un total sous zéro.
  async liquidateCollateral(
    tx: Prisma.TransactionClient,
    userId: string,
    collateralAmount: Prisma.Decimal,
    creditToRevoke: Prisma.Decimal,
  ): Promise<LedgerBalance> {
    const rows = await tx.$queryRaw<LedgerBalance[]>(Prisma.sql`
      UPDATE ledger_balances
      SET
        "lockedCollateral" = GREATEST("lockedCollateral" - ${collateralAmount}, 0),
        "grantedCredit" = GREATEST("grantedCredit" - ${creditToRevoke}, 0),
        "updatedAt" = NOW()
      WHERE "userId" = ${userId}
      RETURNING *;
    `);

    if (rows.length === 0) {
      throw new LedgerNotFoundException(userId);
    }

    return rows[0];
  }

  // Crédite le solde disponible suite à un dépôt on-chain confirmé (Step 3 : webhook de dépôt).
  async creditAvailableBalance(
    tx: Prisma.TransactionClient,
    userId: string,
    amount: Prisma.Decimal,
  ): Promise<LedgerBalance> {
    const result = await tx.ledgerBalance.updateMany({
      where: { userId },
      data: { availableBalance: { increment: amount } },
    });

    if (result.count === 0) {
      throw new LedgerNotFoundException(userId);
    }

    return this.getBalance(userId, tx);
  }

  // Débite le solde disponible pour un retrait vers une adresse externe (Step 6).
  // Même garde atomique que lockCollateral : la clause WHERE empêche tout retrait
  // au-delà du solde réellement disponible sous écritures concurrentes.
  async debitAvailableBalance(
    tx: Prisma.TransactionClient,
    userId: string,
    amount: Prisma.Decimal,
  ): Promise<LedgerBalance> {
    const result = await tx.ledgerBalance.updateMany({
      where: { userId, availableBalance: { gte: amount } },
      data: { availableBalance: { decrement: amount } },
    });

    if (result.count === 0) {
      const existing = await tx.ledgerBalance.findUnique({ where: { userId } });
      if (!existing) {
        throw new LedgerNotFoundException(userId);
      }
      throw new InsufficientFundsException(userId);
    }

    return this.getBalance(userId, tx);
  }

  // Wallet investissement (cf. §2H CLAUDE.md entrée #31) — solde SÉPARÉ
  // d'availableBalance, dédié aux 6 paniers perpétuels et aux 6 plans à échéance fixe.
  // Ces deux méthodes sont appelées par InvestmentService/FixedTermPlanService à la place
  // de credit/debitAvailableBalance ; jamais alimenté directement par un dépôt on-chain.
  async creditInvestmentBalance(
    tx: Prisma.TransactionClient,
    userId: string,
    amount: Prisma.Decimal,
  ): Promise<LedgerBalance> {
    const result = await tx.ledgerBalance.updateMany({
      where: { userId },
      data: { investmentBalance: { increment: amount } },
    });

    if (result.count === 0) {
      throw new LedgerNotFoundException(userId);
    }

    return this.getBalance(userId, tx);
  }

  async debitInvestmentBalance(
    tx: Prisma.TransactionClient,
    userId: string,
    amount: Prisma.Decimal,
  ): Promise<LedgerBalance> {
    const result = await tx.ledgerBalance.updateMany({
      where: { userId, investmentBalance: { gte: amount } },
      data: { investmentBalance: { decrement: amount } },
    });

    if (result.count === 0) {
      const existing = await tx.ledgerBalance.findUnique({ where: { userId } });
      if (!existing) {
        throw new LedgerNotFoundException(userId);
      }
      throw new InsufficientFundsException(userId);
    }

    return this.getBalance(userId, tx);
  }

  // Seul moyen d'alimenter ou de vider le wallet investissement (cf. §6 entrée #31) —
  // virement interne instantané, sans frais, entre availableBalance et
  // investmentBalance. Atomique : les deux mouvements ou aucun (même transaction Prisma
  // que l'appelant, cf. InvestmentWalletController).
  async transferToInvestmentWallet(
    tx: Prisma.TransactionClient,
    userId: string,
    amount: Prisma.Decimal,
  ): Promise<LedgerBalance> {
    await this.debitAvailableBalance(tx, userId, amount);
    return this.creditInvestmentBalance(tx, userId, amount);
  }

  async transferFromInvestmentWallet(
    tx: Prisma.TransactionClient,
    userId: string,
    amount: Prisma.Decimal,
  ): Promise<LedgerBalance> {
    await this.debitInvestmentBalance(tx, userId, amount);
    return this.creditAvailableBalance(tx, userId, amount);
  }
}
