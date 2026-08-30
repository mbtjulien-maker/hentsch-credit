import { Controller, Get } from '@nestjs/common';
import { AcceptedCurrency } from '@prisma/client';
import { MarketDataService } from './market-data.service';

// Actifs de la vitrine "Rendement" (cf. yield-assets-showcase.tsx côté frontend) — un
// sous-ensemble fixe de YIELD_ELIGIBLE_CURRENCIES, pas l'intégralité : la page ne montre
// que ceux-là, pas les métaux industriels de la page Stratégie RWA.
const YIELD_SHOWCASE_CURRENCIES: AcceptedCurrency[] = [
  'XAUT',
  'PAXG',
  'KAG',
  'ETH',
];

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
}
