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
  UserInvestmentPositionsController,
} from './investment.controller';
import { InvestmentService } from './investment.service';
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
    AdminInvestmentPositionsController,
    UserFixedTermPositionsController,
    AdminFixedTermPositionsController,
  ],
  providers: [InvestmentService, FixedTermPlanService],
  exports: [InvestmentService, FixedTermPlanService],
})
export class InvestmentModule {}
