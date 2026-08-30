import { Module } from '@nestjs/common';
import { CreditRequestsModule } from '../credit-requests/credit-requests.module';
import { LedgerModule } from '../ledger/ledger.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { BlockchainDepositController } from './blockchain-deposit.controller';
import { BlockchainDepositService } from './blockchain-deposit.service';
import { BlockchainWebhookSignatureGuard } from './blockchain-webhook-signature.guard';

@Module({
  imports: [LedgerModule, MarketDataModule, CreditRequestsModule],
  controllers: [BlockchainDepositController],
  providers: [BlockchainDepositService, BlockchainWebhookSignatureGuard],
})
export class WebhooksModule {}
