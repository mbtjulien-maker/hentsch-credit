import { randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LedgerBalance, Prisma, Transaction } from '@prisma/client';
import { PaymentNotFoundException } from '../common/exceptions/payment.exceptions';
import { toPositiveDecimal } from '../common/decimal.util';
import { CreditRequestsService } from '../credit-requests/credit-requests.service';
import { LedgerService } from '../ledger/ledger.service';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateCardTopupResult {
  paymentId: string;
  checkoutUrl: string;
}

export interface ConfirmPaymentResult {
  balance: LedgerBalance | null;
  transaction: Transaction;
  credited: boolean;
}

export interface PaymentStatusResult {
  status: Transaction['status'];
  amount: Prisma.Decimal;
  // Propriétaire du paiement — jamais affiché tel quel, sert au contrôleur à vérifier
  // que l'appelant a le droit de consulter ce statut (assertSelfOrAdmin).
  userId: string;
}

const SANDBOX_ID_PREFIX = 'sandbox_tr_';

// Statuts terminaux d'échec côté Mollie — un paiement dans un autre état non-"paid"
// (open, pending, authorized) est encore en cours et ne doit ni créditer, ni échouer.
const MOLLIE_TERMINAL_FAILURE_STATUSES = new Set([
  'failed',
  'expired',
  'canceled',
]);

// Recharge du solde disponible par carte bancaire (Mollie), en miroir du dépôt crypto
// on-chain (BlockchainDepositService, Step 3) : le solde n'est crédité qu'à la
// confirmation du paiement, jamais à sa création.
//
// Sans MOLLIE_API_KEY configurée, ce service reste en mode sandbox : aucun appel réseau
// vers Mollie, un identifiant de paiement local plausible est généré et le "checkout"
// pointe vers une page de simulation interne (même convention que
// WalletService.generateSandboxAddress pour les adresses de dépôt on-chain). Renseigner
// une clé test Mollie bascule automatiquement sur l'API réelle, sans changement d'appelant.
@Injectable()
export class MollieService {
  private readonly logger = new Logger(MollieService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
    private readonly configService: ConfigService,
    private readonly creditRequestsService: CreditRequestsService,
  ) {}

  private get apiKey(): string | undefined {
    return this.configService.get<string>('MOLLIE_API_KEY') || undefined;
  }

  private get frontendOrigin(): string {
    return (
      this.configService.get<string>('FRONTEND_ORIGIN') ??
      'http://localhost:3001'
    );
  }

  private get backendPublicUrl(): string {
    return (
      this.configService.get<string>('BACKEND_PUBLIC_URL') ??
      'http://localhost:3000'
    );
  }

  async createCardTopup(
    userId: string,
    amount: Prisma.Decimal.Value,
  ): Promise<CreateCardTopupResult> {
    const usdAmount = toPositiveDecimal(amount);
    const { paymentId, checkoutUrl } = this.apiKey
      ? await this.createRealMolliePayment(usdAmount)
      : this.createSandboxPayment();

    await this.prisma.transaction.create({
      data: {
        userId,
        type: 'CARD_TOPUP',
        amount: usdAmount,
        status: 'PENDING',
        referenceTx: paymentId,
      },
    });

    return { paymentId, checkoutUrl };
  }

  private createSandboxPayment(): CreateCardTopupResult {
    const paymentId = `${SANDBOX_ID_PREFIX}${randomUUID()}`;
    return {
      paymentId,
      // Pas de vrai checkout Mollie sans clé API : redirige vers une page interne qui
      // simule la page de paiement hébergée, sur le même principe que l'adresse de
      // dépôt sandbox pour les wallets crypto.
      checkoutUrl: `${this.frontendOrigin}/paiement-simule/${paymentId}`,
    };
  }

  private async createRealMolliePayment(
    amount: Prisma.Decimal,
  ): Promise<CreateCardTopupResult> {
    const response = await fetch('https://api.mollie.com/v2/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: { currency: 'USD', value: amount.toFixed(2) },
        description: 'Recharge de solde — Crypto-Crédit Bank',
        redirectUrl: `${this.frontendOrigin}/solde?topup=complete`,
        webhookUrl: `${this.backendPublicUrl}/payments/mollie-webhook`,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      throw new Error(`Mollie a répondu ${response.status}`);
    }
    const payload = (await response.json()) as {
      id: string;
      _links: { checkout?: { href: string } };
    };
    if (!payload._links.checkout) {
      throw new Error("Mollie n'a renvoyé aucune URL de paiement");
    }
    return {
      paymentId: payload.id,
      checkoutUrl: payload._links.checkout.href,
    };
  }

