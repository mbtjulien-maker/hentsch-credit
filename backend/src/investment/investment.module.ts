import { Module } from '@nestjs/common';
import { LedgerModule } from '../ledger/ledger.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { StockMarketDataModule } from '../stock-market-data/stock-market-data.module';
import { TreasuryBotModule } from '../treasury-bot/treasury-bot.module';
import {
  AdminFixedTermPositionsController,
  AdminInvestmentPositionsController,
  InvestmentController,
  UserFixedTermPositionsController,
  UserInvestmentPerformanceController,
  UserInvestmentPositionsController,
  UserInvestmentStatementController,
} from './investment.controller';
import { InvestmentService } from './investment.service';
import { InvestmentStatementService } from './investment-statement.service';
import { FixedTermPlanService } from './fixed-term-plan.service';

@Module({
  imports: [
    LedgerModule,
    MarketDataModule,
    StockMarketDataModule,
    TreasuryBotModule,
  ],
  controllers: [
    InvestmentController,
    UserInvestmentPositionsController,
    UserInvestmentPerformanceController,
    UserInvestmentStatementController,
    AdminInvestmentPositionsController,
    UserFixedTermPositionsController,
    AdminFixedTermPositionsController,
  ],
  providers: [InvestmentService, FixedTermPlanService, InvestmentStatementService],
  exports: [InvestmentService, FixedTermPlanService],
})
export class InvestmentModule {}
