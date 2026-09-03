import { Type } from 'class-transformer';
import {
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { OwnAddressEntryDto } from '../../users/dto/update-own-addresses.dto';
import { UpdateOwnEmploymentDto } from '../../users/dto/update-own-employment.dto';
import { UpdateOwnIdentityDocumentDto } from '../../users/dto/update-own-identity-document.dto';
import { UpdateOwnProfileDto } from '../../users/dto/update-own-profile.dto';
import { SubmitOwnAmlProfileDto } from '../../users/dto/submit-own-aml-profile.dto';

// Finalisation de l'inscription (cf. §6 CLAUDE.md entrée #40) — un seul appel, une fois
// que le client a parcouru l'assistant progressif étape par étape côté frontend
// (identifiants, état civil, coordonnées, situation pro, pièces justificatives,
// conformité LCB-FT, récapitulatif). Le code est revérifié ici (jamais fait confiance à
// la validation précédente, cf. InviteCodesService.redeem) : un code peut expirer ou être
// consommé par ailleurs entre la validation initiale et la fin du parcours.
export class RedeemInviteCodeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  code: string;

  @IsEmail()
  email: string;

  // Choisi par le client lui-même (contrairement au mot de passe temporaire généré à
  // l'approbation de l'ancien formulaire public, cf. AccountRequestsService.approve) —
  // c'est lui qui remplit activement ce parcours, pas un conseiller en son absence.
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @ValidateNested()
  @Type(() => UpdateOwnProfileDto)
  profile: UpdateOwnProfileDto;

  // Domicile uniquement (cf. §6 entrée #24) — le multi-adresses fiscale/postale/
  // professionnelle reste un outil back-office, jamais demandé à l'inscription.
  @ValidateNested()
  @Type(() => OwnAddressEntryDto)
  address: OwnAddressEntryDto;

  @ValidateNested()
  @Type(() => UpdateOwnEmploymentDto)
  employment: UpdateOwnEmploymentDto;

  // Métadonnées déclaratives uniquement (type, numéro, dates...) — les VRAIS fichiers
  // (pièce d'identité, justificatif de domicile) se téléversent après activation du
  // compte sur /dashboard/kyc (cf. §6 entrée #36, KycDocumentsController), qui exige déjà
  // un userId existant.
  @ValidateNested()
  @Type(() => UpdateOwnIdentityDocumentDto)
  identityDocument: UpdateOwnIdentityDocumentDto;

  @ValidateNested()
  @Type(() => SubmitOwnAmlProfileDto)
  aml: SubmitOwnAmlProfileDto;
}
