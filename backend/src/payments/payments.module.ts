import { Module } from '@nestjs/common';
import { CreditRequestsModule } from '../credit-requests/credit-requests.module';
import { LedgerModule } from '../ledger/ledger.module';
import { MollieService } from './mollie.service';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [LedgerModule, CreditRequestsModule],
  controllers: [PaymentsController],
  providers: [MollieService],
})
export class PaymentsModule {}
