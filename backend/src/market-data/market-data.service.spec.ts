import { Prisma } from '@prisma/client';
import {
  ExchangeRateUnavailableException,
  MarketDataUnavailableException,
} from '../common/exceptions/market-data.exceptions';
import { MarketDataService } from './market-data.service';

// Un enregistrement /v2/cryptocurrency/quotes/latest — quote.EUR n'est renseigné que sur
// la réponse de l'appel dédié convert=EUR (cf. getEurPerUsd et les fixtures usdtWithEur
// dans son describe ci-dessous), jamais dans le lot principal convert=USD.
function quote(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    slug: 'pax-gold',
    symbol: 'paxg',
    name: 'PAX Gold',
    quote: {
      USD: {
        price: 2400,
        volume_24h: 12_000_000,
        market_cap: 500_000_000,
        percent_change_24h: 1.25,
      },
    },
    ...overrides,
  };
}

// Un enregistrement /v2/cryptocurrency/info (logo + id numérique).
function info(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    slug: 'pax-gold',
    symbol: 'paxg',
    logo: 'https://example.com/paxg.png',
    ...overrides,
  };
}

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: () => Promise.resolve(body) } as Response;
}

// Extrait l'URL demandée depuis le premier argument de fetch() dans les mocks
// mockImplementation ci-dessous — jamais `String(input)` : un `Request` n'a pas de
// toString() utile ("[object Request]"), contrairement à `Request.url`.
function urlOf(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function quotesResponse(items: ReturnType<typeof quote>[]) {
  // Forme réelle /v2 : objet indexé par id numérique, pas par slug.
  const data: Record<string, unknown> = {};
  for (const item of items) data[String(item.id)] = item;
  return jsonResponse({ data });
}

function infoResponse(items: ReturnType<typeof info>[]) {
  const data: Record<string, unknown> = {};
  for (const item of items) data[String(item.id)] = item;
  return jsonResponse({ data });
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
        quotesResponse([quote({ id: 1, slug: 'pax-gold' })]),
      );

      const result = await service.getUsdValue(
        'PAXG',
        new Prisma.Decimal('0.5'),
      );

      expect(result.toString()).toBe('1200');
    });

    it('throws MarketDataUnavailableException when the live price is missing, instead of assuming a value', async () => {
      fetchSpy.mockResolvedValue(quotesResponse([]));

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
      fetchSpy.mockResolvedValue(quotesResponse([]));
      fetchSpy.mockResolvedValueOnce(jsonResponse({}, false, 503));

      await expect(
        service.getUsdValue('PAXG', new Prisma.Decimal('1')),
      ).rejects.toBeInstanceOf(MarketDataUnavailableException);
    });
  });

  describe('getMarketOverview', () => {
    it('flags accepted currencies correctly and marks stablecoins as pegged', async () => {
      fetchSpy.mockImplementation((input) => {
        const url = urlOf(input);
        if (url.includes('/cryptocurrency/info')) {
          return Promise.resolve(infoResponse([info()]));
        }
        return Promise.resolve(
          quotesResponse([
            quote({
              id: 10,
              slug: 'usds',
              symbol: 'usds',
              name: 'USDS',
              quote: {
                USD: {
                  price: 0.999,
                  volume_24h: 1,
                  market_cap: 1,
                  percent_change_24h: 0,
                },
              },
            }),
            quote({
              id: 1,
              slug: 'pax-gold',
              symbol: 'paxg',
              name: 'PAX Gold',
              quote: {
                USD: {
                  price: 2400,
                  volume_24h: 1,
                  market_cap: 1,
                  percent_change_24h: 0,
                },
              },
            }),
            quote({
              id: 2,
              slug: 'bitcoin',
              symbol: 'btc',
              name: 'Bitcoin',
              quote: {
                USD: {
                  price: 65000,
                  volume_24h: 1,
                  market_cap: 1,
                  percent_change_24h: 0,
                },
              },
            }),
            quote({
              id: 3,
              slug: 'abrdn-physical-platinum-shares-tokenized-etf-dinari',
              symbol: 'pplt',
              name: 'abrdn Physical Platinum Shares ETF (Dinari Tokenized ETF)',
              quote: {
                USD: {
                  price: 16.78,
                  volume_24h: 1,
                  market_cap: 1,
                  percent_change_24h: 0,
                },
              },
            }),
          ]),
        );
      });

      const overview = await service.getMarketOverview();

      const usds = overview.find((e) => e.id === 'usds')!;
      const paxg = overview.find((e) => e.id === 'pax-gold')!;
      const btc = overview.find((e) => e.id === 'bitcoin')!;
      const xpt = overview.find(
        (e) => e.id === 'abrdn-physical-platinum-shares-tokenized-etf-dinari',
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

      expect(btc.currency).toBeNull();
      expect(btc.isAcceptedForCredit).toBe(false);
      expect(btc.isYieldEligible).toBe(false);
      expect(btc.targetApyRangePct).toBeNull();
      expect(btc.symbol).toBe('BTC');

      expect(xpt.currency).toBe('XPT');
      expect(xpt.isYieldEligible).toBe(true);
      expect(xpt.targetApyRangePct).toEqual({ min: 8, max: 14 });
    });

    it('includes every accepted currency and major crypto even when CoinMarketCap omits some from the response', async () => {
      fetchSpy.mockResolvedValue(quotesResponse([]));

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

    it('resolves asset logos from the separate /cryptocurrency/info metadata call', async () => {
      fetchSpy.mockImplementation((input) => {
        const url = urlOf(input);
        if (url.includes('/cryptocurrency/info')) {
          return Promise.resolve(
            infoResponse([
              info({
                id: 1,
                slug: 'pax-gold',
                logo: 'https://cmc.example/paxg.png',
              }),
            ]),
          );
        }
        return Promise.resolve(
          quotesResponse([quote({ id: 1, slug: 'pax-gold' })]),
        );
      });

      const overview = await service.getMarketOverview();

      const paxg = overview.find((e) => e.id === 'pax-gold')!;
      expect(paxg.image).toBe('https://cmc.example/paxg.png');
    });
  });

  describe('getEurPerUsd', () => {
    // USDT en USD (via le lot principal, cf. getMarketItems) et en EUR (via l'appel dédié
    // minimal, cf. commentaire de getEurPerUsd sur la limite "1 convert option" du plan
    // gratuit) : deux réponses distinctes, dans l'ordre où le service les demande.
    function usdtUsdOnly() {
      return quotesResponse([
        quote({
          id: 5,
          slug: 'tether',
          symbol: 'usdt',
          name: 'Tether',
          quote: {
            USD: {
              price: 1,
              volume_24h: 1,
              market_cap: 1,
              percent_change_24h: 0,
            },
          },
        }),
      ]);
    }

    function usdtWithEur(eurPrice = 0.9227) {
      return quotesResponse([
        quote({
          id: 5,
          slug: 'tether',
          quote: {
            USD: {
              price: 1,
              volume_24h: 1,
              market_cap: 1,
              percent_change_24h: 0,
            },
            EUR: { price: eurPrice },
          },
        }),
      ]);
    }

    it('derives the EUR/USD rate from USDT priced in USD (batched call) and EUR (dedicated call)', async () => {
      fetchSpy
        .mockResolvedValueOnce(usdtUsdOnly())
        .mockResolvedValueOnce(usdtWithEur());

      const rate = await service.getEurPerUsd();

      expect(rate.toNumber()).toBeCloseTo(0.9227, 8);
      // Deux appels : le lot principal (USD, tous les actifs) puis l'appel dédié minimal
      // pour EUR — pas un seul appel groupé, cf. commentaire de getEurPerUsd.
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('throws ExchangeRateUnavailableException when the provider is unreachable and no cache exists', async () => {
      fetchSpy.mockRejectedValue(new Error('network down'));

      await expect(service.getEurPerUsd()).rejects.toBeInstanceOf(
        ExchangeRateUnavailableException,
      );
    });

    it('throws ExchangeRateUnavailableException when the dedicated EUR call is missing the conversion', async () => {
      fetchSpy
        .mockResolvedValueOnce(usdtUsdOnly())
        .mockResolvedValueOnce(usdtUsdOnly());

      await expect(service.getEurPerUsd()).rejects.toBeInstanceOf(
        ExchangeRateUnavailableException,
      );
    });

    it('serves the last known-good rate (stale-if-error) when the dedicated EUR call fails on a later refetch', async () => {
      jest.useFakeTimers();
      fetchSpy
        .mockResolvedValueOnce(usdtUsdOnly())
        .mockResolvedValueOnce(usdtWithEur());
      const first = await service.getEurPerUsd();

      jest.advanceTimersByTime(31_000);
      fetchSpy
        .mockResolvedValueOnce(usdtUsdOnly())
        .mockRejectedValueOnce(new Error('network down'));
      const second = await service.getEurPerUsd();

      expect(second.toString()).toBe(first.toString());
    });
  });

  describe('caching', () => {
    it('reuses cached market data within the TTL instead of calling the provider again', async () => {
      fetchSpy.mockResolvedValue(quotesResponse([quote()]));

      await service.getMarketOverview();
      await service.getMarketOverview();

      // Deux appels par cycle (prix + métadonnées), pas quatre.
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('refetches prices once the TTL has elapsed, but reuses the longer-lived metadata cache', async () => {
      jest.useFakeTimers();
      fetchSpy.mockResolvedValue(quotesResponse([quote()]));

      await service.getMarketOverview();
      jest.advanceTimersByTime(31_000);
      await service.getMarketOverview();

      // 1er cycle : prix + métadonnées (2 appels). 2e cycle, 31s plus tard : seul le prix
      // a dépassé son TTL de 30s (cf. PRICE_CACHE_TTL_MS) ; les métadonnées restent en
      // cache 24h (cf. METADATA_CACHE_TTL_MS), donc pas de 3e appel pour elles.
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    it('serves the last known-good data (stale-if-error) when a later refetch fails', async () => {
      jest.useFakeTimers();
      fetchSpy.mockResolvedValueOnce(
        quotesResponse([
          quote({
            quote: {
              USD: {
                price: 2400,
                volume_24h: 1,
                market_cap: 1,
                percent_change_24h: 0,
              },
            },
          }),
        ]),
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
      points: { timestamp: string; price: number }[],
      ok = true,
      status = 200,
    ) {
      return {
        ok,
        status,
        json: () =>
          Promise.resolve({
            data: {
              '1': {
                quotes: points.map((p) => ({
                  timestamp: p.timestamp,
                  quote: { USD: { price: p.price } },
                })),
              },
            },
          }),
      } as Response;
    }

    it('computes change/high/low over the period and calls one CoinMarketCap endpoint per currency', async () => {
      fetchSpy.mockImplementation((input) => {
        const url = urlOf(input);
        if (url.includes('/cryptocurrency/info')) {
          return Promise.resolve(
            infoResponse([
              info({ id: 101, slug: 'tether-gold' }),
              info({ id: 102, slug: 'silver' }),
            ]),
          );
        }
        if (url.includes('id=101')) {
          return Promise.resolve(
            historyResponse([
              { timestamp: '2026-01-01T00:00:00.000Z', price: 2000 },
              { timestamp: '2026-01-02T00:00:00.000Z', price: 2200 },
              { timestamp: '2026-01-03T00:00:00.000Z', price: 1900 },
              { timestamp: '2026-01-04T00:00:00.000Z', price: 2400 },
            ]),
          );
        }
        if (url.includes('id=102')) {
          return Promise.resolve(
            historyResponse([
              { timestamp: '2026-01-01T00:00:00.000Z', price: 35 },
            ]),
          );
        }
        return Promise.resolve(jsonResponse({}, false, 404));
      });

      const [xaut, kag] = await service.getYieldAssetHistory(['XAUT', 'KAG']);

      expect(xaut.currency).toBe('XAUT');
      expect(xaut.changePct).toBeCloseTo(((2400 - 2000) / 2000) * 100, 8);
      expect(xaut.highUsd).toBe(2400);
      expect(xaut.lowUsd).toBe(1900);
      expect(xaut.points.map((p) => p.usd)).toEqual([2000, 2200, 1900, 2400]);

      expect(kag.currency).toBe('KAG');
      expect(kag.changePct).toBe(0);
    });

    it('degrades gracefully for a single failing currency instead of failing the whole batch', async () => {
      fetchSpy.mockImplementation((input) => {
        const url = urlOf(input);
        if (url.includes('/cryptocurrency/info')) {
          return Promise.resolve(
            infoResponse([
              info({ id: 101, slug: 'tether-gold' }),
              info({ id: 1, slug: 'pax-gold' }),
            ]),
          );
        }
        if (url.includes('id=101')) {
          return Promise.resolve(historyResponse([], false, 503));
        }
        return Promise.resolve(
          historyResponse([
            { timestamp: '2026-01-01T00:00:00.000Z', price: 2400 },
          ]),
        );
      });

      const [xaut, paxg] = await service.getYieldAssetHistory(['XAUT', 'PAXG']);

      expect(xaut.points).toEqual([]);
      expect(xaut.changePct).toBeNull();
      expect(xaut.highUsd).toBeNull();
      expect(xaut.lowUsd).toBeNull();
      expect(paxg.points.map((p) => p.usd)).toEqual([2400]);
    });

    it('caches the batch and does not refetch within HISTORY_CACHE_TTL_MS', async () => {
      fetchSpy.mockImplementation((input) => {
        const url = urlOf(input);
        if (url.includes('/cryptocurrency/info')) {
          return Promise.resolve(
            infoResponse([info({ id: 101, slug: 'tether-gold' })]),
          );
        }
        return Promise.resolve(
          historyResponse([
            { timestamp: '2026-01-01T00:00:00.000Z', price: 2400 },
          ]),
        );
      });

      await service.getYieldAssetHistory(['XAUT']);
      await service.getYieldAssetHistory(['XAUT']);

      // Un appel info (métadonnées, mises en cache séparément) + un appel historique.
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it("does not let one caller with a different currency list overwrite another caller's cached entries (regression: shared batch cache)", async () => {
      fetchSpy.mockImplementation((input) => {
        const url = urlOf(input);
        if (url.includes('/cryptocurrency/info')) {
          return Promise.resolve(
            infoResponse([
              info({ id: 101, slug: 'tether-gold' }),
              info({ id: 102, slug: 'silver' }),
              info({ id: 103, slug: 'ethereum' }),
            ]),
          );
        }
        if (url.includes('id=101')) {
          return Promise.resolve(
            historyResponse([
              { timestamp: '2026-01-01T00:00:00.000Z', price: 2400 },
            ]),
          );
        }
        if (url.includes('id=102')) {
          return Promise.resolve(
            historyResponse([
              { timestamp: '2026-01-01T00:00:00.000Z', price: 35 },
            ]),
          );
        }
        if (url.includes('id=103')) {
          return Promise.resolve(
            historyResponse([
              { timestamp: '2026-01-01T00:00:00.000Z', price: 2500 },
            ]),
          );
        }
        return Promise.resolve(jsonResponse({}, false, 404));
      });

      // Un premier appelant (ex. la vitrine "/rendement") ne demande que XAUT et KAG.
      const showcase = await service.getYieldAssetHistory(['XAUT', 'KAG']);
      expect(showcase.map((e) => e.currency)).toEqual(['XAUT', 'KAG']);

      // Un second appelant (ex. le simulateur de crédit) demande XAUT, KAG et ETH — avec
      // l'ancien cache en lot (un seul tableau partagé), cet appel écrasait le cache du
      // premier appelant avec sa propre liste de 3 actifs.
      const full = await service.getYieldAssetHistory(['XAUT', 'KAG', 'ETH']);
      expect(full.map((e) => e.currency)).toEqual(['XAUT', 'KAG', 'ETH']);
      expect(full.find((e) => e.currency === 'ETH')?.changePct).toBe(0);

      // Le premier appelant doit toujours recevoir exactement sa propre liste (2 actifs),
      // jamais 3, même après que le second a été résolu — c'est exactement le bug : sans
      // le cache par actif, ce second appel renverrait désormais XAUT/KAG/ETH.
      const showcaseAgain = await service.getYieldAssetHistory(['XAUT', 'KAG']);
      expect(showcaseAgain.map((e) => e.currency)).toEqual(['XAUT', 'KAG']);

      // Les actifs communs (XAUT, KAG) ne sont récupérés qu'une seule fois au total,
      // preuve que le second appel a bien réutilisé le cache déjà posé par le premier
      // plutôt que de tout refetcher : 1 appel info + 3 historiques (XAUT, KAG, ETH).
      expect(fetchSpy).toHaveBeenCalledTimes(4);
    });

    it('retries a failed currency after HISTORY_FAILURE_RETRY_MS instead of freezing it "unavailable" for the full 6h cache (regression: /marche cards stuck on a transient CMC hiccup)', async () => {
      jest.useFakeTimers();
      fetchSpy.mockImplementation((input) => {
        const url = urlOf(input);
        if (url.includes('/cryptocurrency/info')) {
          return Promise.resolve(
            infoResponse([info({ id: 101, slug: 'tether-gold' })]),
          );
        }
        return Promise.resolve(historyResponse([], false, 503));
      });

      const [firstAttempt] = await service.getYieldAssetHistory(['XAUT']);
      expect(firstAttempt.points).toEqual([]);

      // Bien avant les 6h de HISTORY_CACHE_TTL_MS, mais après le court délai de nouvelle
      // tentative : une panne transitoire ne doit pas rester figée aussi longtemps.
      jest.advanceTimersByTime(2 * 60 * 1000 + 1_000);
      fetchSpy.mockImplementation((input) => {
        const url = urlOf(input);
        if (url.includes('/cryptocurrency/info')) {
          return Promise.resolve(
            infoResponse([info({ id: 101, slug: 'tether-gold' })]),
          );
        }
        return Promise.resolve(
          historyResponse([
            { timestamp: '2026-01-01T00:00:00.000Z', price: 2400 },
          ]),
        );
      });
      const [secondAttempt] = await service.getYieldAssetHistory(['XAUT']);
      expect(secondAttempt.points.map((p) => p.usd)).toEqual([2400]);
    });
  });
});
