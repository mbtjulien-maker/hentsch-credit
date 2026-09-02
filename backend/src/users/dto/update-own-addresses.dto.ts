import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { AddressLabel } from '@prisma/client';

// Auto-service — mêmes champs que AddressEntryDto (admin-clients), sans `verified` :
// seul un admin peut certifier une adresse vérifiée (cf. UsersService.updateAddresses,
// qui force verified à false à chaque modification par le client lui-même, y compris sur
// une adresse déjà vérifiée — une donnée qui vient de changer ne l'est plus tant qu'un
// admin ne l'a pas recontrôlée).
export class OwnAddressEntryDto {
  @IsEnum(AddressLabel)
  label: AddressLabel;

  @IsString()
  @MaxLength(200)
  street: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;

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
}

export class UpdateOwnAddressesDto {
  @ValidateNested({ each: true })
  @Type(() => OwnAddressEntryDto)
  @ArrayMaxSize(4)
  addresses: OwnAddressEntryDto[];
}
