import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { assertSelfOrAdmin } from '../auth/ownership.util';
import { AdminGuard } from '../common/guards/admin.guard';
import { KycVerifiedGuard } from '../common/guards/kyc-verified.guard';
import { CreditRequestsService } from './credit-requests.service';
import { CreateCreditRequestDto } from './dto/create-credit-request.dto';
import { GenerateRequestDepositAddressDto } from './dto/generate-request-deposit-address.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class CreditRequestsController {
  constructor(private readonly creditRequestsService: CreditRequestsService) {}

  // Bloque l'octroi de crédit tant que le KYC n'est pas VERIFIED (cf. CLAUDE.md §5,
  // KycVerifiedGuard) — un client non vérifié ne peut pas soumettre de demande.
  @UseGuards(KycVerifiedGuard)
  @Post('credit-requests')
  create(
    @Body() dto: CreateCreditRequestDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.creditRequestsService.createRequest(
      currentUser.id,
      dto.collateralAmount,
      dto.currency,
    );
  }

  @Get('users/:userId/credit-requests')
  listForUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    assertSelfOrAdmin(currentUser, userId);
    return this.creditRequestsService.listForUser(userId);
  }

  // File d'attente de validation back-office — réservée aux comptes ADMIN (AdminGuard),
  // cf. §5 Rôles d'accès.
  @UseGuards(AdminGuard)
  @Get('credit-requests/pending')
  listPending() {
    return this.creditRequestsService.listPending();
  }

  @UseGuards(AdminGuard)
  @Post('credit-requests/:id/approve')
  approve(@Param('id', ParseUUIDPipe) id: string) {
    return this.creditRequestsService.approve(id);
  }

  @UseGuards(AdminGuard)
  @Post('credit-requests/:id/reject')
  reject(@Param('id', ParseUUIDPipe) id: string) {
    return this.creditRequestsService.reject(id);
  }

  // Bloque la génération d'adresse de dépôt tant que le KYC n'est pas VERIFIED (cf.
  // CLAUDE.md §5, KycVerifiedGuard).
  @UseGuards(KycVerifiedGuard)
  @Post('credit-requests/:id/deposit-address')
  generateDepositAddress(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GenerateRequestDepositAddressDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.creditRequestsService.generateDepositAddress(
      id,
      dto.chain,
      dto.currency,
      currentUser,
    );
  }
}
