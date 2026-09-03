import { Type } from 'class-transformer';
import { IsEmail, IsEnum, ValidateNested } from 'class-validator';
import { AccountType } from '@prisma/client';
import { OwnAddressEntryDto } from '../../users/dto/update-own-addresses.dto';
import { UpdateOwnEmploymentDto } from '../../users/dto/update-own-employment.dto';
import { UpdateOwnIdentityDocumentDto } from '../../users/dto/update-own-identity-document.dto';
import { UpdateOwnProfileDto } from '../../users/dto/update-own-profile.dto';
import { SubmitOwnAmlProfileDto } from '../../users/dto/submit-own-aml-profile.dto';

// Étape "Récapitulatif" de l'assistant d'inscription (cf. §6 CLAUDE.md entrée #40) — le
// client relit le dossier régénéré en PDF avec ses propres données AVANT que le compte ne
// soit réellement créé. Pas de `password`/`code` ici : cet aperçu ne consomme rien, il
// peut être régénéré autant de fois que le client revient en arrière pour corriger un champ.
export class PreviewKycDossierPdfDto {
  @IsEmail()
  email: string;

  @IsEnum(AccountType)
  accountType: AccountType;

  @ValidateNested()
  @Type(() => UpdateOwnProfileDto)
  profile: UpdateOwnProfileDto;

  @ValidateNested()
  @Type(() => OwnAddressEntryDto)
  address: OwnAddressEntryDto;

  @ValidateNested()
  @Type(() => UpdateOwnEmploymentDto)
  employment: UpdateOwnEmploymentDto;

  @ValidateNested()
  @Type(() => UpdateOwnIdentityDocumentDto)
  identityDocument: UpdateOwnIdentityDocumentDto;

  @ValidateNested()
  @Type(() => SubmitOwnAmlProfileDto)
  aml: SubmitOwnAmlProfileDto;
}
