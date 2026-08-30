import { Injectable } from '@nestjs/common';
import {
  AcceptedCurrency,
  Chain,
  LedgerBalance,
  ManagedDepositAddress,
  Prisma,
  Transaction,
} from '@prisma/client';
import { ClientWalletsService } from '../client-wallets/client-wallets.service';
import {
  DepositIntentAlreadyProcessedException,
  DepositIntentNotFoundException,
  ManagedDepositAddressNotFoundException,
} from '../common/exceptions/deposit-intent.exceptions';
import { CreditRequestsService } from '../credit-requests/credit-requests.service';
import { LedgerService } from '../ledger/ledger.service';
import { MarketDataService } from '../market-data/market-data.service';
import { PrismaService } from '../prisma/prisma.service';
import { DeclareDepositDto } from './dto/declare-deposit.dto';

export interface PendingDepositIntent extends Transaction {
  user: {
    id: string;
    email: string;
    managedWallet: { reference: string } | null;
  };
}

export interface ConfirmDepositResult {
  balance: LedgerBalance;
  transaction: Transaction;
}

// Flux "adresse de dépôt mutualisée" (cf. ManagedDepositAddress) : contrairement au
// wallet individuel généré par WalletService, une seule adresse par (chain, currency)
// est partagée par tous les clients. Le rapprochement ne peut donc pas être automatique
// (le webhook blockchain existant, cf. BlockchainDepositService, identifie l'expéditeur
// via l'adresse — impossible ici) : le client déclare son intention de dépôt (crée une
// transaction PENDING, visible immédiatement dans son historique), puis un admin la
// valide manuellement une fois les fonds effectivement reçus (cf. confirm/reject).
@Injectable()
export class DepositIntentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
    private readonly marketDataService: MarketDataService,
    private readonly creditRequestsService: CreditRequestsService,
    private readonly clientWalletsService: ClientWalletsService,
  ) {}

  async getManagedAddress(
    chain: Chain,
    currency: AcceptedCurrency,
  ): Promise<ManagedDepositAddress> {
    const address = await this.prisma.managedDepositAddress.findUnique({
      where: { chain_currency: { chain, currency } },
    });
    if (!address) {
      throw new ManagedDepositAddressNotFoundException(chain, currency);
    }
    return address;
  }

  // Renvoie true si l'actif/réseau demandé passe par une adresse mutualisée — utile côté
  // client pour choisir entre ce flux et la génération classique d'adresse individuelle
  // (WalletService), sans dupliquer la liste des actifs concernés côté frontend.
  async isManaged(chain: Chain, currency: AcceptedCurrency): Promise<boolean> {
    const address = await this.prisma.managedDepositAddress.findUnique({
      where: { chain_currency: { chain, currency } },
    });
    return address !== null;
  }

  async declare(userId: string, dto: DeclareDepositDto): Promise<Transaction> {
    const managed = await this.getManagedAddress(dto.chain, dto.currency);
    const tokenAmount = new Prisma.Decimal(dto.tokenAmount);
    // Valorisation indicative au moment de la déclaration (1:1 pour les stablecoins,
    // prix spot en direct pour l'or/DEURO) — un admin peut l'ajuster implicitement en
    // ne validant que le montant réellement reçu si besoin, la déclaration n'engage pas
    // le ledger tant qu'elle n'est pas confirmée.
    const usdAmount = await this.marketDataService.getUsdValue(
      dto.currency,
      tokenAmount,
    );

    // Provisionne le wallet personnel interne du client s'il n'existe pas déjà — garantit
    // qu'un client ayant déjà déposé apparaît toujours avec une référence de suivi
    // (cf. ClientWalletsService, listPending ci-dessous).
    await this.clientWalletsService.getOrCreate(userId);

    return this.prisma.transaction.create({
      data: {
        userId,
        type: 'DEPOSIT',
        amount: usdAmount,
        status: 'PENDING',
        currency: dto.currency,
        tokenAmount,
        chain: dto.chain,
        destinationAddress: managed.address,
      },
    });
  }

  async listPending(): Promise<PendingDepositIntent[]> {
    return this.prisma.transaction.findMany({
      where: { type: 'DEPOSIT', status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            managedWallet: { select: { reference: true } },
          },
        },
      },
    });
  }

  // Crédite le solde disponible et clôt la déclaration — même geste que le webhook
  // blockchain (BlockchainDepositService) pour un Wallet individuel, déclenché ici par un
  // admin plutôt que par un événement on-chain automatique.
  async confirm(
    transactionId: string,
    referenceTx?: string,
  ): Promise<ConfirmDepositResult> {
    const existing = await this.findPendingDepositIntent(transactionId);

    const { balance, transaction } = await this.prisma.$transaction(
      async (tx) => {
        const updatedBalance = await this.ledgerService.creditAvailableBalance(
          tx,
          existing.userId,
          new Prisma.Decimal(existing.amount),
        );
        const updatedTransaction = await tx.transaction.update({
          where: { id: existing.id },
          data: {
            status: 'COMPLETED',
            ...(referenceTx ? { referenceTx } : {}),
          },
        });
        return { balance: updatedBalance, transaction: updatedTransaction };
      },
    );

    // Hors de la transaction déjà commitée — même geste que le webhook blockchain.
    await this.creditRequestsService.tryAutoFulfill(existing.userId);

    return { balance, transaction };
  }

  async reject(transactionId: string): Promise<Transaction> {
    const existing = await this.findPendingDepositIntent(transactionId);
    return this.prisma.transaction.update({
      where: { id: existing.id },
      data: { status: 'FAILED' },
    });
  }

  private async findPendingDepositIntent(
    transactionId: string,
  ): Promise<Transaction> {
    const existing = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });
    if (!existing || existing.type !== 'DEPOSIT') {
      throw new DepositIntentNotFoundException(transactionId);
    }
    if (existing.status !== 'PENDING') {
      throw new DepositIntentAlreadyProcessedException(transactionId);
    }
    return existing;
  }
}
