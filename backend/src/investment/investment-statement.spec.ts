import { Prisma } from '@prisma/client';
import {
  buildStatementData,
  statementFingerprint,
  type StatementPositionRow,
  type StatementTransactionRow,
} from './investment-statement';
import { renderStatementPdf } from './investment-statement-pdf';

const d = (iso: string) => new Date(`${iso}Z`);
let seq = 0;
const row = (
  type: StatementTransactionRow['type'],
  amount: number,
  iso: string,
  extra: Partial<StatementTransactionRow> = {},
): StatementTransactionRow => ({
  id: `00000000-0000-0000-0000-${String(++seq).padStart(12, '0')}`,
  type,
  amount,
  createdAt: d(iso),
  currency: null,
  creditTarget: 'AVAILABLE',
  referenceTx: null,
  ...extra,
});

const NOW = d('2026-09-24T18:00:00');

const makeRows = (): StatementTransactionRow[] => [
  row('DEPOSIT', 1000, '2026-07-27T10:00:00', {
    currency: 'USDC',
    creditTarget: 'INVESTMENT',
  }),
  // Dépôt destiné au solde principal : ne doit apparaître ni dans les mouvements ni dans le solde.
  row('DEPOSIT', 500, '2026-07-27T11:00:00'),
  row('INVESTMENT_DEPOSIT', 900, '2026-07-27T12:00:00'),
  row('INVESTMENT_YIELD_ACCRUAL', 10, '2026-08-01T03:15:00'),
  row('INVESTMENT_YIELD_ACCRUAL', 5, '2026-08-02T03:15:00'),
  row('FIXED_TERM_YIELD_ACCRUAL', -3, '2026-09-10T03:15:00'),
  row('INVESTMENT_WITHDRAWAL', 400, '2026-09-15T10:00:00'),
];

