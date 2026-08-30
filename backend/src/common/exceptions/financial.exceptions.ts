import { BadRequestException, NotFoundException } from '@nestjs/common';

export class LedgerNotFoundException extends NotFoundException {
  constructor(userId: string) {
    super(`Aucun registre (ledger) trouvé pour l'utilisateur ${userId}`);
  }
}

export class InvalidAmountException extends BadRequestException {
  constructor(message = 'Le montant doit être strictement positif') {
    super(message);
  }
}

// Réutilisée par toute opération débitant availableBalance (mise en gage, retrait) :
// le message reste générique pour ne présumer d'aucune opération précise.
export class InsufficientFundsException extends BadRequestException {
  constructor(userId: string) {
    super(`Solde disponible insuffisant pour l'utilisateur ${userId}`);
  }
}

export class NoOutstandingCreditException extends BadRequestException {
  constructor(userId: string) {
    super(`Aucun crédit utilisé à rembourser pour l'utilisateur ${userId}`);
  }
}

export class OverRepaymentException extends BadRequestException {
  constructor(userId: string) {
    super(
      `Le montant du remboursement dépasse le crédit utilisé pour l'utilisateur ${userId}`,
    );
  }
}
