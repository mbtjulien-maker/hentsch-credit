import { Prisma, TransactionType } from '@prisma/client';
import {
  buildInvestmentPerformance,
  PERFORMANCE_MONTHS,
  PerformanceTransactionRow,
} from './investment-performance';

function row(
  type: TransactionType,
  amount: string,
  iso: string,
): PerformanceTransactionRow {
  return { type, amount: new Prisma.Decimal(amount), createdAt: new Date(iso) };
}

const NOW = new Date('2026-09-24T12:00:00.000Z');

describe('buildInvestmentPerformance', () => {
  it('returns 12 zeroed calendar months (current month last) when the client never invested', () => {
    const result = buildInvestmentPerformance([], NOW);

    expect(result.months).toHaveLength(PERFORMANCE_MONTHS);
    expect(result.months[0].month).toBe('2025-10');
    expect(result.months[11].month).toBe('2026-09');
    expect(result.months.every((m) => m.endValueUsd.isZero())).toBe(true);
    expect(result.totals.currentValueUsd.toString()).toBe('0');
    // Jamais un 0 % fabriqué quand aucun capital n'a été engagé.
    expect(result.totals.returnPct).toBeNull();
    expect(result.periodDays).toBe(365);
    expect(result.from).toBe('2025-10-01T00:00:00.000Z');
  });

  it('accumulates deposits, yield and the running portfolio value month by month', () => {
    const result = buildInvestmentPerformance(
      [
        row('INVESTMENT_DEPOSIT', '1000', '2026-07-10T09:00:00Z'),
        row('INVESTMENT_YIELD_ACCRUAL', '5', '2026-07-20T03:15:00Z'),
        row('INVESTMENT_YIELD_ACCRUAL', '7.5', '2026-08-02T03:15:00Z'),
        row('FIXED_TERM_DEPOSIT', '500', '2026-08-15T09:00:00Z'),
        row('FIXED_TERM_YIELD_ACCRUAL', '2', '2026-09-01T03:30:00Z'),
      ],
      NOW,
    );

    const byMonth = Object.fromEntries(result.months.map((m) => [m.month, m]));
    expect(byMonth['2026-06'].endValueUsd.toString()).toBe('0');
    expect(byMonth['2026-07'].depositsUsd.toString()).toBe('1000');
    expect(byMonth['2026-07'].yieldUsd.toString()).toBe('5');
    expect(byMonth['2026-07'].endValueUsd.toString()).toBe('1005');
    expect(byMonth['2026-08'].depositsUsd.toString()).toBe('500');
    expect(byMonth['2026-08'].yieldUsd.toString()).toBe('7.5');
    expect(byMonth['2026-08'].endValueUsd.toString()).toBe('1512.5');
    expect(byMonth['2026-09'].endValueUsd.toString()).toBe('1514.5');

    expect(result.totals.depositsUsd.toString()).toBe('1500');
    expect(result.totals.yieldUsd.toString()).toBe('14.5');
    expect(result.totals.currentValueUsd.toString()).toBe('1514.5');
    // 14.5 / 1500 = 0.9667 %
    expect(result.totals.returnPct).toBeCloseTo(0.96667, 4);
  });

  it('keeps a negative month negative (real risk of loss, never floored to zero)', () => {
    const result = buildInvestmentPerformance(
      [
        row('INVESTMENT_DEPOSIT', '1000', '2026-08-05T09:00:00Z'),
        row('INVESTMENT_YIELD_ACCRUAL', '-12.25', '2026-09-03T03:15:00Z'),
      ],
      NOW,
    );

    const september = result.months[11];
    expect(september.yieldUsd.toString()).toBe('-12.25');
    expect(september.endValueUsd.toString()).toBe('987.75');
    expect(result.totals.returnPct).toBeLessThan(0);
  });

  it('removes capital and yield from the portfolio when a position is withdrawn or matures', () => {
    const result = buildInvestmentPerformance(
      [
        row('INVESTMENT_DEPOSIT', '1000', '2026-06-10T09:00:00Z'),
        row('INVESTMENT_YIELD_ACCRUAL', '20', '2026-07-01T03:15:00Z'),
        row('INVESTMENT_WITHDRAWAL', '1020', '2026-08-12T10:00:00Z'),
        row('FIXED_TERM_DEPOSIT', '400', '2026-08-13T10:00:00Z'),
        row('FIXED_TERM_MATURITY_PAYOUT', '410', '2026-09-13T03:30:00Z'),
      ],
      NOW,
    );

    const byMonth = Object.fromEntries(result.months.map((m) => [m.month, m]));
    expect(byMonth['2026-07'].endValueUsd.toString()).toBe('1020');
    expect(byMonth['2026-08'].withdrawalsUsd.toString()).toBe('1020');
    expect(byMonth['2026-08'].endValueUsd.toString()).toBe('400');
    expect(byMonth['2026-09'].withdrawalsUsd.toString()).toBe('410');
    expect(byMonth['2026-09'].endValueUsd.toString()).toBe('-10');
  });

  it('carries the value accumulated before the 12-month window into the opening balance', () => {
    const result = buildInvestmentPerformance(
      [
        row('INVESTMENT_DEPOSIT', '2000', '2025-03-01T09:00:00Z'),
        row('INVESTMENT_YIELD_ACCRUAL', '100', '2025-06-01T03:15:00Z'),
        row('INVESTMENT_YIELD_ACCRUAL', '10', '2026-01-15T03:15:00Z'),
      ],
      NOW,
    );

    // Valeur d'ouverture 2 100 (hors fenêtre) + 10 de rendement dans la fenêtre.
    expect(result.months[0].endValueUsd.toString()).toBe('2100');
    expect(result.totals.currentValueUsd.toString()).toBe('2110');
    expect(result.totals.depositsUsd.toString()).toBe('0');
    expect(result.totals.yieldUsd.toString()).toBe('10');
    // Rendement rapporté au capital engagé (ouverture 2 100 + 0 dépôt dans la période).
    expect(result.totals.returnPct).toBeCloseTo((10 / 2100) * 100, 6);
  });

  it('ignores wallet movements and any transaction type that is not part of the invested portfolio', () => {
    const result = buildInvestmentPerformance(
      [
        row('INVESTMENT_WALLET_TRANSFER_IN', '5000', '2026-09-01T09:00:00Z'),
        row('DEPOSIT', '300', '2026-09-02T09:00:00Z'),
        row('WITHDRAWAL', '100', '2026-09-03T09:00:00Z'),
      ],
      NOW,
    );

    expect(result.totals.currentValueUsd.toString()).toBe('0');
    expect(result.totals.depositsUsd.toString()).toBe('0');
  });

  it('is independent of the input order', () => {
    const rows = [
      row('INVESTMENT_YIELD_ACCRUAL', '5', '2026-09-02T03:15:00Z'),
      row('INVESTMENT_DEPOSIT', '1000', '2026-09-01T09:00:00Z'),
    ];
    const forward = buildInvestmentPerformance(rows, NOW);
    const reversed = buildInvestmentPerformance([...rows].reverse(), NOW);

    expect(forward.totals.currentValueUsd.toString()).toBe(
      reversed.totals.currentValueUsd.toString(),
    );
    expect(forward.totals.currentValueUsd.toString()).toBe('1005');
  });
});
