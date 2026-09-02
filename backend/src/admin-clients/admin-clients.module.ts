import { Module } from '@nestjs/common';
import { KycDocumentsModule } from '../kyc-documents/kyc-documents.module';
import { AdminClientsController } from './admin-clients.controller';
import { AdminClientsService } from './admin-clients.service';

@Module({
  imports: [KycDocumentsModule],
  controllers: [AdminClientsController],
  providers: [AdminClientsService],
  exports: [AdminClientsService],
})
export class AdminClientsModule {}
