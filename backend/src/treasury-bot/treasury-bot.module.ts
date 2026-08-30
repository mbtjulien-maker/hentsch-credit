import { Module } from '@nestjs/common';
import { MarketDataModule } from '../market-data/market-data.module';
import { TreasuryBotController } from './treasury-bot.controller';
import { TreasuryBotService } from './treasury-bot.service';

@Module({
  imports: [MarketDataModule],
  controllers: [TreasuryBotController],
  providers: [TreasuryBotService],
  exports: [TreasuryBotService],
})
export class TreasuryBotModule {}
