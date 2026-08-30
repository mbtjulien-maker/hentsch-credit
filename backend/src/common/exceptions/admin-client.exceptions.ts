import { NotFoundException } from '@nestjs/common';

export class ClientNotFoundException extends NotFoundException {
  constructor(userId: string) {
    super(`Aucun client trouvé pour l'identifiant ${userId}`);
  }
}
