import { ConfigService } from '@nestjs/config';
import { STOCK_SUB_BASKETS } from './stock-market-data.constants';
import { StockMarketDataService } from './stock-market-data.service';

const STOCKS_TICKERS = STOCK_SUB_BASKETS.STOCKS.tickers;

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: () => Promise.resolve(body) } as Response;
}

// Notre service n'appelle jamais fetch() qu'avec une chaîne (cf. StockMarketDataService),
// mais le type de fetch() reste RequestInfo | URL : on l'extrait explicitement plutôt que
// de faire confiance à String(input), qui donnerait "[object Request]" pour un Request.
function urlOf(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function withKey(key: string | undefined) {
  return {
    get: (name: string) => (name === 'FINNHUB_API_KEY' ? key : undefined),
  } as unknown as ConfigService;
}

describe('StockMarketDataService', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('returns null without a FINNHUB_API_KEY, without ever calling fetch', async () => {
    const service = new StockMarketDataService(withKey(undefined));

    const signal = await service.getBasketMarketSignal('STOCKS');

    expect(signal).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('averages the real dp (percent change) across the whole basket', async () => {
    const service = new StockMarketDataService(withKey('test-key'));
    // 5 tickers dans STOCKS, dp: 1, 2, 3, -1, 0 -> moyenne 1.
    const dps = [1, 2, 3, -1, 0];
    fetchSpy.mockImplementation((input: Parameters<typeof fetch>[0]) => {
      const url = urlOf(input);
      const index = STOCKS_TICKERS.findIndex((t) =>
        url.includes(`symbol=${t}`),
      );
      return Promise.resolve(jsonResponse({ c: 100, pc: 99, dp: dps[index] }));
    });

    const signal = await service.getBasketMarketSignal('STOCKS');

    expect(signal).toBeCloseTo(1, 6);
    expect(fetchSpy).toHaveBeenCalledTimes(STOCKS_TICKERS.length);
  });

  it('averages only over tickers that actually responded, ignoring failures', async () => {
    const service = new StockMarketDataService(withKey('test-key'));
    let call = 0;
    fetchSpy.mockImplementation(() => {
      call++;
      // Un seul ticker répond (dp: 4), tous les autres échouent (réseau ou 500).
      if (call === 1) {
        return Promise.resolve(jsonResponse({ c: 100, pc: 96, dp: 4 }));
      }
      return Promise.resolve(jsonResponse({}, false, 500));
    });

    const signal = await service.getBasketMarketSignal('STOCKS');

    expect(signal).toBe(4);
  });

  it('returns null when every ticker fails (total outage), never a fabricated 0', async () => {
    const service = new StockMarketDataService(withKey('test-key'));
    fetchSpy.mockRejectedValue(new Error('network down'));

    const signal = await service.getBasketMarketSignal('STOCKS');

    expect(signal).toBeNull();
  });

  it('treats a quote with c === 0 (unknown ticker / no trading data) as unavailable, not a real -100% move', async () => {
    const service = new StockMarketDataService(withKey('test-key'));
    fetchSpy.mockResolvedValue(jsonResponse({ c: 0, pc: 0, dp: 0 }));

    const signal = await service.getBasketMarketSignal('STOCKS');

    expect(signal).toBeNull();
  });

  it('queries a different sub-basket with its own distinct tickers', async () => {
    const service = new StockMarketDataService(withKey('test-key'));
    const techTickers = STOCK_SUB_BASKETS.STOCKS_TECH_AI.tickers;
    fetchSpy.mockImplementation((input: Parameters<typeof fetch>[0]) => {
      const url = urlOf(input);
      expect(techTickers.some((t) => url.includes(`symbol=${t}`))).toBe(true);
      return Promise.resolve(jsonResponse({ c: 100, pc: 99, dp: 2 }));
    });

    const signal = await service.getBasketMarketSignal('STOCKS_TECH_AI');

    expect(signal).toBeCloseTo(2, 6);
    expect(fetchSpy).toHaveBeenCalledTimes(techTickers.length);
  });

  describe('getBasketQuotes', () => {
    it('returns the real price and change per ticker, in basket order', async () => {
      const service = new StockMarketDataService(withKey('test-key'));
      fetchSpy.mockImplementation((input: Parameters<typeof fetch>[0]) => {
        const url = urlOf(input);
        const index = STOCKS_TICKERS.findIndex((t) =>
          url.includes(`symbol=${t}`),
        );
        return Promise.resolve(
          jsonResponse({ c: 100 + index, pc: 99, dp: index }),
        );
      });

      const quotes = await service.getBasketQuotes('STOCKS');

      expect(quotes).toHaveLength(STOCKS_TICKERS.length);
      expect(quotes[0]).toEqual({
        ticker: STOCKS_TICKERS[0],
        price: 100,
        changePct: 0,
      });
    });

    it('omits tickers that failed instead of substituting a fabricated value', async () => {
      const service = new StockMarketDataService(withKey('test-key'));
      let call = 0;
      fetchSpy.mockImplementation(() => {
        call++;
        if (call === 1) {
          return Promise.resolve(jsonResponse({ c: 100, pc: 96, dp: 4 }));
        }
        return Promise.resolve(jsonResponse({}, false, 500));
      });

      const quotes = await service.getBasketQuotes('STOCKS');

      expect(quotes).toHaveLength(1);
    });

    it('returns an empty array without a FINNHUB_API_KEY', async () => {
      const service = new StockMarketDataService(withKey(undefined));

      const quotes = await service.getBasketQuotes('STOCKS');

      expect(quotes).toEqual([]);
    });
  });
});
