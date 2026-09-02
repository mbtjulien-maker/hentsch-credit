import { IsEnum, Matches } from 'class-validator';
import { InvestmentBasket } from '@prisma/client';

const DECIMAL_PATTERN = /^\d+(\.\d{1,6})?$/;

// userId dérivé du token authentifié (@CurrentUser(), cf. InvestmentController) — jamais
// du body, cf. AuthModule.
export class DepositInvestmentDto {
  @IsEnum(InvestmentBasket, {
    message:
      'basket doit valoir RWA_STRATEGY, STOCKS, STOCKS_CONSERVATIVE, STOCKS_BALANCED, STOCKS_TECH_AI ou STOCKS_MOMENTUM',
  })
  basket: InvestmentBasket;

  @Matches(DECIMAL_PATTERN, {
    message: "amount doit être un nombre décimal positif (jusqu'à 6 décimales)",
  })
  amount: string;
}
