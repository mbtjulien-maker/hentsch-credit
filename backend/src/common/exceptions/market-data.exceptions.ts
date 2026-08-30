import { ServiceUnavailableException } from '@nestjs/common';
import { AcceptedCurrency } from '@prisma/client';

// Un prix indisponible ne doit jamais se traduire par une valorisation de gage
// arbitraire (ex: fallback silencieux à 1:1 pour de l'or) — on rejette l'opération
// et le fournisseur webhook la retentera (idempotence garantie par referenceTx).
export class MarketDataUnavailableException extends ServiceUnavailableException {
  constructor(currency: AcceptedCurrency) {
    super(
      `Prix indisponible pour ${currency} — réessayez dans quelques instants`,
    );
  }
}

// Même principe que ci-dessus, pour le taux de change (EUR/USD) plutôt qu'un prix
// de collatéral : jamais de taux de repli arbitraire.
export class ExchangeRateUnavailableException extends ServiceUnavailableException {
  constructor() {
    super('Taux de change indisponible — réessayez dans quelques instants');
  }
}
