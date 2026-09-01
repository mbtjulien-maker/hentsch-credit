import { Module } from '@nestjs/common';
import { LedgerModule } from '../ledger/ledger.module';
import { StockMarketDataModule } from '../stock-market-data/stock-market-data.module';
import { TreasuryBotModule } from '../treasury-bot/treasury-bot.module';
import {
  AdminInvestmentPositionsController,
  InvestmentController,
  UserInvestmentPositionsController,
} from './investment.controller';
import { InvestmentService } from './investment.service';

@Module({
  imports: [LedgerModule, StockMarketDataModule, TreasuryBotModule],
  controllers: [
    InvestmentController,
    UserInvestmentPositionsController,
    AdminInvestmentPositionsController,
  ],
  providers: [InvestmentService],
  exports: [InvestmentService],
})
export class InvestmentModule {}
