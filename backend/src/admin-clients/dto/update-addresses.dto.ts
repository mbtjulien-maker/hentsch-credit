import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { AddressLabel } from '@prisma/client';

export class AddressEntryDto {
  @IsEnum(AddressLabel)
  label: AddressLabel;

  @IsString()
  @MaxLength(200)
  street: string;

  @IsString()
  @MaxLength(100)
  city: string;

  @IsString()
  @MaxLength(20)
  postalCode: string;

  @IsString()
  @MaxLength(100)
  country: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  residenceType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  since?: string;

  @IsOptional()
  @IsBoolean()
  verified?: boolean;
}

// Remplacement en bloc de toutes les adresses du client (au plus une par label, cf.
// @@unique([userId, label]) sur Address) — plus simple à raisonner côté back-office
// qu'un CRUD adresse par adresse pour un maximum de 4 lignes.
export class UpdateAddressesDto {
  @ValidateNested({ each: true })
  @Type(() => AddressEntryDto)
  @ArrayMaxSize(4)
  addresses: AddressEntryDto[];
}
