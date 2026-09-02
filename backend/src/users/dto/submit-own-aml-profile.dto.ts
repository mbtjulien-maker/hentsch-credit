import {
  ArrayMaxSize,
  Equals,
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

// Auto-service — profil de conformité LCB-FT/PPE (cf. dossier KYC papier §5-6, §6
// entrée #33). `confirmAttestation` doit valoir strictement `true` (case "Lu et
// approuvé" cochée) pour que la soumission soit acceptée — cf. UsersService.
// submitAmlProfile, qui horodate `attestedAt` uniquement si cette validation passe.
// `riskLevel`/`reviewDecision` n'apparaissent volontairement pas ici : réservés à
// l'admin (cf. dossier papier, "Cadre réservé à la banque").
export class SubmitOwnAmlProfileDto {
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

  // Case "Lu et approuvé" — cf. commentaire de classe ci-dessus.
  @Equals(true, {
    message:
      "L'attestation « Lu et approuvé » doit être cochée pour soumettre le dossier.",
  })
  confirmAttestation: boolean;
}