describe('buildStatementData', () => {
  it('regroupe les rendements par mois, hors des mouvements du wallet', () => {
    const data = buildStatementData(makeRows(), [], 3, NOW);
    expect(data.yields).toHaveLength(2);
    expect(data.yields[0]).toMatchObject({
      month: '2026-08',
      ref: 'RDT-202608',
      count: 2,
    });
    expect(data.yields[0].amount.toNumber()).toBe(15);
    expect(data.yields[1].amount.toNumber()).toBe(-3);
    expect(data.operations.filter((o) => o.kind === 'DEPOSIT')).toHaveLength(1);
  });

  it('numérote chaque opération et tient un solde courant du wallet', () => {
    const data = buildStatementData(makeRows(), [], 3, NOW);
    expect(data.operations.map((o) => o.kind)).toEqual([
      'DEPOSIT',
      'PLACEMENT',
      'WITHDRAWAL',
    ]);
    expect(data.operations.every((o) => /^OP-[0-9A-F]{8}$/.test(o.ref))).toBe(
      true,
    );
    expect(data.operations.map((o) => o.balanceAfter.toNumber())).toEqual([
      1000, 100, 500,
    ]);
    expect(data.wallet.opening.toNumber()).toBe(0);
    expect(data.wallet.closing.toNumber()).toBe(500);
  });

  it('rapproche le wallet : ouverture + apports + encaissements - placements - virements = clôture', () => {
    const w = buildStatementData(makeRows(), [], 3, NOW).wallet;
    expect(w.contributions.toNumber()).toBe(1000);
    expect(w.proceeds.toNumber()).toBe(400);
    expect(w.placements.toNumber()).toBe(900);
    expect(
      w.opening
        .plus(w.contributions)
        .plus(w.proceeds)
        .minus(w.placements)
        .minus(w.transfersOut)
        .toNumber(),
    ).toBe(w.closing.toNumber());
  });

  it('rapproche le portefeuille : ouverture + placé - retiré + rendement = clôture', () => {
    const {
      openingValue,
      deposits,
      withdrawals,
      yieldNet,
      closingValue,
      returnPct,
    } = buildStatementData(makeRows(), [], 3, NOW).summary;
    expect(deposits.toNumber()).toBe(900);
    expect(withdrawals.toNumber()).toBe(400);
    expect(yieldNet.toNumber()).toBe(12);
    expect(
      openingValue.plus(deposits).minus(withdrawals).plus(yieldNet).toNumber(),
    ).toBe(closingValue.toNumber());
    expect(returnPct).toBeCloseTo((12 / 900) * 100, 6);
  });

  it("reprend le solde du wallet d'avant la période comme solde d'ouverture", () => {
    const rows = [
      row('DEPOSIT', 700, '2026-06-01T10:00:00', {
        creditTarget: 'INVESTMENT',
      }),
      row('INVESTMENT_DEPOSIT', 200, '2026-08-05T10:00:00'),
    ];
    // Fenêtre juin-août : le dépôt de juin ne touche que le wallet, la période commence donc
    // au premier mois où le portefeuille bouge (août) et le wallet s'ouvre à 700.
    const data = buildStatementData(rows, [], 3, d('2026-08-30T00:00:00'));
    expect(data.from.toISOString()).toBe('2026-08-01T00:00:00.000Z');
    expect(data.wallet.opening.toNumber()).toBe(700);
    expect(data.wallet.closing.toNumber()).toBe(500);
  });

  it("renvoie un rendement null (jamais 0 fabriqué) quand aucun capital n'a été engagé", () => {
    const data = buildStatementData([], [], 6, NOW);
    expect(data.summary.returnPct).toBeNull();
    expect(data.months).toHaveLength(1);
  });

  it('commence la période au premier mois actif (pas de mois vides en tête)', () => {
    const data = buildStatementData(makeRows(), [], 12, NOW);
    expect(data.months.map((m) => m.month)).toEqual([
      '2026-07',
      '2026-08',
      '2026-09',
    ]);
    expect(data.from.toISOString()).toBe('2026-07-01T00:00:00.000Z');
  });

  it('ne garde que les positions actives ou touchées par la période', () => {
    const old = new Date('2025-01-01T00:00:00Z');
    const mk = (
      id: string,
      status: 'ACTIVE' | 'CLOSED',
      closedAt: Date | null,
    ): StatementPositionRow => ({
      id,
      kind: 'BASKET',
      key: 'RWA_STRATEGY',
      status,
      openedAt: old,
      closedAt,
      maturityDate: null,
      principal: new Prisma.Decimal(1),
      accruedYield: new Prisma.Decimal(0),
    });
    const data = buildStatementData(
      [],
      [mk('a', 'ACTIVE', null), mk('b', 'CLOSED', old)],
      3,
      NOW,
    );
    expect(data.positions).toHaveLength(1);
  });
});

describe('statementFingerprint', () => {
  it('est stable pour les mêmes données et change si un montant change', () => {
    const rows = makeRows();
    const a = statementFingerprint(
      buildStatementData(rows, [], 3, NOW),
      'HV-TEST',
    );
    const b = statementFingerprint(
      buildStatementData(rows, [], 3, NOW),
      'HV-TEST',
    );
    expect(a).toMatch(/^[0-9A-F]{64}$/);
    expect(a).toBe(b);
    const tampered = rows.map((r) =>
      r.type === 'INVESTMENT_DEPOSIT' ? { ...r, amount: 901 } : r,
    );
    expect(
      statementFingerprint(buildStatementData(tampered, [], 3, NOW), 'HV-TEST'),
    ).not.toBe(a);
  });
});

describe('renderStatementPdf', () => {
  it('génère un PDF valide dans chaque langue et chaque monnaie', async () => {
    const data = buildStatementData(makeRows(), [], 12, NOW);
    for (const locale of ['fr', 'en'] as const) {
      for (const currency of ['USD', 'EUR'] as const) {
        const pdf = await renderStatementPdf({
          data,
          locale,
          currency,
          eurPerUsd: 0.86,
          clientName: 'Julien Marbot',
          clientAddressLines: ['14 chemin des Vignes', '1260 Nyon', 'Suisse'],
          email: 'j@example.com',
          accountRef: 'HV-TEST',
          issuedAt: NOW,
        });
        expect(Buffer.from(pdf.slice(0, 4)).toString()).toBe('%PDF');
        expect(pdf.length).toBeGreaterThan(20000);
      }
    }
  });
});
