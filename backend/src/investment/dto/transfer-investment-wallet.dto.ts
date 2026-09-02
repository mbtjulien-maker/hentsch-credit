import { Matches } from 'class-validator';

const DECIMAL_PATTERN = /^\d+(\.\d{1,6})?$/;

// userId dérivé du token authentifié (@CurrentUser(), cf. InvestmentWalletController) —
// jamais du body. Seul moyen d'alimenter ou de vider le wallet investissement (cf. §6
// entrée #31 CLAUDE.md) : un virement interne, instantané et sans frais, avec le solde
// disponible — jamais un dépôt on-chain/bancaire direct sur ce solde.
export class TransferInvestmentWalletDto {
  @Matches(DECIMAL_PATTERN, {
    message: "amount doit être un nombre décimal positif (jusqu'à 6 décimales)",
  })
  amount: string;
}
