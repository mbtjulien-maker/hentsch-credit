import { Injectable, Logger } from '@nestjs/common';
import {
  AcceptedCurrency,
  AccountCurrency,
  Chain,
  CreditRequest,
  Prisma,
  Wallet,
} from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.service';
import { assertSelfOrAdmin } from '../auth/ownership.util';
import {
  ActiveCreditRequestExistsException,
  CollateralCurrencyMismatchException,
  CreditRequestNotApprovedException,
  CreditRequestNotFoundException,
  CreditRequestNotPendingException,
} from '../common/exceptions/credit-request.exceptions';
import { toPositiveDecimal } from '../common/decimal.util';
import { CreditEngineService } from '../credit/credit-engine.service';
import { ORIGINATION_FEE_PCT } from '../credit/rate.constants';
import { LedgerService } from '../ledger/ledger.service';
import { CREDIT_RATIO } from '../ledger/ledger.constants';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';

const ACTIVE_STATUSES: CreditRequest['status'][] = ['PENDING', 'APPROVED'];

// Régule l'accès au crédit par une demande explicite du client (CLAUDE.md) : plus de
// verrouillage instantané en self-service — le client indique le gage souhaité, un compte
// ADMIN valide la demande (AdminGuard sur listPending/approve/reject, cf. §5 Rôles
// d'accès), puis seulement à ce moment le client obtient une adresse de dépôt dédiée à
// cette demande. Le crédit est émis automatiquement dès qu'un dépôt (crypto ou carte)
// porte le solde disponible au niveau requis — jamais manuellement.
@Injectable()
export class CreditRequestsService {
  private readonly logger = new Logger(CreditRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
    private readonly creditEngineService: CreditEngineService,
    private readonly walletService: WalletService,
  ) {}

  // Une seule demande active (PENDING ou APPROVED non honorée) par client à la fois :
  // évite toute ambiguïté sur la demande qu'un dépôt donné doit honorer.
  async createRequest(
    userId: string,
    collateralAmount: Prisma.Decimal.Value,
    currency: AccountCurrency = 'USD',
  ): Promise<CreditRequest> {
    const amount = toPositiveDecimal(collateralAmount);
    const active = await this.prisma.creditRequest.findFirst({
      where: { userId, status: { in: ACTIVE_STATUSES } },
    });
    if (active) {
      throw new ActiveCreditRequestExistsException(userId);
    }
    return this.prisma.creditRequest.create({
      data: { userId, collateralAmount: amount, currency },
    });
  }