  async getStatus(paymentId: string): Promise<PaymentStatusResult> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { referenceTx: paymentId },
    });
    if (!transaction) {
      throw new PaymentNotFoundException(paymentId);
    }
    return {
      status: transaction.status,
      amount: new Prisma.Decimal(transaction.amount),
      userId: transaction.userId,
    };
  }

  // Appelé par le webhook Mollie (ou, en sandbox, par le bouton "Confirmer" de la page
  // de paiement simulée — même endpoint, même logique, seule la clé API change de
  // comportement). Ne fait jamais confiance au corps du webhook pour le statut : Mollie
  // ne signe pas ses webhooks (contrairement à Stripe), sa garantie de sécurité repose
  // sur le fait que l'appelant doit re-vérifier le statut auprès de l'API Mollie avec sa
  // propre clé secrète. En sandbox (pas de clé API), il n'existe pas de vraie source à
  // interroger : le paiement est considéré payé dès l'appel — limite assumée et
  // documentée du mode sandbox, jamais activée en production sans clé réelle.
  async confirmPayment(paymentId: string): Promise<ConfirmPaymentResult> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { referenceTx: paymentId },
    });
    if (!transaction) {
      throw new PaymentNotFoundException(paymentId);
    }

    if (transaction.status !== 'PENDING') {
      this.logger.log(
        `Paiement ${paymentId} déjà traité (statut=${transaction.status}), notification ignorée (idempotent)`,
      );
      const balance =
        transaction.status === 'COMPLETED'
          ? await this.ledgerService.getBalance(transaction.userId)
          : null;
      return { balance, transaction, credited: false };
    }

    const mollieStatus = this.apiKey
      ? await this.fetchRealMollieStatus(paymentId)
      : 'paid';

    if (mollieStatus === 'paid') {
      return this.creditTopup(paymentId, transaction);
    }

    if (MOLLIE_TERMINAL_FAILURE_STATUSES.has(mollieStatus)) {
      this.logger.warn(
        `Paiement ${paymentId} en échec (statut Mollie=${mollieStatus}), solde non crédité`,
      );
      const failed = await this.prisma.transaction.update({
        where: { referenceTx: paymentId },
        data: { status: 'FAILED' },
      });
      return { balance: null, transaction: failed, credited: false };
    }

    // Statut encore transitoire (open, pending, authorized) : ni crédité, ni en échec.
    return { balance: null, transaction, credited: false };
  }

  private async creditTopup(
    paymentId: string,
    pendingTransaction: Transaction,
  ): Promise<ConfirmPaymentResult> {
    const result = await this.prisma.$transaction(async (tx) => {
      // Garde atomique : ne crédite que si la transaction est encore PENDING — protège
      // contre une redélivrance du webhook (Mollie peut notifier plusieurs fois le même
      // paiement) sans jamais créditer deux fois le même paiement carte.
      const result = await tx.transaction.updateMany({
        where: { referenceTx: paymentId, status: 'PENDING' },
        data: { status: 'COMPLETED' },
      });

      if (result.count === 0) {
        const current = await tx.transaction.findUniqueOrThrow({
          where: { referenceTx: paymentId },
        });
        const balance =
          current.status === 'COMPLETED'
            ? await this.ledgerService.getBalance(current.userId, tx)
            : null;
        return { balance, transaction: current, credited: false };
      }

      const balance = await this.ledgerService.creditAvailableBalance(
        tx,
        pendingTransaction.userId,
        new Prisma.Decimal(pendingTransaction.amount),
      );
      const updated = await tx.transaction.findUniqueOrThrow({
        where: { referenceTx: paymentId },
      });
      return { balance, transaction: updated, credited: true };
    });

    // Hors de la transaction (déjà commitée) : émet automatiquement le crédit si cette
    // recharge porte le solde au niveau requis par une demande de crédit approuvée.
    if (result.credited) {
      await this.creditRequestsService.tryAutoFulfill(
        pendingTransaction.userId,
      );
    }

    return result;
  }

  private async fetchRealMollieStatus(paymentId: string): Promise<string> {
    const response = await fetch(
      `https://api.mollie.com/v2/payments/${paymentId}`,
      {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!response.ok) {
      throw new Error(`Mollie a répondu ${response.status}`);
    }
    const payload = (await response.json()) as { status: string };
    return payload.status;
  }
}
