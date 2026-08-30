import { Module } from '@nestjs/common';
import { LedgerModule } from '../ledger/ledger.module';
import { WithdrawalController } from './withdrawal.controller';
import { WithdrawalService } from './withdrawal.service';

@Module({
  imports: [LedgerModule],
  controllers: [WithdrawalController],
  providers: [WithdrawalService],
})
export class WithdrawalModule {}
