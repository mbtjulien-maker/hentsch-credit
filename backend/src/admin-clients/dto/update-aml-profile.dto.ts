import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  FUNDS_ORIGINS,
  RELATIONSHIP_PURPOSES,
} from '../../common/kyc.constants';

// Back-office — édition directe du volet déclaratif du profil de conformité LCB-FT (cf.
// dossier KYC papier §5, §6 entrée #33), pour un conseiller qui saisit un dossier reçu
// hors-ligne (papier, agence). Ne couvre PAS `riskLevel`/`reviewDecision` — la décision
// de conformité passe par un endpoint dédié (POST .../kyc-decision) qui répercute aussi
// User.kycStatus, pour ne jamais désynchroniser les deux.
export class UpdateAmlProfileDto {
  @IsOptional()
  @IsBoolean()
  isPoliticallyExposed?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(FUNDS_ORIGINS.length)
  @IsIn(FUNDS_ORIGINS, { each: true })
  fundsOrigin?: (typeof FUNDS_ORIGINS)[number][];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  fundsOriginOther?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(RELATIONSHIP_PURPOSES.length)
  @IsIn(RELATIONSHIP_PURPOSES, { each: true })
  relationshipPurpose?: (typeof RELATIONSHIP_PURPOSES)[number][];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  attestationCity?: string;
}
