import { AccountType } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAccountRequestDto {
  // Choisi par le demandeur lui-même — un compte BUSINESS débloque le crédit direct en
  // plus du crédit gagé crypto (cf. AccountType, DirectCreditModule). Optionnel côté DTO
  // (défaut Prisma PARTICULIER si absent) pour ne pas casser un appel existant qui
  // n'enverrait pas ce champ.
  @IsOptional()
  @IsEnum(AccountType)
  accountType?: AccountType;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}
