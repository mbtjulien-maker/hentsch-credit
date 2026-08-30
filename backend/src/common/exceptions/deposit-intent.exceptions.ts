import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AcceptedCurrency, Chain } from '@prisma/client';

// Aucune adresse "pool" n'est configurée pour ce couple (chain, currency) — soit l'actif
// n'est pas géré via le flux d'adresse mutualisée, soit le réseau demandé n'est pas
// encore supporté pour cet actif (cf. ManagedDepositAddress).
export class ManagedDepositAddressNotFoundException extends NotFoundException {
  constructor(chain: Chain, currency: AcceptedCurrency) {
    super(
      `Aucune adresse de dépôt n'est configurée pour ${currency} sur ${chain}`,
    );
  }
}

export class DepositIntentNotFoundException extends NotFoundException {
  constructor(transactionId: string) {
    super(
      `Aucune déclaration de dépôt trouvée pour la référence ${transactionId}`,
    );
  }
}

export class DepositIntentAlreadyProcessedException extends BadRequestException {
  constructor(transactionId: string) {
    super(
      `La déclaration de dépôt ${transactionId} a déjà été traitée (validée ou rejetée)`,
    );
  }
}
