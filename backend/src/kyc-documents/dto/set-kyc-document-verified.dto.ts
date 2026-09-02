import { IsBoolean } from 'class-validator';

// Réservé admin (cf. AdminClientsController) — certifie/décertifie un fichier déjà
// téléversé, cf. §6 entrée #36 CLAUDE.md.
export class SetKycDocumentVerifiedDto {
  @IsBoolean()
  verified: boolean;
}
