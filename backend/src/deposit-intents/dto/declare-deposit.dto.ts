import { AcceptedCurrency, Chain } from '@prisma/client';
import { IsEnum, Matches } from 'class-validator';

// userId dérivé du token authentifié (@CurrentUser(), cf. DepositIntentsController) —
// jamais du body.
export class DeclareDepositDto {
  @IsEnum(Chain)
  chain: Chain;

  @IsEnum(AcceptedCurrency)
  currency: AcceptedCurrency;

  // Quantité de token que le client déclare être sur le point d'envoyer — indicative,
  // vérifiée manuellement par un admin à réception réelle des fonds (cf. §2C attribution).
  @Matches(/^\d+(\.\d{1,8})?$/, {
    message:
      "tokenAmount doit être un nombre décimal positif (jusqu'à 8 décimales)",
  })
  tokenAmount: string;
}
