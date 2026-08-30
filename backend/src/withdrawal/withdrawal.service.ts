import { Injectable } from '@nestjs/common';
import {
  AcceptedCurrency,
  Chain,
  LedgerBalance,
  Prisma,
  Transaction,
} from '@prisma/client';
import { toPositiveDecimal } from '../common/decimal.util';
import { LedgerService } from '../ledger/ledger.service';
import { PrismaService } from '../prisma/prisma.service';

export interface WithdrawalResult {
  balance: LedgerBalance;
  transaction: Transaction;
}

// Retrait vers une adresse externe. Débite immédiatement le solde disponible (source de
// vérité du ledger) — l'exécution on-chain réelle (signature, diffusion, frais) dépend
// de l'intégration custody (Circle/DFNS/Fireblocks) qui n'est pas encore branchée ;
// la transaction est journalisée COMPLETED côté ledger comme un virement bancaire
// classique débite instantanément le compte même si le règlement final prend du temps.
@Injectable()
export class WithdrawalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
  ) {}

  async requestWithdrawal(
    userId: string,
    amount: Prisma.Decimal.Value,
    chain: Chain,
    currency: AcceptedCurrency,
    destinationAddress: string,
  ): Promise<WithdrawalResult> {
    const withdrawalAmount = toPositiveDecimal(amount);

    return this.prisma.$transaction(async (tx) => {
      const balance = await this.ledgerService.debitAvailableBalance(
        tx,
        userId,
        withdrawalAmount,
      );

      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: 'WITHDRAWAL',
          amount: withdrawalAmount,
          status: 'COMPLETED',
          chain,
          currency,
          destinationAddress,
        },
      });

      return { balance, transaction };
    });
  }
}
