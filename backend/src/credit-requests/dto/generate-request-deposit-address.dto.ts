import { AcceptedCurrency, Chain } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class GenerateRequestDepositAddressDto {
  @IsEnum(Chain)
  chain: Chain;

  @IsEnum(AcceptedCurrency)
  currency: AcceptedCurrency;
}
