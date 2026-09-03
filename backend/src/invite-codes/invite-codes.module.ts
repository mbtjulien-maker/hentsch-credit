import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { InviteCodesController } from './invite-codes.controller';
import { InviteCodesService } from './invite-codes.service';
import { KycDossierPdfService } from './kyc-dossier-pdf.service';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [InviteCodesController],
  providers: [InviteCodesService, KycDossierPdfService],
})
export class InviteCodesModule {}
