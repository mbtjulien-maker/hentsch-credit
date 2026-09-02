import { IsEnum, Matches } from 'class-validator';
import { FixedTermPlanId } from '@prisma/client';

const DECIMAL_PATTERN = /^\d+(\.\d{1,6})?$/;

// userId dérivé du token authentifié (@CurrentUser(), cf. InvestmentController) — jamais
// du body, cf. AuthModule. Contrairement à DepositInvestmentDto, ce dépôt verrouille les
// fonds jusqu'à l'échéance du plan (§6 entrée #30) : aucun retrait anticipé.
export class DepositFixedTermDto {
  @IsEnum(FixedTermPlanId, {
    message:
      'plan doit valoir TREASURY_3M, SEMICONDUCTORS_6M, CORE_BALANCED_12M, RWA_METALS_12M, AI_MEGACAPS_12M ou ALPHA_MOMENTUM_12M',
  })
  plan: FixedTermPlanId;

  @Matches(DECIMAL_PATTERN, {
    message: "amount doit être un nombre décimal positif (jusqu'à 6 décimales)",
  })
  amount: string;
}
