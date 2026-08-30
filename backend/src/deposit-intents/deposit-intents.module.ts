import { Module } from '@nestjs/common';
import { ClientWalletsModule } from '../client-wallets/client-wallets.module';
import { CreditRequestsModule } from '../credit-requests/credit-requests.module';
import { LedgerModule } from '../ledger/ledger.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { AdminDepositIntentsController } from './admin-deposit-intents.controller';
import {
  DepositIntentsController,
  ManagedDepositAddressesController,
} from './deposit-intents.controller';
import { DepositIntentsService } from './deposit-intents.service';

@Module({
  imports: [
    LedgerModule,
    MarketDataModule,
    CreditRequestsModule,
    ClientWalletsModule,
  ],
  controllers: [
    ManagedDepositAddressesController,
    DepositIntentsController,
    AdminDepositIntentsController,
  ],
  providers: [DepositIntentsService],
  exports: [DepositIntentsService],
})
export class DepositIntentsModule {}
