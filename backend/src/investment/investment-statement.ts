import { Prisma, TransactionType } from '@prisma/client';
import {
  buildInvestmentPerformance,
  type InvestmentPerformanceMonth,
} from './investment-performance';

export type StatementLocale = 'fr' | 'en';
export const STATEMENT_PERIODS = [3, 6, 12] as const;
export type StatementPeriod = (typeof STATEMENT_PERIODS)[number];

// Transactions qui composent le relevé : mouvements du wallet investissement (dépôts
// destinés à l'investissement, virements internes), placements/retraits/règlements, et
// rendements quotidiens (agrégés par mois dans le relevé — un rendement par placement et
// par jour rendrait la liste illisible, cf. entrée #56 du journal).
export const STATEMENT_TRANSACTION_TYPES: TransactionType[] = [
  'DEPOSIT',
  'CARD_TOPUP',
  'INVESTMENT_WALLET_TRANSFER_IN',
  'INVESTMENT_WALLET_TRANSFER_OUT',
  'INVESTMENT_DEPOSIT',
  'FIXED_TERM_DEPOSIT',
  'INVESTMENT_WITHDRAWAL',
  'FIXED_TERM_MATURITY_PAYOUT',
  'INVESTMENT_YIELD_ACCRUAL',
  'FIXED_TERM_YIELD_ACCRUAL',
];

export interface StatementTransactionRow {
  type: TransactionType;
  amount: Prisma.Decimal.Value;
  createdAt: Date;
  currency: string | null;
  creditTarget: 'AVAILABLE' | 'INVESTMENT';
}

export type StatementOperationKind =
  | 'DEPOSIT'
  | 'CARD_TOPUP'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'PLACEMENT'
  | 'PLACEMENT_FIXED'
  | 'WITHDRAWAL'
  | 'MATURITY'
  | 'YIELD_MONTH';

export interface StatementOperation {
  at: Date;
  kind: StatementOperationKind;
  // Actif crypto du dépôt (USDC, USDT…), sinon null.
  currency: string | null;
  // Montant vu du wallet investissement : + entrée, - sortie.
  amount: Prisma.Decimal;
  // Nombre de crédits de rendement regroupés (YIELD_MONTH uniquement).
  count?: number;
}

export interface StatementPositionRow {
  kind: 'BASKET' | 'PLAN';
  key: string;
  status: 'ACTIVE' | 'CLOSED' | 'MATURED';
  openedAt: Date;
  closedAt: Date | null;
  maturityDate: Date | null;
  principal: Prisma.Decimal;
  accruedYield: Prisma.Decimal;
}

export interface StatementData {
  from: Date;
  to: Date;
  months: InvestmentPerformanceMonth[];
  summary: {
    openingValue: Prisma.Decimal;
    deposits: Prisma.Decimal;
    withdrawals: Prisma.Decimal;
    yieldNet: Prisma.Decimal;
    closingValue: Prisma.Decimal;
    returnPct: number | null;
  };
  operations: StatementOperation[];
  positions: StatementPositionRow[];
}

const zero = () => new Prisma.Decimal(0);

