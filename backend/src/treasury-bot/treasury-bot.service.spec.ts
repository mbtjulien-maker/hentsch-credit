import { Prisma, TreasuryBotRun } from '@prisma/client';
import { MarketDataService } from '../market-data/market-data.service';
import { TreasuryBotService } from './treasury-bot.service';

function buildRun(overrides: Partial<TreasuryBotRun> = {}): TreasuryBotRun {
  return {
    id: 'run-1',
    runDate: new Date('2026-08-01T00:00:00.000Z'),
    pillarAReturnPct: new Prisma.Decimal('0.02'),
    pillarBReturnPct: new Prisma.Decimal('0.03'),
    pillarCReturnPct: new Prisma.Decimal('0.05'),
    blendedReturnPct: new Prisma.Decimal('0.03'),
    marketSignalPct: new Prisma.Decimal('1'),
    notionalCapitalUsd: new Prisma.Decimal('10000000'),
    dailyPnlUsd: new Prisma.Decimal('3000'),
    cumulativeNavUsd: new Prisma.Decimal('10003000'),
    createdAt: new Date(),
    ...overrides,
  };
}

function marketEntry(currency: string, change24hPct: number | null) {
  return { currency, change24hPct };
}

describe('TreasuryBotService', () => {
  let prisma: {
    treasuryBotRun: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      upsert: jest.Mock;
      findMany: jest.Mock;
    };
  };
  let marketDataService: {
    getMarketOverview: jest.Mock;
    getDailyReturnSeries: jest.Mock;
  };
  let service: TreasuryBotService;

  beforeEach(() => {
    prisma = {
      treasuryBotRun: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
    };
    marketDataService = {
      getMarketOverview: jest.fn(),
      getDailyReturnSeries: jest.fn(),
    };
    service = new TreasuryBotService(
      prisma as never,
      marketDataService as unknown as MarketDataService,
    );
  });

  describe('runDailySimulation', () => {
    it('starts compounding from NOTIONAL_CAPITAL_USD when no previous run exists', async () => {
      marketDataService.getMarketOverview.mockResolvedValue([
        marketEntry('XPT', 2),
        marketEntry('XPD', 2),
        marketEntry('XCU', 2),
        marketEntry('WTI', 2),
        marketEntry('BTC', 50), // hors panier, doit être ignoré
      ]);
      prisma.treasuryBotRun.findFirst.mockResolvedValue(null);
      prisma.treasuryBotRun.upsert.mockImplementation(({ create }) =>
        Promise.resolve(create),
      );

      const result = await service.runDailySimulation(
        new Date('2026-08-15T10:00:00.000Z'),
      );

      // Signal de marché = +2% (moyenne du panier RWA, BTC exclu).
      expect(result.marketSignalPct.toNumber()).toBeCloseTo(2, 8);
      // Pilier A = 5.5/365 + 2*0.05 = 0.1150...
      expect(result.pillarAReturnPct.toNumber()).toBeCloseTo(
        5.5 / 365 + 2 * 0.05,
        6,
      );
      // Pilier C (le plus sensible) = 12/365 + 2*0.35 = 0.7328...
      expect(result.pillarCReturnPct.toNumber()).toBeCloseTo(
        12 / 365 + 2 * 0.35,
        6,
      );
      expect(result.notionalCapitalUsd.toString()).toBe('10000000');
      // NAV cumulé = capital notionnel + PnL du jour (pas de ligne précédente).
      expect(
        result.notionalCapitalUsd
          .plus(result.dailyPnlUsd)
          .equals(result.cumulativeNavUsd),
      ).toBe(true);
    });

    it('compounds on top of the previous run instead of restarting from the notional capital', async () => {
      marketDataService.getMarketOverview.mockResolvedValue([
        marketEntry('XPT', 0),
        marketEntry('XPD', 0),
        marketEntry('XCU', 0),
        marketEntry('WTI', 0),
      ]);
      prisma.treasuryBotRun.findFirst.mockResolvedValue(
        buildRun({ cumulativeNavUsd: new Prisma.Decimal('10500000') }),
      );
      prisma.treasuryBotRun.upsert.mockImplementation(({ create }) =>
        Promise.resolve(create),
      );

      const result = await service.runDailySimulation();

      expect(
        new Prisma.Decimal('10500000')
          .plus(result.dailyPnlUsd)
          .equals(result.cumulativeNavUsd),
      ).toBe(true);
    });

    it('treats a missing market signal (no data) as neutral (0%) rather than failing', async () => {
      marketDataService.getMarketOverview.mockResolvedValue([]);
      prisma.treasuryBotRun.findFirst.mockResolvedValue(null);
      prisma.treasuryBotRun.upsert.mockImplementation(({ create }) =>
        Promise.resolve(create),
      );

      const result = await service.runDailySimulation();

      expect(result.marketSignalPct.toNumber()).toBe(0);
      // Sans signal de marché, chaque pilier retombe sur son seul rendement de base.
      expect(result.pillarAReturnPct.toNumber()).toBeCloseTo(5.5 / 365, 8);
    });

    it('upserts by truncated UTC date, keyed to avoid duplicate rows for the same day', async () => {
      marketDataService.getMarketOverview.mockResolvedValue([]);
      prisma.treasuryBotRun.findFirst.mockResolvedValue(null);
      prisma.treasuryBotRun.upsert.mockImplementation(({ create }) =>
        Promise.resolve(create),
      );

      await service.runDailySimulation(new Date('2026-08-15T23:45:00.000Z'));

      const [call] = prisma.treasuryBotRun.upsert.mock.calls[0] as [
        { where: { runDate: Date } },
      ];
      expect(call.where.runDate.toISOString()).toBe('2026-08-15T00:00:00.000Z');
    });
  });

  describe('getHistory', () => {
    it('returns runs in chronological order (oldest first)', async () => {
      const older = buildRun({
        id: 'run-older',
        runDate: new Date('2026-08-01'),
      });
      const newer = buildRun({
        id: 'run-newer',
        runDate: new Date('2026-08-02'),
      });
      // Le service interroge par date décroissante puis inverse : on simule cet ordre.
      prisma.treasuryBotRun.findMany.mockResolvedValue([newer, older]);

      const result = await service.getHistory(10);

      expect(prisma.treasuryBotRun.findMany).toHaveBeenCalledWith({
        orderBy: { runDate: 'desc' },
        take: 10,
      });
      expect(result.map((r) => r.id)).toEqual(['run-older', 'run-newer']);
    });
  });

  describe('backfillHistory', () => {
    it('returns 0 without writing anything when no historical data is available', async () => {
      marketDataService.getDailyReturnSeries.mockResolvedValue([]);

      const created = await service.backfillHistory(30);

      expect(created).toBe(0);
      expect(prisma.treasuryBotRun.upsert).not.toHaveBeenCalled();
    });

    it('backfills one row per available day, skipping days that already exist', async () => {
      const series = Array.from({ length: 5 }, () => 1); // 5 jours de +1% de signal
      marketDataService.getDailyReturnSeries.mockResolvedValue(series);
      prisma.treasuryBotRun.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(buildRun()) // déjà présent, doit être sauté
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      prisma.treasuryBotRun.findFirst.mockResolvedValue(null);
      prisma.treasuryBotRun.upsert.mockImplementation(({ create }) =>
        Promise.resolve(create),
      );

      const created = await service.backfillHistory(5);

      expect(created).toBe(4);
    });
  });
});
