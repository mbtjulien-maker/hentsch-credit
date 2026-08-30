import { NotFoundException } from '@nestjs/common';

export class PaymentNotFoundException extends NotFoundException {
  constructor(paymentId: string) {
    super(`Aucun paiement carte trouvé pour la référence ${paymentId}`);
  }
}
