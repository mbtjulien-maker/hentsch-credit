import { AcceptedCurrency, Chain } from '@prisma/client';
import { IsEnum, IsString, Matches, MinLength } from 'class-validator';

// userId dérivé du token authentifié (@CurrentUser(), cf. WithdrawalController) — jamais
// du body, cf. AuthModule.
export class RequestWithdrawalDto {
  @Matches(/^\d+(\.\d{1,6})?$/, {
    message: "amount doit être un nombre décimal positif (jusqu'à 6 décimales)",
  })
  amount: string;

  @IsEnum(Chain)
  chain: Chain;

  @IsEnum(AcceptedCurrency)
  currency: AcceptedCurrency;

  @IsString()
  @MinLength(6)
  destinationAddress: string;
}
