import { GoneException, NotFoundException } from '@nestjs/common';

export class InviteCodeNotFoundException extends NotFoundException {
  constructor() {
    super("Ce code d'invitation est introuvable — vérifiez sa saisie.");
  }
}

// GoneException (410) plutôt que BadRequest — la ressource (le code) a bien existé mais
// n'est plus valide, distinct d'une requête simplement mal formée.
export class InviteCodeAlreadyUsedException extends GoneException {
  constructor() {
    super("Ce code d'invitation a déjà été utilisé.");
  }
}

export class InviteCodeExpiredException extends GoneException {
  constructor() {
    super("Ce code d'invitation a expiré (validité 24h après génération).");
  }
}
