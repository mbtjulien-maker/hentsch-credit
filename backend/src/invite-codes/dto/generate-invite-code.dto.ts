import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AccountType } from '@prisma/client';

// Générée à la demande par un conseiller (cf. §6 CLAUDE.md entrée #40) — jamais un lot
// automatique : un code correspond à une invitation individuelle, dont le conseiller
// connaît déjà le profil (d'où accountType fixé ici, jamais redemandé au client).
export class GenerateInviteCodeDto {
  @IsEnum(AccountType)
  accountType: AccountType;

  // Repère interne (ex. "Jean Dupont, contact du 02/09") — jamais montré au client.
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}
