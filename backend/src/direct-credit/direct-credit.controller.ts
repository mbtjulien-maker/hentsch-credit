import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AccountCurrency } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { assertSelfOrAdmin } from '../auth/ownership.util';
import { BusinessAccountGuard } from '../common/guards/business-account.guard';
import { KycVerifiedGuard } from '../common/guards/kyc-verified.guard';
import {
  DIRECT_CREDIT_ORIGINATION_FEE_PCT,
  DIRECT_CREDIT_TERM_MONTHS,
  MAX_DEBT_SERVICE_RATIO_PCT,
  MAX_REQUEST_TO_MONTHLY_REVENUE_MULTIPLE,
  MIN_COMPANY_SENIORITY_MONTHS,
  MIN_GUARANTEE_COVERAGE_PCT,
  MIN_MONTHLY_REVENUE,
  getDirectCreditInterestRatePct,
} from './direct-credit.constants';
import { DirectCreditService } from './direct-credit.service';
import { CreateDirectCreditRequestDto } from './dto/create-direct-credit-request.dto';

// Réservé aux comptes BUSINESS (cf. AccountType, BusinessAccountGuard) — le crédit
// direct finance des projets professionnels, jamais un compte particulier (cf. CLAUDE.md
// §2). KycVerifiedGuard en plus de BusinessAccountGuard : même exigence d'identité
// vérifiée que le crédit gagé (CreditRequestsController), pas de traitement de faveur
// pour ce produit.
@UseGuards(JwtAuthGuard, BusinessAccountGuard, KycVerifiedGuard)
@Controller('direct-credit-requests')
export class DirectCreditController {
  constructor(private readonly directCreditService: DirectCreditService) {}

  @Post()
  create(
    @Body() dto: CreateDirectCreditRequestDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.directCreditService.create(currentUser.id, dto);
  }

  // Conditions actuelles du crédit direct, par devise — consultées par le formulaire
  // client avant soumission pour afficher les seuils réels plutôt que les deviner dans le
  // frontend (même principe que GET /credit/rates pour le crédit gagé).
  @Get('rates/:currency')
  getRates(@Param('currency') currency: AccountCurrency) {
    return {
      interestRatePct: getDirectCreditInterestRatePct(currency).toString(),
      originationFeePct: DIRECT_CREDIT_ORIGINATION_FEE_PCT.toString(),
      termMonths: DIRECT_CREDIT_TERM_MONTHS,
      minCompanySeniorityMonths: MIN_COMPANY_SENIORITY_MONTHS,
      minMonthlyRevenue: MIN_MONTHLY_REVENUE[currency].toString(),
      maxRequestToMonthlyRevenueMultiple:
        MAX_REQUEST_TO_MONTHLY_REVENUE_MULTIPLE.toString(),
      maxDebtServiceRatioPct: MAX_DEBT_SERVICE_RATIO_PCT.toString(),
      minGuaranteeCoveragePct: MIN_GUARANTEE_COVERAGE_PCT.toString(),
    };
  }
}

@UseGuards(JwtAuthGuard)
@Controller('users/:userId/direct-credit-requests')
export class UserDirectCreditRequestsController {
  constructor(private readonly directCreditService: DirectCreditService) {}

  @Get()
  list(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    assertSelfOrAdmin(currentUser, userId);
    return this.directCreditService.listForUser(userId);
  }
}
