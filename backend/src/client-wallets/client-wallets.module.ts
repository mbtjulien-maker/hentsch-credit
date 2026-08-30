import { Module } from '@nestjs/common';
import { ClientWalletsController } from './client-wallets.controller';
import { ClientWalletsService } from './client-wallets.service';

@Module({
  controllers: [ClientWalletsController],
  providers: [ClientWalletsService],
  exports: [ClientWalletsService],
})
export class ClientWalletsModule {}
