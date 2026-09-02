import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MARITAL_STATUSES } from '../../common/kyc.constants';

// Genres proposés au dossier KYC papier — M/F cochables, plus une option neutre pour ne
// jamais forcer un client dans l'une des deux cases (le papier ne prévoit que M/F, choix
// délibérément élargi côté produit numérique).
export const GENDERS = ['M', 'F', 'AUTRE'] as const;

// Auto-service (cf. UserProfileController, PATCH /users/:userId/profile) — mêmes champs
// que UpdateClientProfileDto (admin-clients), sans `clientType` : c'est une
// classification interne (PARTICULIER/INDEPENDANT/ENTREPRISE), jamais un champ que le
// client choisit lui-même. Tous optionnels : le client complète son profil
// progressivement, pas via un unique formulaire obligatoire.
export class UpdateOwnProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  // Nom d'usage (épouse…), distinct du nom de naissance ci-dessus — cf. dossier KYC
  // papier, §6 entrée #33.
  @IsOptional()
  @IsString()
  @MaxLength(100)
  usageLastName?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  placeOfBirth?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  birthCountry?: string;

  @IsOptional()
  @IsIn(GENDERS)
  gender?: (typeof GENDERS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nationality?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  secondNationality?: string;

  // Situation de famille — choix fermé du dossier papier (§1, cf. §6 entrée #35) :
  // Célibataire/Marié(e)/Pacsé(e)/Divorcé(e)/Veuf(ve), pas du texte libre côté client.
  @IsOptional()
  @IsIn(MARITAL_STATUSES)
  maritalStatus?: (typeof MARITAL_STATUSES)[number];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  dependents?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  // Résidence fiscale et identifiant fiscal (NIF/SPI, exigence FATCA/CRS) — cf. dossier
  // KYC papier §2, §6 entrée #33.
  @IsOptional()
  @IsString()
  @MaxLength(100)
  taxResidenceCountry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  additionalTaxResidence?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxIdNumber?: string;
}
