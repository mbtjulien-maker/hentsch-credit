import { Module } from '@nestjs/common';
import { StockMarketDataService } from './stock-market-data.service';

@Module({
  providers: [StockMarketDataService],
  exports: [StockMarketDataService],
})
export class StockMarketDataModule {}