  async listForUser(userId: string): Promise<CreditRequest[]> {
    return this.prisma.creditRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listPending(): Promise<CreditRequest[]> {
    return this.prisma.creditRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approve(requestId: string): Promise<CreditRequest> {
    const result = await this.prisma.creditRequest.updateMany({
      where: { id: requestId, status: 'PENDING' },
      data: { status: 'APPROVED', validatedAt: new Date() },
    });
    if (result.count === 0) {
      await this.assertExists(requestId);
      throw new CreditRequestNotPendingException(requestId);
    }
    return this.prisma.creditRequest.findUniqueOrThrow({
      where: { id: requestId },
    });
  }

  async reject(requestId: string): Promise<CreditRequest> {
    const result = await this.prisma.creditRequest.updateMany({
      where: { id: requestId, status: 'PENDING' },
      data: { status: 'REJECTED', validatedAt: new Date() },
    });
    if (result.count === 0) {
      await this.assertExists(requestId);
      throw new CreditRequestNotPendingException(requestId);
    }
    return this.prisma.creditRequest.findUniqueOrThrow({
      where: { id: requestId },
    });
  }

  // N'accorde une adresse de dépôt qu'une fois la demande approuvée — c'est la validation
  // qui débloque l'accès au dépôt, jamais l'inverse. Fige l'actif de gage de la demande
  // au premier appel (nécessaire pour que le rendement indexé sur la performance réelle
  // du gage sache sans ambiguïté quel actif suivre, cf. CollateralYieldService) : un appel
  // ultérieur avec un actif différent est refusé plutôt qu'accepté silencieusement.
  async generateDepositAddress(
    requestId: string,
    chain: Chain,
    currency: AcceptedCurrency,
    currentUser: AuthenticatedUser,
  ): Promise<Wallet> {
    const request = await this.prisma.creditRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) {
      throw new CreditRequestNotFoundException(requestId);
    }
    assertSelfOrAdmin(currentUser, request.userId);
    if (request.status !== 'APPROVED') {
      throw new CreditRequestNotApprovedException(requestId);
    }
    if (request.collateralCurrency && request.collateralCurrency !== currency) {
      throw new CollateralCurrencyMismatchException(
        requestId,
        request.collateralCurrency,
        currency,
      );
    }
    if (!request.collateralCurrency) {
      await this.prisma.creditRequest.update({
        where: { id: requestId },
        data: { collateralCurrency: currency },
      });
    }
    return this.walletService.createDepositAddress(
      request.userId,
      chain,
      currency,
    );
  }

  // Appelé après tout crédit du solde disponible (dépôt crypto confirmé, recharge carte
  // confirmée) : si ce dépôt porte le solde au niveau requis par une demande APPROVED de
  // cet utilisateur, émet automatiquement le crédit pour cette demande — jamais de geste
  // manuel du client à cette étape.
  async tryAutoFulfill(userId: string): Promise<void> {
    const request = await this.prisma.creditRequest.findFirst({
      where: { userId, status: 'APPROVED' },
    });
    if (!request) {
      return;
    }

    const balance = await this.ledgerService.getBalance(userId);
    const collateralAmount = new Prisma.Decimal(request.collateralAmount);
    const creditToIssue = collateralAmount.times(CREDIT_RATIO);
    const estimatedOriginationFee = creditToIssue
      .times(ORIGINATION_FEE_PCT)
      .dividedBy(100);
    const requiredBalance = collateralAmount.plus(estimatedOriginationFee);

    if (
      new Prisma.Decimal(balance.availableBalance).lessThan(requiredBalance)
    ) {
      // Solde encore insuffisant (frais d'origination inclus) : en attente d'un dépôt
      // complémentaire, aucune erreur.
      return;
    }

    // Réclame atomiquement la demande avant d'émettre le crédit : si deux dépôts
    // déclenchent tryAutoFulfill en même temps (ex: webhook crypto + confirmation carte
    // proches), un seul des deux appels obtient count === 1 et procède réellement.
    const claim = await this.prisma.creditRequest.updateMany({
      where: { id: request.id, status: 'APPROVED' },
      data: { status: 'FULFILLED', fulfilledAt: new Date() },
    });
    if (claim.count === 0) {
      return;
    }

    try {
      const { position } =
        await this.creditEngineService.lockCollateralAndIssueCredit(
          userId,
          collateralAmount,
          request.currency,
          request.collateralCurrency ?? undefined,
        );
      await this.prisma.creditRequest.update({
        where: { id: request.id },
        data: { creditPositionId: position.id },
      });
    } catch (error) {
      // Émission échouée après la réclamation (ex: solde finalement insuffisant sous
      // concurrence) : remet la demande en APPROVED pour qu'un prochain dépôt retente,
      // plutôt que de la laisser bloquée en FULFILLED sans position de crédit.
      this.logger.error(
        `Échec de l'émission automatique du crédit pour la demande ${request.id}, remise en APPROVED pour nouvelle tentative`,
        error instanceof Error ? error.stack : undefined,
      );
      await this.prisma.creditRequest.updateMany({
        where: {
          id: request.id,
          status: 'FULFILLED',
          creditPositionId: null,
        },
        data: { status: 'APPROVED', fulfilledAt: null },
      });
    }
  }

  private async assertExists(requestId: string): Promise<void> {
    const existing = await this.prisma.creditRequest.findUnique({
      where: { id: requestId },
    });
    if (!existing) {
      throw new CreditRequestNotFoundException(requestId);
    }
  }
}
