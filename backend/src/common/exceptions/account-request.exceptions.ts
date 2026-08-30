import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

export class AccountRequestNotFoundException extends NotFoundException {
  constructor(requestId: string) {
    super(
      `Aucune demande d'ouverture de compte trouvée pour la référence ${requestId}`,
    );
  }
}

export class AccountRequestNotPendingException extends BadRequestException {
  constructor(requestId: string) {
    super(
      `La demande d'ouverture de compte ${requestId} n'est plus en attente de validation`,
    );
  }
}

// Une seule demande PENDING par email à la fois — évite d'empiler des doublons si le
// visiteur soumet le formulaire plusieurs fois ; une demande REJECTED n'empêche pas une
// nouvelle tentative.
export class ActiveAccountRequestExistsException extends BadRequestException {
  constructor(email: string) {
    super(
      `Une demande d'ouverture de compte est déjà en attente pour ${email}`,
    );
  }
}

// Un compte existe déjà pour cet email (par ex. seed, ou demande déjà approuvée par le
// passé) — inutile d'en créer une nouvelle demande.
export class AccountAlreadyExistsException extends ConflictException {
  constructor(email: string) {
    super(`Un compte existe déjà pour l'adresse ${email}`);
  }
}
