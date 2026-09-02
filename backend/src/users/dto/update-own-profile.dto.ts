import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

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
  nationality?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  maritalStatus?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  dependents?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
