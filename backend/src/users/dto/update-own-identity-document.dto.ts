import {
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

// Auto-service — métadonnées déclaratives de la pièce d'identité et du justificatif de
// domicile (cf. dossier KYC papier §4, §6 entrée #33) ; le VRAI fichier se téléverse
// séparément via KycDocumentsController (cf. §6 entrée #36) — aucun fournisseur OCR
// n'est branché ici, donc aucune vérification automatique du contenu déclaré ci-dessous.
// `verified`/`verifiedAt` n'apparaissent volontairement pas dans ce DTO, réservés à
// l'admin (cf. UsersService.updateIdentityDocument, qui force verified à false à chaque
// écriture du client, même principe que Address.verified/Employment.verified).
export class UpdateOwnIdentityDocumentDto {
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

  // Dossier papier : "Intitulé / Émetteur [Nom de l'émetteur ET date du document]" —
  // champ manquant à l'entrée #33, ajouté à l'entrée #35 après relecture stricte du
  // document ligne à ligne.
  @IsOptional()
  @IsDateString()
  proofOfAddressDate?: string;
}
