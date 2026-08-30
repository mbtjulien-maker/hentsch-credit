import { Matches } from 'class-validator';

const DECIMAL_PATTERN = /^\d+(\.\d{1,6})?$/;

// userId dérivé du token authentifié (@CurrentUser(), cf. CreditController) — jamais du
// body, cf. AuthModule.
export class RepayCreditDto {
  @Matches(DECIMAL_PATTERN, {
    message: "amount doit être un nombre décimal positif (jusqu'à 6 décimales)",
  })
  amount: string;
}
