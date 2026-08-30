import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ClientType } from '@prisma/client';

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

  @IsOptional()
  @IsEnum(ClientType)
  clientType?: ClientType;
}
