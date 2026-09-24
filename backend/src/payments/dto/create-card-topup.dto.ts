import { CreditTarget } from '@prisma/client';
import { IsEnum, IsOptional, Matches } from 'class-validator';

// userId dérivé du token authentifié (@CurrentUser(), cf. PaymentsController) — jamais
// du body, cf. AuthModule.
export class CreateCardTopupDto {
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: "amount doit être un nombre décimal positif (jusqu'à 2 décimales)",
  })
  amount: string;

  // Solde à créditer une fois le paiement confirmé (cf. CreditTarget) — solde principal
  // par défaut, wallet investissement depuis l'espace Investissement.
  @IsOptional()
  @IsEnum(CreditTarget)
  target?: CreditTarget;
}
