import { Module } from '@nestjs/common';
import { LedgerModule } from '../ledger/ledger.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { CollateralYieldService } from './collateral-yield.service';
import { CreditController } from './credit.controller';
import { CreditEngineService } from './credit-engine.service';
import { LiquidationService } from './liquidation.service';

@Module({
  imports: [LedgerModule, MarketDataModule],
  controllers: [CreditController],
  providers: [CreditEngineService, CollateralYieldService, LiquidationService],
  exports: [CreditEngineService, CollateralYieldService, LiquidationService],
})
export class CreditEngineModule {}
