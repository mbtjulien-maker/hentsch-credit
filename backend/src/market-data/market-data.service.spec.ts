import { Prisma } from '@prisma/client';
import {
  ExchangeRateUnavailableException,
  MarketDataUnavailableException,
} from '../common/exceptions/market-data.exceptions';
import { MarketDataService } from './market-data.service';

function coin(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pax-gold',
    symbol: 'paxg',
    name: 'PAX Gold',
    image: 'https://example.com/paxg.png',
    current_price: 2400,
    market_cap: 500_000_000,
    total_volume: 12_000_000,
    high_24h: 2420,
    low_24h: 2380,
    price_change_percentage_24h: 1.25,
    sparkline_in_7d: { price: [2390, 2395, 2400] },
    ...overrides,
  };
}

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: () => Promise.resolve(body) } as Response;
}

describe('MarketDataService', () => {
  let service: MarketDataService;
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    service = new MarketDataService();
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('getUsdValue', () => {
    it('returns the token amount unchanged for pegged stablecoins (no network call)', async () => {
      const result = await service.getUsdValue(
        'USDS',
        new Prisma.Decimal('250'),
      );

      expect(result.toString()).toBe('250');
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('converts gold-backed tokens at the live spot price', async () => {
      fetchSpy.mockResolvedValue(
        jsonResponse([coin({ id: 'pax-gold', current_price: 2400 })]),
      );

      const result = await service.getUsdValue(
        'PAXG',
        new Prisma.Decimal('0.5'),
      );

      expect(result.toString()).toBe('1200');
    });

    it('throws MarketDataUnavailableException when the live price is missing, instead of assuming a value', async () => {
      fetchSpy.mockResolvedValue(jsonResponse([]));

      await expect(
        service.getUsdValue('XAUT', new Prisma.Decimal('1')),
      ).rejects.toBeInstanceOf(MarketDataUnavailableException);
    });

    it('throws MarketDataUnavailableException when the price provider is unreachable and no cache exists', async () => {
      fetchSpy.mockRejectedValue(new Error('network down'));

      await expect(
        service.getUsdValue('PAXG', new Prisma.Decimal('1')),
      ).rejects.toBeInstanceOf(MarketDataUnavailableException);
    });

    it('treats a non-OK HTTP response the same as a network failure', async () => {
      fetchSpy.mockResolvedValue(jsonResponse([], false, 503));

      await expect(
        service.getUsdValue('PAXG', new Prisma.Decimal('1')),
      ).rejects.toBeInstanceOf(MarketDataUnavailableException);
    });
  });

  describe('getMarketOverview', () => {
    it('flags accepted currencies correctly and marks stablecoins as pegged', async () => {
      fetchSpy.mockResolvedValue(
        jsonResponse([
          coin({
            id: 'usds',
            symbol: 'usds',
            name: 'USDS',
            current_price: 0.999,
          }),
          coin({
            id: 'pax-gold',
            symbol: 'paxg',
            name: 'PAX Gold',
            current_price: 2400,
          }),
          coin({
            id: 'bitcoin',
            symbol: 'btc',
            name: 'Bitcoin',
            current_price: 65000,
          }),
          coin({
            id: 'abrdn-physical-platinum-shares-etf-dinari-tokenized-etf',
            symbol: 'pplt',
            name: 'abrdn Physical Platinum Shares ETF',
            current_price: 16.78,
          }),
        ]),
      );

      const overview = await service.getMarketOverview();

      const usds = overview.find((e) => e.id === 'usds')!;
      const paxg = overview.find((e) => e.id === 'pax-gold')!;
      const btc = overview.find((e) => e.id === 'bitcoin')!;
      const xpt = overview.find(
        (e) =>
          e.id === 'abrdn-physical-platinum-shares-etf-dinari-tokenized-etf',
      )!;

      expect(usds.currency).toBe('USDS');
      expect(usds.isAcceptedForCredit).toBe(true);
      expect(usds.isPegged).toBe(true);
      expect(usds.isYieldEligible).toBe(false);
      expect(usds.targetApyRangePct).toBeNull();
      expect(usds.usdPrice?.toString()).toBe('0.999');

      expect(paxg.currency).toBe('PAXG');
      expect(paxg.isPegged).toBe(false);
      expect(paxg.isYieldEligible).toBe(true);
      expect(paxg.targetApyRangePct).toBeNull();
      expect(paxg.usdPrice?.toString()).toBe('2400');
      expect(paxg.high24h?.toString()).toBe('2420');
      expect(paxg.sparkline7d).toEqual([2390, 2395, 2400]);

      expect(btc.currency).toBeNull();
      expect(btc.isAcceptedForCredit).toBe(false);
      expect(btc.isYieldEligible).toBe(false);
      expect(btc.targetApyRangePct).toBeNull();
      expect(btc.symbol).toBe('BTC');

      expect(xpt.currency).toBe('XPT');
      expect(xpt.isYieldEligible).toBe(true);
      expect(xpt.targetApyRangePct).toEqual({ min: 8, max: 14 });
    });

    it('includes every accepted currency and major crypto even when CoinGecko omits some from the response', async () => {
      fetchSpy.mockResolvedValue(jsonResponse([]));

      const overview = await service.getMarketOverview();

      const currencies = overview
        .filter((e) => e.isAcceptedForCredit)
        .map((e) => e.currency);
      expect(currencies.sort()).toEqual(
        [
          'DAI',
          'DEURO',
          'ETH',
          'KAG',
          'PAXG',
          'PYUSD',
          'SHIB',
          'USDC',
          'USDE',
          'USDS',
          'USDT',
          'WTI',
          'XAUT',
          'XCU',
          'XPD',
          'XPT',
        ].sort(),
      );
      const btc = overview.find((e) => e.id === 'bitcoin')!;
      expect(btc.usdPrice).toBeNull();
      expect(btc.symbol).toBe('BTC');
      expect(btc.name).toBe('Bitcoin');
    });
  });

  describe('getEurPerUsd', () => {
    function exchangeRatesResponse(usd: number, eur: number) {
      return jsonResponse({
        rates: { usd: { value: usd }, eur: { value: eur } },
      });
    }

    it('derives the EUR/USD rate from BTC priced in both currencies', async () => {
      fetchSpy.mockResolvedValue(exchangeRatesResponse(111827, 96538));

      const rate = await service.getEurPerUsd();

      expect(rate.toNumber()).toBeCloseTo(96538 / 111827, 8);
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.coingecko.com/api/v3/exchange_rates',
        expect.anything(),
      );
    });

    it('throws ExchangeRateUnavailableException when the provider is unreachable and no cache exists', async () => {
      fetchSpy.mockRejectedValue(new Error('network down'));

      await expect(service.getEurPerUsd()).rejects.toBeInstanceOf(
        ExchangeRateUnavailableException,
      );
    });

    it('treats a non-OK HTTP response the same as a network failure', async () => {
      fetchSpy.mockResolvedValue(jsonResponse({}, false, 503));

      await expect(service.getEurPerUsd()).rejects.toBeInstanceOf(
        ExchangeRateUnavailableException,
      );
    });

    it('throws ExchangeRateUnavailableException when the response is missing a currency', async () => {
      fetchSpy.mockResolvedValue(
        jsonResponse({ rates: { usd: { value: 111827 } } }),
      );

      await expect(service.getEurPerUsd()).rejects.toBeInstanceOf(
        ExchangeRateUnavailableException,
      );
    });

    it('serves the last known-good rate (stale-if-error) when a later refetch fails', async () => {
      jest.useFakeTimers();
      fetchSpy.mockResolvedValueOnce(exchangeRatesResponse(111827, 96538));
      const first = await service.getEurPerUsd();

      jest.advanceTimersByTime(31_000);
      fetchSpy.mockRejectedValueOnce(new Error('network down'));
      const second = await service.getEurPerUsd();

      expect(second.toString()).toBe(first.toString());
    });

    it('reuses the cached rate within the TTL instead of calling the provider again', async () => {
      fetchSpy.mockResolvedValue(exchangeRatesResponse(111827, 96538));

      await service.getEurPerUsd();
      await service.getEurPerUsd();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('caching', () => {
    it('reuses cached market data within the TTL instead of calling the provider again', async () => {
      fetchSpy.mockResolvedValue(jsonResponse([coin()]));

      await service.getMarketOverview();
      await service.getMarketOverview();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('refetches once the TTL has elapsed', async () => {
      jest.useFakeTimers();
      fetchSpy.mockResolvedValue(jsonResponse([coin()]));

      await service.getMarketOverview();
      jest.advanceTimersByTime(31_000);
      await service.getMarketOverview();

      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('serves the last known-good data (stale-if-error) when a later refetch fails', async () => {
      jest.useFakeTimers();
      fetchSpy.mockResolvedValueOnce(
        jsonResponse([coin({ current_price: 2400 })]),
      );
      await service.getUsdValue('PAXG', new Prisma.Decimal('1'));

      jest.advanceTimersByTime(31_000);
      fetchSpy.mockRejectedValueOnce(new Error('network down'));
      const second = await service.getUsdValue('PAXG', new Prisma.Decimal('1'));

      expect(second.toString()).toBe('2400');
    });
  });

  describe('getYieldAssetHistory', () => {
    function historyResponse(
      prices: [number, number][],
      ok = true,
      status = 200,
    ) {
      return {
        ok,
        status,
        json: () => Promise.resolve({ prices }),
      } as Response;
    }

    it('computes change/high/low over the period and calls one CoinGecko endpoint per currency', async () => {
      fetchSpy
        .mockResolvedValueOnce(
          historyResponse([
            [1, 2000],
            [2, 2200],
            [3, 1900],
            [4, 2400],
          ]),
        )
        .mockResolvedValueOnce(historyResponse([[1, 35]]));

      const [xaut, kag] = await service.getYieldAssetHistory(['XAUT', 'KAG']);

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(fetchSpy).toHaveBeenNthCalledWith(
        1,
        'https://api.coingecko.com/api/v3/coins/tether-gold/market_chart?vs_currency=usd&days=365',
        expect.anything(),
      );
      expect(xaut.currency).toBe('XAUT');
      expect(xaut.changePct).toBeCloseTo(((2400 - 2000) / 2000) * 100, 8);
      expect(xaut.highUsd).toBe(2400);
      expect(xaut.lowUsd).toBe(1900);
      expect(xaut.points).toEqual([
        { t: 1, usd: 2000 },
        { t: 2, usd: 2200 },
        { t: 3, usd: 1900 },
        { t: 4, usd: 2400 },
      ]);

      expect(kag.currency).toBe('KAG');
      expect(kag.changePct).toBe(0);
    });

    it('degrades gracefully for a single failing currency instead of failing the whole batch', async () => {
      fetchSpy
        .mockResolvedValueOnce(historyResponse([], false, 503))
        .mockResolvedValueOnce(historyResponse([[1, 2400]]));

      const [xaut, paxg] = await service.getYieldAssetHistory(['XAUT', 'PAXG']);

      expect(xaut.points).toEqual([]);
      expect(xaut.changePct).toBeNull();
      expect(xaut.highUsd).toBeNull();
      expect(xaut.lowUsd).toBeNull();
      expect(paxg.points).toEqual([{ t: 1, usd: 2400 }]);
    });

    it('caches the batch and does not refetch within HISTORY_CACHE_TTL_MS', async () => {
      fetchSpy.mockResolvedValue(historyResponse([[1, 2400]]));

      await service.getYieldAssetHistory(['XAUT']);
      await service.getYieldAssetHistory(['XAUT']);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });
});
