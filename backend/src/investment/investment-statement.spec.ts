import { Prisma } from '@prisma/client';
import { buildStatementData, type StatementTransactionRow } from './investment-statement';
import { renderStatementPdf } from './investment-statement-pdf';

const d = (iso: string) => new Date(`${iso}Z`);
const row = (
  type: StatementTransactionRow['type'],
  amount: number,
  iso: string,
  extra: Partial<StatementTransactionRow> = {},
): StatementTransactionRow => ({
  type,
  amount,
  createdAt: d(iso),
  currency: null,
  creditTarget: 'AVAILABLE',
  ...extra,
});

const NOW = d('2026-09-24T18:00:00');

describe('buildStatementData', () => {
  const rows: StatementTransactionRow[] = [
    row('DEPOSIT', 1000, '2026-07-27T10:00:00', { currency: 'USDC', creditTarget: 'INVESTMENT' }),
    // Dépôt destiné au solde principal : ne doit pas apparaître.
    row('DEPOSIT', 500, '2026-07-27T11:00:00'),
    row('INVESTMENT_DEPOSIT', 900, '2026-07-27T12:00:00'),
    row('INVESTMENT_YIELD_ACCRUAL', 10, '2026-08-01T03:15:00'),
    row('INVESTMENT_YIELD_ACCRUAL', 5, '2026-08-02T03:15:00'),
    row('FIXED_TERM_YIELD_ACCRUAL', -3, '2026-09-10T03:15:00'),
    row('INVESTMENT_WITHDRAWAL', 400, '2026-09-15T10:00:00'),
  ];

  it('agrège les rendements par mois et ignore les dépôts hors wallet investissement', () => {
    const data = buildStatementData(rows, [], 3, NOW);
    const kinds = data.operations.map((o) => o.kind);
    expect(kinds.filter((k) => k === 'DEPOSIT')).toHaveLength(1);
    const yields = data.operations.filter((o) => o.kind === 'YIELD_MONTH');
    expect(yields).toHaveLength(2);
    expect(yields[0].amount.toNumber()).toBe(15);
    expect(yields[0].count).toBe(2);
    expect(yields[1].amount.toNumber()).toBe(-3);
  });

  it('signe les opérations du point de vue du wallet (placement sortant, retrait entrant)', () => {
    const data = buildStatementData(rows, [], 3, NOW);
    expect(data.operations.find((o) => o.kind === 'PLACEMENT')!.amount.toNumber()).toBe(-900);
    expect(data.operations.find((o) => o.kind === 'WITHDRAWAL')!.amount.toNumber()).toBe(400);
  });

  it('calcule la synthèse cohérente avec la performance (ouverture + placé - retiré + rendement = clôture)', () => {
    const data = buildStatementData(rows, [], 3, NOW);
    const { openingValue, deposits, withdrawals, yieldNet, closingValue } = data.summary;
    expect(deposits.toNumber()).toBe(900);
    expect(withdrawals.toNumber()).toBe(400);
    expect(yieldNet.toNumber()).toBe(12);
    expect(openingValue.toNumber()).toBe(0);
    expect(openingValue.plus(deposits).minus(withdrawals).plus(yieldNet).toNumber()).toBe(
      closingValue.toNumber(),
    );
    expect(data.summary.returnPct).toBeCloseTo((12 / 900) * 100, 6);
  });

  it('renvoie un rendement null (jamais 0 fabriqué) quand aucun capital n’a été engagé', () => {
    const data = buildStatementData([], [], 6, NOW);
    expect(data.summary.returnPct).toBeNull();
    // Aucune activité : on garde seulement le dernier mois plutôt qu'une grille vide.
    expect(data.months).toHaveLength(1);
  });

  it('commence la période au premier mois actif (pas de mois vides en tête)', () => {
    const data = buildStatementData(rows, [], 12, NOW);
    expect(data.months.map((m) => m.month)).toEqual(['2026-07', '2026-08', '2026-09']);
    expect(data.from.toISOString()).toBe('2026-07-01T00:00:00.000Z');
  });

  it("ne garde que les positions actives ou touchées par la période", () => {
    const old = new Date('2025-01-01T00:00:00Z');
    const mk = (status: 'ACTIVE' | 'CLOSED', closedAt: Date | null) => ({
      kind: 'BASKET' as const,
      key: 'RWA_STRATEGY',
      status,
      openedAt: old,
      closedAt,
      maturityDate: null,
      principal: new Prisma.Decimal(1),
      accruedYield: new Prisma.Decimal(0),
    });
    const data = buildStatementData([], [mk('ACTIVE', null), mk('CLOSED', old)], 3, NOW);
    expect(data.positions).toHaveLength(1);
  });
});

describe('renderStatementPdf', () => {
  it('génère un PDF valide en français comme en anglais', async () => {
    const data = buildStatementData(
      [
        row('DEPOSIT', 1000, '2026-07-27T10:00:00', { currency: 'USDC', creditTarget: 'INVESTMENT' }),
        row('INVESTMENT_DEPOSIT', 900, '2026-07-27T12:00:00'),
        row('INVESTMENT_YIELD_ACCRUAL', 10, '2026-08-01T03:15:00'),
      ],
      [],
      12,
      NOW,
    );
    for (const locale of ['fr', 'en'] as const) {
      const pdf = await renderStatementPdf({
        data,
        locale,
        clientName: 'Julien Marbot',
        email: 'j@example.com',
        accountRef: 'HV-TEST',
        issuedAt: NOW,
      });
      expect(Buffer.from(pdf.slice(0, 4)).toString()).toBe('%PDF');
      expect(pdf.length).toBeGreaterThan(1500);
    }
  });
});
