import { AcceptedCurrency, Chain } from '@prisma/client';
import { IsEnum, IsString, Matches } from 'class-validator';

// Contrat interne minimal représentant un dépôt on-chain déjà confirmé par le listener
// en amont (Alchemy / QuickNode). L'adaptation de leur enveloppe JSON spécifique vers ce
// DTO est une fine couche de traduction à ajouter lors du branchement du vrai fournisseur.
export class BlockchainDepositDto {
  @IsEnum(Chain)
  chain: Chain;

  @IsString()
  address: string;

  @IsEnum(AcceptedCurrency)
  currency: AcceptedCurrency;

  // Quantité brute de l'actif reçu on-chain (pas un montant USD) — convertie au prix
  // spot par BlockchainDepositService avant d'affecter le ledger (1:1 pour les
  // stablecoins, prix de l'or en direct pour PAXG/XAUT).
  @Matches(/^\d+(\.\d{1,8})?$/, {
    message: "amount doit être un nombre décimal positif (jusqu'à 8 décimales)",
  })
  amount: string;

  @IsString()
  txHash: string;
}
