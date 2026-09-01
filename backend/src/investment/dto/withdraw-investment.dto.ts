import { IsEnum } from 'class-validator';
import { InvestmentBasket } from '@prisma/client';

// Retrait toujours intégral (pas de montant) : cf. InvestmentService.withdraw.
export class WithdrawInvestmentDto {
  @IsEnum(InvestmentBasket, {
    message: 'basket doit valoir RWA_STRATEGY ou STOCKS',
  })
  basket: InvestmentBasket;
}
