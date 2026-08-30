import { AcceptedCurrency, Chain } from '@prisma/client';
import { IsEnum } from 'class-validator';

// userId dérivé du token authentifié (@CurrentUser(), cf. WalletController) — jamais du
// body, cf. AuthModule.
export class CreateDepositAddressDto {
  @IsEnum(Chain)
  chain: Chain;

  @IsEnum(AcceptedCurrency)
  currency: AcceptedCurrency;
}
