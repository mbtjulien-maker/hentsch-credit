import { IsEnum } from 'class-validator';
import { KycDocumentCategory } from '@prisma/client';

// Champ texte du formulaire multipart (à côté du fichier lui-même, cf.
// FileInterceptor('file') dans le contrôleur) — IDENTITY_FRONT | IDENTITY_BACK |
// PROOF_OF_ADDRESS, cf. §6 entrée #36 CLAUDE.md.
export class UploadKycDocumentDto {
  @IsEnum(KycDocumentCategory)
  category: KycDocumentCategory;
}
