import { Injectable, Logger } from '@nestjs/common';
import { LedgerBalance, Prisma, Transaction } from '@prisma/client';
import { WalletNotFoundException } from '../common/exceptions/wallet.exceptions';
import { CreditRequestsService } from '../credit-requests/credit-requests.service';
import { LedgerService } from '../ledger/ledger.service';
import { MarketDataService } from '../market-data/market-data.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainDepositDto } from './dto/blockchain-deposit.dto';

export interface ProcessDepositResult {
  balance: LedgerBalance;
  transaction: Transaction;
  duplicate: boolean;
}

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

// Traite un dépôt on-chain déjà confirmé par le listener blockchain (Alchemy/QuickNode) :
// convertit la quantité de token reçue en USD (1:1 pour les stablecoins, prix spot en
// direct pour l'or PAXG/XAUT), crédite le solde disponible et journalise le mouvement.
@Injectable()
export class BlockchainDepositService {
  private readonly logger = new Logger(BlockchainDepositService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
    private readonly marketDataService: MarketDataService,
    private readonly creditRequestsService: CreditRequestsService,
  ) {}

  async processDeposit(
    dto: BlockchainDepositDto,
  ): Promise<ProcessDepositResult> {
    const wallet = await this.prisma.wallet.findUnique({
      where: {
        chainAddressCurrency: {
          chain: dto.chain,
          address: dto.address,
          currency: dto.currency,
        },
      },
    });
    if (!wallet) {
      throw new WalletNotFoundException(dto.chain, dto.address);
    }

    const tokenAmount = new Prisma.Decimal(dto.amount);
    // Résolu avant la transaction DB : c'est un appel réseau, il ne doit pas retenir
    // de verrou/transaction Postgres ouverte pendant qu'il s'exécute.
    const usdAmount = await this.marketDataService.getUsdValue(
      dto.currency,
      tokenAmount,
    );

    try {
      const { balance, transaction } = await this.prisma.$transaction(
        async (tx) => {
          const updatedBalance =
            await this.ledgerService.creditAvailableBalance(
              tx,
              wallet.userId,
              usdAmount,
            );
          const createdTransaction = await tx.transaction.create({
            data: {
              userId: wallet.userId,
              type: 'DEPOSIT',
              amount: usdAmount,
              currency: dto.currency,
              tokenAmount,
              status: 'COMPLETED',
              referenceTx: dto.txHash,
            },
          });
          return { balance: updatedBalance, transaction: createdTransaction };
        },
      );

      // Hors de la transaction du dépôt (déjà commitée) : émet automatiquement le crédit
      // si ce dépôt porte le solde au niveau requis par une demande de crédit approuvée.
      await this.creditRequestsService.tryAutoFulfill(wallet.userId);

      return { balance, transaction, duplicate: false };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        // Redélivrance du même événement webhook (txHash déjà traité) : idempotent, pas d'erreur.
        this.logger.log(
          `Dépôt déjà traité pour txHash=${dto.txHash}, ignoré (idempotent)`,
        );
        const existingTransaction =
          await this.prisma.transaction.findUniqueOrThrow({
            where: { referenceTx: dto.txHash },
          });
        const balance = await this.ledgerService.getBalance(wallet.userId);
        return { balance, transaction: existingTransaction, duplicate: true };
      }
      throw error;
    }
  }
}
