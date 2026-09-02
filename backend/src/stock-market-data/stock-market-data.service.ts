import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  STOCK_SUB_BASKETS,
  StockSubBasket,
  StockTicker,
} from './stock-market-data.constants';

const FINNHUB_API_BASE = 'https://finnhub.io/api/v1';

// Forme (partielle) de la réponse Finnhub GET /quote — c: cours courant, pc: clôture de
// la veille, dp: variation en % déjà calculée par l'API (équivalent de percent_change_24h
// côté CoinMarketCap, cf. MarketDataService).
interface FinnhubQuote {
  c: number;
  pc: number;
  dp: number | null;
}

// Fournisseur de données de marché ACTIONS — pendant de MarketDataService (crypto/RWA)
// pour les 5 paniers d'actions du produit "investissement direct" (cf. §2H CLAUDE.md,
// STOCK_SUB_BASKETS). Finnhub plutôt qu'Alpha Vantage : plan gratuit avec une limite
// d'appels par minute large (60/min) suffisante pour interroger les ~16 tickers distincts
// (avec chevauchement entre paniers) à chaque passage du cron quotidien, contre 5
// requêtes/minute et 25/jour chez Alpha Vantage (insuffisant pour ce volume). Nécessite
// une clé gratuite (FINNHUB_API_KEY, cf. .env.example) : sans elle, le service se dégrade
// gracieusement (signal indisponible) plutôt que d'échouer bruyamment — même philosophie
// que MarketDataService.
@Injectable()
export class StockMarketDataService {
  private readonly logger = new Logger(StockMarketDataService.name);

  // configService optionnel uniquement pour permettre `new StockMarketDataService()` en
  // test unitaire sans DI Nest complète (cf. stock-market-data.service.spec.ts) — en
  // usage réel, Nest l'injecte toujours (cf. StockMarketDataModule).
  constructor(@Optional() private readonly configService?: ConfigService) {}

  private get apiKey(): string | undefined {
    return this.configService?.get<string>('FINNHUB_API_KEY') || undefined;
  }

  private async getQuote(ticker: StockTicker): Promise<FinnhubQuote | null> {
    if (!this.apiKey) {
      return null;
    }
    try {
      const url = `${FINNHUB_API_BASE}/quote?symbol=${ticker}&token=${this.apiKey}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) {
        throw new Error(`Finnhub a répondu ${response.status}`);
      }
      const payload = (await response.json()) as FinnhubQuote;
      // Finnhub renvoie 200 avec des champs à 0 pour un ticker inconnu/marché fermé sans
      // historique — pas une erreur HTTP, donc filtré ici explicitement plutôt que de
      // laisser passer un signal fabriqué à partir de zéros.
      if (typeof payload.dp !== 'number' || payload.c === 0) {
        return null;
      }
      return payload;
    } catch (error) {
      this.logger.warn(
        `Échec de récupération du cours Finnhub pour ${ticker} : ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  // Cours + variation réels de chaque action d'un panier donné — pendant, par ticker, de
  // MarketDataService.getMarketOverview() pour les cryptos/RWA. Consommé par GET
  // /investment/assets (cf. InvestmentController) pour détailler le panier au client, et
  // par getBasketMarketSignal ci-dessous pour la moyenne utilisée à l'accrual — un seul
  // et même jeu d'appels Finnhub par panier, jamais deux logiques séparées qui pourraient
  // diverger. Ne renvoie que les tickers réellement disponibles (une panne partielle
  // n'empêche pas d'afficher les autres).
  async getBasketQuotes(
    basket: StockSubBasket,
  ): Promise<{ ticker: StockTicker; price: number; changePct: number }[]> {
    // Casté explicitement : `tickers` est un tuple littéral différent par panier
    // (STOCK_SUB_BASKETS est `as const`), et TS ne distribue pas .map() proprement sur
    // une indexation par union de clés — sans cette annotation, `ticker` retomberait
    // silencieusement sur `any` dans le callback ci-dessous.
    const tickers: readonly StockTicker[] = STOCK_SUB_BASKETS[basket].tickers;
    const quotes = await Promise.all(
      tickers.map(async (ticker) => {
        const quote = await this.getQuote(ticker);
        return quote && quote.dp !== null
          ? { ticker, price: quote.c, changePct: quote.dp }
          : null;
      }),
    );
    return quotes.filter(
      (q): q is { ticker: StockTicker; price: number; changePct: number } =>
        q !== null,
    );
  }

  // Variation quotidienne moyenne (%) d'un panier — pendant de
  // TreasuryBotService.computeMarketSignal pour les actions, consommé par
  // InvestmentService pour calculer le rendement du jour de ce panier (cf.
  // StockBasketRun). Une panne partielle (un ticker en échec) ne bloque pas les autres :
  // la moyenne porte sur les tickers réellement disponibles. `null` uniquement si AUCUN
  // ticker n'a répondu (clé absente ou panne totale de Finnhub) — jamais un signal
  // fabriqué (0 ou autre) dans ce cas, pour que l'appelant sache distinguer "marché neutre
  // aujourd'hui" de "donnée indisponible".
  async getBasketMarketSignal(basket: StockSubBasket): Promise<number | null> {
    const quotes = await this.getBasketQuotes(basket);
    if (quotes.length === 0) {
      return null;
    }
    return quotes.reduce((sum, q) => sum + q.changePct, 0) / quotes.length;
  }
}
