import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AcceptedCurrency,
  AccountCurrency,
  Chain,
  LedgerBalance,
  Prisma,
  Transaction,
  WithdrawalMethod,
} from '@prisma/client';
import { toPositiveDecimal } from '../common/decimal.util';
import { isSepaEligibleIban } from '../common/iban.util';
import { LedgerService } from '../ledger/ledger.service';
import { PrismaService } from '../prisma/prisma.service';

export interface WithdrawalResult {
  balance: LedgerBalance;
  transaction: Transaction;
}

export interface CryptoWithdrawalInput {
  method: 'CRYPTO';
  amount: Prisma.Decimal.Value;
  chain: Chain;
  currency: AcceptedCurrency;
  destinationAddress: string;
}

export interface BankWithdrawalInput {
  method: 'SEPA' | 'SWIFT';
  amount: Prisma.Decimal.Value;
  withdrawalCurrency: AccountCurrency;
  bankAccountHolder: string;
  destinationIban: string;
  bankBic?: string;
}

export type WithdrawalInput = CryptoWithdrawalInput | BankWithdrawalInput;

// Retrait vers une destination externe — crypto (adresse on-chain) ou virement bancaire
// (SEPA/SWIFT). Débite immédiatement le solde disponible (source de vérité du ledger) —
// dans les deux cas, l'exécution réelle dépend d'une infrastructure non branchée à ce
// stade : la custody crypto (Circle/DFNS/Fireblocks) pour CRYPTO, un partenaire bancaire
// ou PSP (aucun rail SEPA/SWIFT réel) pour SEPA/SWIFT. La transaction est journalisée
// COMPLETED côté ledger comme un virement bancaire classique débite instantanément le
// compte même si le règlement final prend du temps — mais aucun virement n'est réellement
// envoyé tant que ces intégrations ne sont pas branchées.
@Injectable()
export class WithdrawalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
  ) {}

  async requestWithdrawal(
    userId: string,
    input: WithdrawalInput,
  ): Promise<WithdrawalResult> {
    const withdrawalAmount = toPositiveDecimal(input.amount);

    if (input.method === 'SEPA') {
      // Règle métier SEPA : zone euro uniquement, sur les deux plans qui comptent — la
      // devise du virement (SEPA credit transfer ne existe qu'en EUR) ET le pays de
      // l'IBAN destinataire (banque dans la zone SEPA). Un IBAN valide hors zone SEPA
      // (ex. un compte brésilien) doit passer par SWIFT, jamais SEPA.
      if (input.withdrawalCurrency !== 'EUR') {
        throw new BadRequestException(
          'Un virement SEPA ne peut être émis qu’en EUR.',
        );
      }
      if (!isSepaEligibleIban(input.destinationIban)) {
        throw new BadRequestException(
          "L'IBAN fourni n'est pas valide ou n'appartient pas à un pays de la zone SEPA (utilisez SWIFT pour un compte hors zone SEPA).",
        );
      }
    }

    if (input.method === 'SWIFT' && !input.bankBic) {
      throw new BadRequestException(
        'Le code BIC/SWIFT de la banque destinataire est obligatoire pour un virement SWIFT.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const balance = await this.ledgerService.debitAvailableBalance(
        tx,
        userId,
        withdrawalAmount,
      );

      const transaction = await tx.transaction.create({
        data:
          input.method === 'CRYPTO'
            ? {
                userId,
                type: 'WITHDRAWAL',
                amount: withdrawalAmount,
                status: 'COMPLETED',
                withdrawalMethod: WithdrawalMethod.CRYPTO,
                chain: input.chain,
                currency: input.currency,
                destinationAddress: input.destinationAddress,
              }
            : {
                userId,
                type: 'WITHDRAWAL',
                amount: withdrawalAmount,
                status: 'COMPLETED',
                withdrawalMethod:
                  input.method === 'SEPA'
                    ? WithdrawalMethod.SEPA
                    : WithdrawalMethod.SWIFT,
                withdrawalCurrency: input.withdrawalCurrency,
                bankAccountHolder: input.bankAccountHolder,
                destinationAddress: input.destinationIban.replace(/\s+/g, '').toUpperCase(),
                bankBic: input.bankBic?.replace(/\s+/g, '').toUpperCase(),
              },
      });

      return { balance, transaction };
    });
  }
}