// Fonction pure — reconstitue le relevé d'une période à partir du journal réel (mêmes
// sources que le graphique de performance, donc jamais deux chiffres divergents pour la
// même période). Rien n'est fabriqué : un mois sans mouvement reste à zéro.
export function buildStatementData(
  rows: StatementTransactionRow[],
  positions: StatementPositionRow[],
  periodMonths: StatementPeriod,
  now: Date = new Date(),
): StatementData {
  const perf = buildInvestmentPerformance(rows, now);
  // Les mois d'avant la première activité (ou les premiers mois vides de la fenêtre) ne
  // disent rien au lecteur : on commence au premier mois actif, en gardant au moins le
  // dernier mois si le compte n'a jamais rien investi.
  const window = perf.months.slice(-periodMonths);
  const firstActive = window.findIndex(
    (m) => !m.depositsUsd.isZero() || !m.withdrawalsUsd.isZero() || !m.yieldUsd.isZero() || !m.endValueUsd.isZero(),
  );
  const months = firstActive === -1 ? window.slice(-1) : window.slice(firstActive);
  const from = new Date(`${months[0].month}-01T00:00:00.000Z`);

  const deposits = months.reduce((s, m) => s.plus(m.depositsUsd), zero());
  const withdrawals = months.reduce((s, m) => s.plus(m.withdrawalsUsd), zero());
  const yieldNet = months.reduce((s, m) => s.plus(m.yieldUsd), zero());
  const closingValue = perf.totals.currentValueUsd;
  const openingValue = closingValue
    .minus(deposits)
    .plus(withdrawals)
    .minus(yieldNet);
  const committed = openingValue.plus(deposits);
  const returnPct = committed.gt(0)
    ? yieldNet.div(committed).mul(100).toNumber()
    : null;

  const operations: StatementOperation[] = [];
  const yieldByMonth = new Map<string, { sum: Prisma.Decimal; count: number }>();

  for (const row of rows) {
    if (row.createdAt < from || row.createdAt > now) continue;
    const amount = new Prisma.Decimal(row.amount);
    switch (row.type) {
      case 'DEPOSIT':
      case 'CARD_TOPUP':
        // Seuls les dépôts destinés au wallet investissement intéressent ce relevé.
        if (row.creditTarget !== 'INVESTMENT') break;
        operations.push({
          at: row.createdAt,
          kind: row.type === 'DEPOSIT' ? 'DEPOSIT' : 'CARD_TOPUP',
          currency: row.currency,
          amount,
        });
        break;
      case 'INVESTMENT_WALLET_TRANSFER_IN':
        operations.push({ at: row.createdAt, kind: 'TRANSFER_IN', currency: null, amount });
        break;
      case 'INVESTMENT_WALLET_TRANSFER_OUT':
        operations.push({ at: row.createdAt, kind: 'TRANSFER_OUT', currency: null, amount: amount.negated() });
        break;
      case 'INVESTMENT_DEPOSIT':
        operations.push({ at: row.createdAt, kind: 'PLACEMENT', currency: null, amount: amount.negated() });
        break;
      case 'FIXED_TERM_DEPOSIT':
        operations.push({ at: row.createdAt, kind: 'PLACEMENT_FIXED', currency: null, amount: amount.negated() });
        break;
      case 'INVESTMENT_WITHDRAWAL':
        operations.push({ at: row.createdAt, kind: 'WITHDRAWAL', currency: null, amount });
        break;
      case 'FIXED_TERM_MATURITY_PAYOUT':
        operations.push({ at: row.createdAt, kind: 'MATURITY', currency: null, amount });
        break;
      case 'INVESTMENT_YIELD_ACCRUAL':
      case 'FIXED_TERM_YIELD_ACCRUAL': {
        const key = `${row.createdAt.getUTCFullYear()}-${String(row.createdAt.getUTCMonth() + 1).padStart(2, '0')}`;
        const cur = yieldByMonth.get(key) ?? { sum: zero(), count: 0 };
        cur.sum = cur.sum.plus(amount);
        cur.count += 1;
        yieldByMonth.set(key, cur);
        break;
      }
      default:
        break;
    }
  }

  // Une ligne de rendement par mois, datée de la fin de la période couverte par ce mois
  // (dernier jour du mois, ou `now` pour le mois en cours).
  for (const [key, { sum, count }] of yieldByMonth) {
    const [y, m] = key.split('-').map(Number);
    const endOfMonth = new Date(Date.UTC(y, m, 0, 23, 59, 59));
    operations.push({
      at: endOfMonth > now ? now : endOfMonth,
      kind: 'YIELD_MONTH',
      currency: null,
      amount: sum,
      count,
    });
  }
  operations.sort((a, b) => a.at.getTime() - b.at.getTime());

  return {
    from,
    to: now,
    months,
    summary: { openingValue, deposits, withdrawals, yieldNet, closingValue, returnPct },
    operations,
    // Positions ouvertes pendant la période ou encore actives.
    positions: positions.filter(
      (p) => p.status === 'ACTIVE' || (p.closedAt ?? p.openedAt) >= from,
    ),
  };
}
