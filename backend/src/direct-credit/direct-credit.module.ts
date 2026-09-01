import { Module } from '@nestjs/common';
import { AdminDirectCreditController } from './admin-direct-credit.controller';
import {
  DirectCreditController,
  UserDirectCreditRequestsController,
} from './direct-credit.controller';
import { DirectCreditService } from './direct-credit.service';

@Module({
  controllers: [
    DirectCreditController,
    UserDirectCreditRequestsController,
    AdminDirectCreditController,
  ],
  providers: [DirectCreditService],
  exports: [DirectCreditService],
})
export class DirectCreditModule {}
