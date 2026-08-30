import { BadRequestException, NotFoundException } from '@nestjs/common';

export class CreditRequestNotFoundException extends NotFoundException {
  constructor(requestId: string) {
    super(`Aucune demande de crédit trouvée pour la référence ${requestId}`);
  }
}

// Une seule demande active (PENDING ou APPROVED non encore honorée) à la fois par
// client : évite toute ambiguïté sur la demande qu'un dépôt donné doit honorer.
export class ActiveCreditRequestExistsException extends BadRequestException {
  constructor(userId: string) {
    super(
      `L'utilisateur ${userId} a déjà une demande de crédit active (en attente ou approuvée non honorée)`,
    );
  }
}

export class CreditRequestNotPendingException extends BadRequestException {
  constructor(requestId: string) {
    super(
      `La demande de crédit ${requestId} n'est plus en attente de validation`,
    );
  }
}

export class CreditRequestNotApprovedException extends BadRequestException {
  constructor(requestId: string) {
    super(
      `La demande de crédit ${requestId} doit être approuvée avant de générer une adresse de dépôt`,
    );
  }
}

// Une demande de crédit s'engage sur un seul actif de gage (fixé au premier appel de
// generateDepositAddress) — nécessaire pour que le rendement indexé sur la performance
// réelle du gage (CollateralYieldService) sache sans ambiguïté quel actif suivre.
export class CollateralCurrencyMismatchException extends BadRequestException {
  constructor(requestId: string, committed: string, requested: string) {
    super(
      `La demande de crédit ${requestId} est déjà engagée sur ${committed} — impossible de générer une adresse de dépôt en ${requested}`,
    );
  }
}
