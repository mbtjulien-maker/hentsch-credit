import { Matches } from 'class-validator';

// userId dérivé du token authentifié (@CurrentUser(), cf. PaymentsController) — jamais
// du body, cf. AuthModule.
export class CreateCardTopupDto {
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: "amount doit être un nombre décimal positif (jusqu'à 2 décimales)",
  })
  amount: string;
}
