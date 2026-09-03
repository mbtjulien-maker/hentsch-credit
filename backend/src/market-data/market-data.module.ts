import { Module } from '@nestjs/common';
import { StockMarketDataModule } from '../stock-market-data/stock-market-data.module';
import { MarketDataController } from './market-data.controller';
import { MarketDataService } from './market-data.service';

@Module({
  imports: [StockMarketDataModule],
  controllers: [MarketDataController],
  providers: [MarketDataService],
  exports: [MarketDataService],
})
export class MarketDataModule {}
