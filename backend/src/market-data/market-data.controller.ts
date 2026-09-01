import { Controller, Get } from '@nestjs/common';
import { AcceptedCurrency } from '@prisma/client';
import { YIELD_ELIGIBLE_CURRENCIES } from './market-data.constants';
import { MarketDataService } from './market-data.service';

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
  constructor(private readonly marketDataService: MarketDataService) {}

  @Get('prices')
  getPrices() {
    return this.marketDataService.getMarketOverview();
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
