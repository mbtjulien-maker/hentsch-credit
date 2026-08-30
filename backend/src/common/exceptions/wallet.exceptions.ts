import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Chain } from '@prisma/client';

export class UnsupportedChainException extends BadRequestException {
  constructor(chain: Chain) {
    super(
      `La génération d'adresse sandbox n'est pas encore implémentée pour la chaîne ${chain} (seules les chaînes EVM sont supportées pour le moment)`,
    );
  }
}

export class WalletNotFoundException extends NotFoundException {
  constructor(chain: Chain, address: string) {
    super(
      `Aucun wallet client ne correspond à l'adresse ${address} sur ${chain}`,
    );
  }
}
