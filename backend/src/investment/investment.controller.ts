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
import {
  INDICATIVE_ANNUAL_YIELD_PCT,
  MIN_INVESTMENT_AMOUNT_USD,
  RISK_LEVEL,
} from './investment.constants';
import { DepositInvestmentDto } from './dto/deposit-investment.dto';
import { WithdrawInvestmentDto } from './dto/withdraw-investment.dto';
import { InvestmentService } from './investment.service';
import { MarketDataService } from '../market-data/market-data.service';
import {
  STOCK_NAMES,
  STOCK_SUB_BASKET_IDS,
} from '../stock-market-data/stock-market-data.constants';
import { StockMarketDataService } from '../stock-market-data/stock-market-data.service';
import { TREASURY_BOT_BASKET } from '../treasury-bot/treasury-bot.constants';
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
    private readonly marketDataService: MarketDataService,
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
  // les deviner côté frontend. `latestDailyReturnPct`/`latestMarketSignalPct` reflètent le
  // dernier passage réel connu (peut être négatif) — pour les 5 paniers STOCKS*, relu
  // depuis StockBasketRun (déjà persisté par l'accrual quotidien) plutôt qu'un appel
  // Finnhub en direct à chaque consultation. `indicativeAnnualPct` est l'hypothèse de
  // stratégie affichée à titre informatif, jamais une garantie (cf.
  // INDICATIVE_ANNUAL_YIELD_PCT).
  @Get('rates')
  async getRates() {
    const [latestRwaRun, ...latestStockRuns] = await Promise.all([
      this.treasuryBotService.getHistory(1),
      ...STOCK_SUB_BASKET_IDS.map((basket) =>
        this.investmentService.getLatestStockBasketRun(basket),
      ),
    ]);

    const rates: Record<string, unknown> = {
      minAmountUsd: MIN_INVESTMENT_AMOUNT_USD.toString(),
      RWA_STRATEGY: {
        indicativeAnnualPct:
          INDICATIVE_ANNUAL_YIELD_PCT.RWA_STRATEGY.toString(),
        latestDailyReturnPct:
          latestRwaRun[0]?.blendedReturnPct.toString() ?? null,
        riskLevel: RISK_LEVEL.RWA_STRATEGY,
      },
    };

    STOCK_SUB_BASKET_IDS.forEach((basket, index) => {
      const latestRun = latestStockRuns[index];
      rates[basket] = {
        indicativeAnnualPct: INDICATIVE_ANNUAL_YIELD_PCT[basket].toString(),
        latestMarketSignalPct: latestRun?.marketSignalPct.toString() ?? null,
        riskLevel: RISK_LEVEL[basket],
      };
    });

    return rates;
  }

  // Historique réel du rendement quotidien de chaque panier (30 derniers jours) — pas un
  // cours d'actif, mais la même série que celle réellement appliquée par
  // InvestmentService.runDailyAccrual à chaque position active. Sert de base à une
  // tendance visuelle (cf. MiniSparkline côté frontend), jamais un point de donnée
  // fabriqué : un panier trop récent (moins de 2 points) renvoie un tableau court plutôt
  // qu'une série interpolée.
  @Get('history')
  async getHistory() {
    const [rwaRuns, ...stockHistories] = await Promise.all([
      this.treasuryBotService.getHistory(30),
      ...STOCK_SUB_BASKET_IDS.map((basket) =>
        this.investmentService.getStockBasketHistory(basket, 30),
      ),
    ]);

    const history: Record<string, unknown> = {
      RWA_STRATEGY: rwaRuns.map((run) => ({
        date: run.runDate.toISOString(),
        returnPct: run.blendedReturnPct.toString(),
      })),
    };

    STOCK_SUB_BASKET_IDS.forEach((basket, index) => {
      history[basket] = stockHistories[index].map((run) => ({
        date: run.runDate.toISOString(),
        returnPct: run.dailyReturnPct.toString(),
      }));
    });

    return history;
  }

  // Détail des actifs réellement impliqués dans chaque panier — au-delà du chiffre agrégé
  // de GET /investment/rates, pour montrer concrètement à quoi correspond la stratégie
  // (cf. demande client : "en dire plus sur les stratégies"). RWA_STRATEGY réutilise
  // MarketDataService.getMarketOverview() (même source que la vue "Marché en temps réel"
  // du dashboard), filtrée sur les 4 actifs de TREASURY_BOT_BASKET ; chaque panier
  // STOCKS* réutilise StockMarketDataService.getBasketQuotes() (Finnhub, cf. §2H
  // CLAUDE.md, STOCK_SUB_BASKETS). Chaque actif omis silencieusement s'il n'a pas de
  // cours disponible — jamais un prix inventé.
  @Get('assets')
  async getAssets() {
    const [overview, ...stockQuotesByBasket] = await Promise.all([
      this.marketDataService.getMarketOverview(),
      ...STOCK_SUB_BASKET_IDS.map((basket) =>
        this.stockMarketDataService.getBasketQuotes(basket),
      ),
    ]);

    const rwaAssets = TREASURY_BOT_BASKET.map((currency) =>
      overview.find((entry) => entry.currency === currency),
    )
      .filter((entry): entry is NonNullable<typeof entry> => entry != null)
      .map((entry) => ({
        currency: entry.currency,
        name: entry.name,
        image: entry.image,
        price: entry.usdPrice?.toString() ?? null,
        changePct: entry.change24hPct,
      }));

    const assets: Record<string, { assets: unknown[] }> = {
      RWA_STRATEGY: { assets: rwaAssets },
    };

    STOCK_SUB_BASKET_IDS.forEach((basket, index) => {
      const quotes = stockQuotesByBasket[index];
      assets[basket] = {
        assets: quotes.map((q) => ({
          ticker: q.ticker,
          name: STOCK_NAMES[q.ticker],
          price: q.price,
          changePct: q.changePct,
        })),
      };
    });

    return assets;
  }

  // Plans à échéance fixe (cf. §2H CLAUDE.md entrée #29) — un DEUXIÈME mode de placement,
  // purement illustratif : aucun dépôt réel, aucune position persistée, contrairement aux
  // 6 paniers ci-dessus. Consommé par le simulateur (InvestmentAdvisorDialog) et par une
  // section dédiée du dashboard pour projeter un gain sur une durée fixe (3/6/12 mois).
  @Get('fixed-term-plans')
  async getFixedTermPlans() {
    return this.investmentService.getFixedTermPlans();
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
