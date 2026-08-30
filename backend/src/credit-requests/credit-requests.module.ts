import { Module } from '@nestjs/common';
import { CreditEngineModule } from '../credit/credit-engine.module';
import { LedgerModule } from '../ledger/ledger.module';
import { WalletModule } from '../wallet/wallet.module';
import { CreditRequestsController } from './credit-requests.controller';
import { CreditRequestsService } from './credit-requests.service';

@Module({
  imports: [LedgerModule, CreditEngineModule, WalletModule],
  controllers: [CreditRequestsController],
  providers: [CreditRequestsService],
  exports: [CreditRequestsService],
})
export class CreditRequestsModule {}
