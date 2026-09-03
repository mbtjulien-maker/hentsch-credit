import { ServiceUnavailableException } from '@nestjs/common';

// Levée quand GEMINI_API_KEY est absente OU quand l'appel réel à l'API Google Gemini
// échoue (réseau, quota, réponse vide...) — jamais une réponse fabriquée à la place d'un
// vrai appel, même principe de dégradation gracieuse que MarketDataService/
// StockMarketDataService (cf. §3 CLAUDE.md) : ici la dégradation est un message
// d'indisponibilité plutôt qu'une donnée en cache, une conversation ne pouvant pas être
// "légèrement périmée".
export class SupportChatUnavailableException extends ServiceUnavailableException {
  constructor() {
    super(
      "L'assistant IA est momentanément indisponible — réessayez plus tard ou contactez le support par e-mail.",
    );
  }
}
