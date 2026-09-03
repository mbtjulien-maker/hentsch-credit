import { Controller, Get } from '@nestjs/common';
import { AcceptedCurrency } from '@prisma/client';
import {
  STOCK_NAMES,
  STOCK_SUB_BASKETS,
  StockTicker,
} from '../stock-market-data/stock-market-data.constants';
import { StockMarketDataService } from '../stock-market-data/stock-market-data.service';
import { YIELD_ELIGIBLE_CURRENCIES } from './market-data.constants';
import { MarketDataService } from './market-data.service';

// Union de tous les tickers des 5 paniers d'actions (cf. §2H CLAUDE.md) — dédupliquée une
// seule fois au chargement du module, un ticker partagé entre plusieurs paniers (ex. JNJ)
// n'apparaissant qu'une fois sur la page Marché plutôt qu'une fois par panier.
const ALL_STOCK_TICKERS: StockTicker[] = Array.from(
  new Set(Object.values(STOCK_SUB_BASKETS).flatMap((basket) => basket.tickers)),
);

// Actifs de la vitrine "Rendement" (cf. yield-assets-showcase.tsx côté frontend) — un
// sous-ensemble fixe de YIELD_ELIGIBLE_CURRENCIES, pas l'intégralité : la page ne montre
// que ceux-là, pas les métaux industriels de la page Stratégie RWA (qui ont leur propre
// mise en avant sur /strategie-rwa).
const YIELD_SHOWCASE_CURRENCIES: AcceptedCurrency[] = [
  'XAUT',
  'PAXG',
  'KAG',
  'ETH',
];

// Ensemble complet — les 8 actifs réellement éligibles au remboursement automatique par
// plus-value (cf. YIELD_ELIGIBLE_CURRENCIES, CLAUDE.md §2A/§2D), utilisé par les
// simulateurs client (useEstimatedYield côté frontend) : contrairement à la vitrine, le
// simulateur ne peut pas se permettre d'ignorer les métaux industriels sous prétexte
// qu'ils ont leur propre page — un client qui gage du platine a droit à une estimation
// basée sur le platine, pas sur une moyenne or/argent/ETH qui ne le concerne pas.
const YIELD_FULL_CURRENCIES: AcceptedCurrency[] = Array.from(
  YIELD_ELIGIBLE_CURRENCIES,
);

@Controller('market')
export class MarketDataController {
  constructor(
    private readonly marketDataService: MarketDataService,
    private readonly stockMarketDataService: StockMarketDataService,
  ) {}

  @Get('prices')
  getPrices() {
    return this.marketDataService.getMarketOverview();
  }

  // Vue "actions" de la page Marché (retour client : "je veux l'affichage des actions de
  // bourse aussi") — union dédupliquée des tickers des 5 paniers d'actions du produit
  // "investissement direct" (§2H CLAUDE.md), jamais un flux de marché actions séparé :
  // mêmes cours réels Finnhub déjà utilisés pour l'accrual des paniers, une seule source.
  @Get('stocks')
  async getStocks() {
    const quotes =
      await this.stockMarketDataService.getQuotesForTickers(ALL_STOCK_TICKERS);
    const byTicker = new Map(quotes.map((q) => [q.ticker, q]));
    return ALL_STOCK_TICKERS.map((ticker) => {
      const quote = byTicker.get(ticker);
      return {
        ticker,
        name: STOCK_NAMES[ticker],
        price: quote?.price ?? null,
        changePct: quote?.changePct ?? null,
      };
    });
  }

  @Get('yield-history')
  getYieldHistory() {
    return this.marketDataService.getYieldAssetHistory(
      YIELD_SHOWCASE_CURRENCIES,
    );
  }

  @Get('yield-history-full')
  getYieldHistoryFull() {
    return this.marketDataService.getYieldAssetHistory(YIELD_FULL_CURRENCIES);
  }
}
