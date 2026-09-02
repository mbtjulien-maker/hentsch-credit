import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ClientType } from '@prisma/client';
import { GENDERS } from '../../users/dto/update-own-profile.dto';

// Tous les champs sont optionnels : le back-office complète le profil
// progressivement, pas en un seul formulaire obligatoire (cf. ClientProfile,
// nullable par défaut).
export class UpdateClientProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

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

  @IsOptional()
  @IsEnum(ClientType)
  clientType?: ClientType;

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
