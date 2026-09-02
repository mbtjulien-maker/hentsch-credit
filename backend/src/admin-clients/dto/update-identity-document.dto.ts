import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  IDENTITY_CHECK_METHODS,
  IDENTITY_DOCUMENT_TYPES,
  PROOF_OF_ADDRESS_TYPES,
} from '../../common/kyc.constants';

// Back-office — mêmes champs que UpdateOwnIdentityDocumentDto, plus `verified` :
// seul un admin peut certifier une pièce d'identité vérifiée (cf. dossier KYC papier §4,
// §6 entrée #33).
export class UpdateIdentityDocumentDto {
  @IsOptional()
  @IsIn(IDENTITY_DOCUMENT_TYPES)
  documentType?: (typeof IDENTITY_DOCUMENT_TYPES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(50)
  documentNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  issuingAuthority?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  issuePlace?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsIn(IDENTITY_CHECK_METHODS)
  identityCheckMethod?: (typeof IDENTITY_CHECK_METHODS)[number];

  @IsOptional()
  @IsIn(PROOF_OF_ADDRESS_TYPES)
  proofOfAddressType?: (typeof PROOF_OF_ADDRESS_TYPES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(150)
  proofOfAddressIssuer?: string;

  @IsOptional()
  @IsDateString()
  proofOfAddressDate?: string;

  @IsOptional()
  @IsBoolean()
  verified?: boolean;
}
