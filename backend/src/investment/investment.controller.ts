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
import { INDICATIVE_ANNUAL_YIELD_PCT } from './investment.constants';
import { DepositInvestmentDto } from './dto/deposit-investment.dto';
import { WithdrawInvestmentDto } from './dto/withdraw-investment.dto';
import { InvestmentService } from './investment.service';
import { StockMarketDataService } from '../stock-market-data/stock-market-data.service';
import { TreasuryBotService } from '../treasury-bot/treasury-bot.service';

// Ouvert aux comptes PARTICULIER et BUSINESS (contrairement au crédit direct, réservé
// BUSINESS via BusinessAccountGuard) — seule l'identité vérifiée compte ici, même
// exigence que le crédit gagé (KycVerifiedGuard).
@UseGuards(JwtAuthGuard, KycVerifiedGuard)
@Controller('investment')
export class InvestmentController {
  constructor(
    private readonly investmentService: InvestmentService,
    private readonly treasuryBotService: TreasuryBotService,
    private readonly stockMarketDataService: StockMarketDataService,
  ) {}

  @Post('deposit')
  deposit(
    @Body() dto: DepositInvestmentDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.investmentService.deposit(
      currentUser.id,
      dto.basket,
      dto.amount,
    );
  }

  @Post('withdraw')
  withdraw(
    @Body() dto: WithdrawInvestmentDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.investmentService.withdraw(currentUser.id, dto.basket);
  }

  // Rendement indicatif par panier, consulté par le formulaire client avant placement —
  // même principe que GET /credit/rates : afficher les seuils/objectifs réels plutôt que
  // les deviner côté frontend. `latestDailyReturnPct` reflète le dernier passage réel
  // connu (peut être négatif) ; `indicativeAnnualPct` est l'hypothèse de stratégie
  // affichée à titre informatif, jamais une garantie (cf. INDICATIVE_ANNUAL_YIELD_PCT).
  @Get('rates')
  async getRates() {
    const [latestRwaRun, latestStockRun] = await Promise.all([
      this.treasuryBotService.getHistory(1),
      this.stockMarketDataService.getBasketMarketSignal(),
    ]);

    return {
      RWA_STRATEGY: {
        indicativeAnnualPct:
          INDICATIVE_ANNUAL_YIELD_PCT.RWA_STRATEGY.toString(),
        latestDailyReturnPct:
          latestRwaRun[0]?.blendedReturnPct.toString() ?? null,
      },
      STOCKS: {
        indicativeAnnualPct: INDICATIVE_ANNUAL_YIELD_PCT.STOCKS.toString(),
        latestMarketSignalPct:
          latestStockRun !== null ? latestStockRun.toString() : null,
      },
    };
  }
}

@UseGuards(JwtAuthGuard)
@Controller('users/:userId/investment-positions')
export class UserInvestmentPositionsController {
  constructor(private readonly investmentService: InvestmentService) {}

  @Get()
  list(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    assertSelfOrAdmin(currentUser, userId);
    return this.investmentService.listForUser(userId);
  }
}

// Lecture seule back-office — pas de file à approuver (le placement est immédiat côté
// client, comme le crédit direct), cet endpoint sert à l'audit/suivi des positions.
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/investment-positions')
export class AdminInvestmentPositionsController {
  constructor(private readonly investmentService: InvestmentService) {}

  @Get()
  list() {
    return this.investmentService.listAll();
  }

  // Déclenchement manuel du passage d'accrual (cf. InvestmentService.runDailyAccrual,
  // qui tourne aussi quotidiennement via @Cron) — utile pour le back-office et la
  // vérification, sans attendre le prochain passage planifié (même principe que
  // POST /credit/yield/run).
  @Post('accrual/run')
  runAccrual() {
    return this.investmentService.runDailyAccrual();
  }
}
