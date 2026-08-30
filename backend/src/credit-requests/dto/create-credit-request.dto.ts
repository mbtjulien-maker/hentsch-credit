import { AccountCurrency } from '@prisma/client';
import { IsEnum, IsOptional, Matches } from 'class-validator';

// userId dérivé du token authentifié (@CurrentUser(), cf. CreditRequestsController) —
// jamais du body, cf. AuthModule.
export class CreateCreditRequestDto {
  @Matches(/^\d+(\.\d{1,6})?$/, {
    message:
      "collateralAmount doit être un nombre décimal positif (jusqu'à 6 décimales)",
  })
  collateralAmount: string;

  @IsOptional()
  @IsEnum(AccountCurrency)
  currency?: AccountCurrency;
}
