import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AccountCurrency } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CollateralYieldService } from './collateral-yield.service';
import { CreditEngineService } from './credit-engine.service';
import { RepayCreditDto } from './dto/repay-credit.dto';
import { MarketDataService } from '../market-data/market-data.service';
import {
  CUSTODY_FEE_PCT,
  ORIGINATION_FEE_PCT,
  getInterestRatePct,
} from './rate.constants';

@Controller('credit')
export class CreditController {
  constructor(
    private readonly creditEngineService: CreditEngineService,
    private readonly marketDataService: MarketDataService,
    private readonly collateralYieldService: CollateralYieldService,
  ) {}

  // Structure de taux courante, par devise — exposée pour affichage (dashboard),
  // jamais pour recalculer une position déjà verrouillée (celles-ci gardent leur
  // taux figé au moment du verrouillage, cf. CreditPosition). Le cours EUR/USD
  // permet au front de convertir les montants affichés dans la devise choisie par
  // le client, en cohérence avec `creditIssuedInCurrency` calculé côté service au
  // verrouillage. Si le flux de change échoue, `eurPerUsd` vaut null — le front
  // retombe alors sur un affichage en USD (dégradation gracieuse déjà en place
  // pour les autres flux de marché). Public : aucune donnée par compte.
  @Get('rates')
  async getRates() {
    const currencies: AccountCurrency[] = ['USD', 'EUR'];
    const rates = Object.fromEntries(
      currencies.map((currency) => [
        currency,
        {
          interestRatePct: getInterestRatePct(currency),
          originationFeePct: ORIGINATION_FEE_PCT,
          custodyFeePct: CUSTODY_FEE_PCT,
        },
      ]),
    );

    let eurPerUsd: string | null = null;
    try {
      eurPerUsd = (await this.marketDataService.getEurPerUsd()).toString();
    } catch {
      eurPerUsd = null;
    }

    return { rates, eurPerUsd };
  }

  // Pas de verrouillage instantané en self-service : l'accès au crédit passe
  // obligatoirement par une demande (CreditRequestsController), validée puis honorée
  // automatiquement à réception du dépôt (cf. CreditRequestsService.tryAutoFulfill).
  // lockCollateralAndIssueCredit reste utilisé en interne par ce dernier uniquement.
  @UseGuards(JwtAuthGuard)
  @Post('repay')
  repay(
    @Body() dto: RepayCreditDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.creditEngineService.repayCreditAndUnlockCollateral(
      currentUser.id,
      dto.amount,
    );
  }

  // Déclenchement manuel du passage d'accrual de rendement (cf. CollateralYieldService,
  // qui tourne aussi quotidiennement via @Cron) — réservé aux comptes ADMIN, utile pour
  // le back-office et la vérification, sans attendre le prochain passage planifié.
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('yield/run')
  runYieldAccrual() {
    return this.collateralYieldService.runDailyAccrual();
  }
}
