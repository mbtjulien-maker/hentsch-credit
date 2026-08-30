import { Chain } from '@prisma/client';

// Chaînes supportées par le générateur d'adresses sandbox (viem). TRON et SOLANA
// nécessitent des SDK de dérivation de clé distincts, non couverts par cette étape.
export const EVM_SANDBOX_CHAINS: readonly Chain[] = [
  'ETHEREUM',
  'POLYGON',
  'ARBITRUM',
];
