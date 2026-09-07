import { AccountCurrency } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

// userId dérivé du token authentifié (@CurrentUser(), cf. DirectCreditController) —
// jamais du body. Tous les montants en chaîne décimale (même convention que
// RequestWithdrawalDto) : jamais de `number` JS pour un montant financier.
export class CreateDirectCreditRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  companyName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  registrationNumber: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  sector: string;

  @IsInt()
  @Min(0)
  @Max(1200)
  companySeniorityMonths: number;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  projectDescription: string;

  @Matches(/^\d+(\.\d{1,6})?$/, {
    message:
      "requestedAmount doit être un nombre décimal positif (jusqu'à 6 décimales)",
  })
  requestedAmount: string;

  @IsEnum(AccountCurrency)
  currency: AccountCurrency;

  @Matches(/^\d+(\.\d{1,6})?$/, {
    message:
      "declaredMonthlyRevenue doit être un nombre décimal positif (jusqu'à 6 décimales)",
  })
  declaredMonthlyRevenue: string;

  @Matches(/^\d+(\.\d{1,6})?$/, {
    message:
      "declaredMonthlyExpenses doit être un nombre décimal positif ou nul (jusqu'à 6 décimales)",
  })
  declaredMonthlyExpenses: string;

  @Matches(/^\d+(\.\d{1,6})?$/, {
    message:
      "guaranteeOffered doit être un nombre décimal positif ou nul (jusqu'à 6 décimales)",
  })
  guaranteeOffered: string;
}
