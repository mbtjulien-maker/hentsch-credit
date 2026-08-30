import { Injectable } from '@nestjs/common';
import { AccountOpeningRequest } from '@prisma/client';
import {
  AccountAlreadyExistsException,
  AccountRequestNotFoundException,
  AccountRequestNotPendingException,
  ActiveAccountRequestExistsException,
} from '../common/exceptions/account-request.exceptions';
import {
  generateTemporaryPassword,
  hashPassword,
} from '../common/password.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountRequestDto } from './dto/create-account-request.dto';

export interface ApproveAccountRequestResult {
  request: AccountOpeningRequest;
  // Retourné une seule fois, à cet instant précis — jamais stocké en clair (cf.
  // password.util.ts), jamais rejoué sur un GET ultérieur. Le back-office doit le
  // communiquer au client hors-bande (aucun service d'e-mail branché à ce stade).
  temporaryPassword: string;
}

// Formulaire public "Demander l'ouverture d'un compte" (cf. app/page.tsx) — pas
// d'auto-inscription : la demande reste PENDING jusqu'à validation manuelle du dossier
// par un compte ADMIN (AccountRequestsController), qui seule crée réellement le User.
@Injectable()
export class AccountRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAccountRequestDto): Promise<AccountOpeningRequest> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new AccountAlreadyExistsException(dto.email);
    }

    const activePending = await this.prisma.accountOpeningRequest.findFirst({
      where: { email: dto.email, status: 'PENDING' },
    });
    if (activePending) {
      throw new ActiveAccountRequestExistsException(dto.email);
    }

    return this.prisma.accountOpeningRequest.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        message: dto.message,
      },
    });
  }

  async listPending(): Promise<AccountOpeningRequest[]> {
    return this.prisma.accountOpeningRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Crée réellement le compte (User + LedgerBalance vide, statut KYC PENDING — la
  // vérification d'identité reste un chantier séparé, cf. §5) et génère un mot de passe
  // temporaire à usage unique. Toute la création est atomique : pas de demande marquée
  // APPROVED sans le User correspondant, ni l'inverse.
  async approve(requestId: string): Promise<ApproveAccountRequestResult> {
    const request = await this.prisma.accountOpeningRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) {
      throw new AccountRequestNotFoundException(requestId);
    }
    if (request.status !== 'PENDING') {
      throw new AccountRequestNotPendingException(requestId);
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: request.email },
    });
    if (existingUser) {
      throw new AccountAlreadyExistsException(request.email);
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    const updatedRequest = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: request.email,
          passwordHash,
          kycStatus: 'PENDING',
          role: 'CLIENT',
          ledgerBalance: { create: {} },
        },
      });
      return tx.accountOpeningRequest.update({
        where: { id: requestId },
        data: { status: 'APPROVED', reviewedAt: new Date(), userId: user.id },
      });
    });

    return { request: updatedRequest, temporaryPassword };
  }

  async reject(requestId: string): Promise<AccountOpeningRequest> {
    const result = await this.prisma.accountOpeningRequest.updateMany({
      where: { id: requestId, status: 'PENDING' },
      data: { status: 'REJECTED', reviewedAt: new Date() },
    });
    if (result.count === 0) {
      await this.assertExists(requestId);
      throw new AccountRequestNotPendingException(requestId);
    }
    return this.prisma.accountOpeningRequest.findUniqueOrThrow({
      where: { id: requestId },
    });
  }

  private async assertExists(requestId: string): Promise<void> {
    const existing = await this.prisma.accountOpeningRequest.findUnique({
      where: { id: requestId },
    });
    if (!existing) {
      throw new AccountRequestNotFoundException(requestId);
    }
  }
}
