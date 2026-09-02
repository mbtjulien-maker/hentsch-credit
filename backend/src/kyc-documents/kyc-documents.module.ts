import { Module } from '@nestjs/common';
import { KycDocumentsController } from './kyc-documents.controller';
import { KycDocumentsService } from './kyc-documents.service';

// Service exporté pour être réutilisé par AdminClientsController (mêmes fichiers, vue
// back-office) — jamais une seconde implémentation parallèle du stockage/de la
// validation des fichiers, cf. §6 entrée #36 CLAUDE.md.
@Module({
  controllers: [KycDocumentsController],
  providers: [KycDocumentsService],
  exports: [KycDocumentsService],
})
export class KycDocumentsModule {}
