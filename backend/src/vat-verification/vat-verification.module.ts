import { Module } from '@nestjs/common';
import { VatVerificationController } from './vat-verification.controller';
import { VatVerificationService } from './vat-verification.service';

@Module({
  controllers: [VatVerificationController],
  providers: [VatVerificationService],
})
export class VatVerificationModule {}
