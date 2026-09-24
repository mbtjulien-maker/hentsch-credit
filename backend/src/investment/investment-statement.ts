import { createHash } from 'crypto';
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
// rendements quotidiens (regroupés par mois dans le relevé).
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
  id: string;
  type: TransactionType;
  amount: Prisma.Decimal.Value;
  createdAt: Date;
  currency: string | null;
  creditTarget: 'AVAILABLE' | 'INVESTMENT';
  // Hash on-chain (dépôt crypto) ou référence de paiement — affiché tel quel dans le libellé.
  referenceTx: string | null;
}

export type StatementOperationKind =
  | 'DEPOSIT'
  | 'CARD_TOPUP'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'PLACEMENT'
  | 'PLACEMENT_FIXED'
  | 'WITHDRAWAL'
  | 'MATURITY';

// Mouvement du wallet investissement (liquidités), avec son solde courant : c'est la
// traçabilité d'un relevé de compte — chaque ligne a une référence, une date, un sens
// (débit / crédit) et le solde du wallet après l'opération.
export interface StatementOperation {
  at: Date;
  ref: string;
  kind: StatementOperationKind;
  currency: string | null;
  referenceTx: string | null;
  // Vu du wallet : + entrée (crédit), - sortie (débit).
  amount: Prisma.Decimal;
  balanceAfter: Prisma.Decimal;
}

// Rendements crédités sur les placements, regroupés par mois (un crédit par placement et
// par jour, cf. cron de 3h15) : ils ne touchent pas le wallet mais la valeur du portefeuille.
export interface StatementYieldMonth {
  month: string;
  ref: string;
  firstAt: Date;
  lastAt: Date;
  count: number;
  amount: Prisma.Decimal;
}

export interface StatementPositionRow {
  id: string;
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
  wallet: {
    opening: Prisma.Decimal;
    closing: Prisma.Decimal;
    // Décomposition de la variation, du point de vue du wallet.
    contributions: Prisma.Decimal; // dépôts, recharges, virements reçus
    proceeds: Prisma.Decimal; // retraits de paniers, règlements à échéance
    placements: Prisma.Decimal; // capital placé (sortie)
    transfersOut: Prisma.Decimal; // virements vers le solde principal (sortie)
  };
  operations: StatementOperation[];
  yields: StatementYieldMonth[];
  positions: StatementPositionRow[];
}

const zero = () => new Prisma.Decimal(0);
const monthKeyOf = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

// Effet d'une transaction sur le wallet investissement (null = sans effet sur le wallet :
// dépôt vers le solde principal, rendement).
function walletEffect(
  row: StatementTransactionRow,
): { kind: StatementOperationKind; delta: Prisma.Decimal } | null {
  const amount = new Prisma.Decimal(row.amount);
  switch (row.type) {
    case 'DEPOSIT':
      return row.creditTarget === 'INVESTMENT' ? { kind: 'DEPOSIT', delta: amount } : null;
    case 'CARD_TOPUP':
      return row.creditTarget === 'INVESTMENT' ? { kind: 'CARD_TOPUP', delta: amount } : null;
    case 'INVESTMENT_WALLET_TRANSFER_IN':
      return { kind: 'TRANSFER_IN', delta: amount };
    case 'INVESTMENT_WALLET_TRANSFER_OUT':
      return { kind: 'TRANSFER_OUT', delta: amount.negated() };
    case 'INVESTMENT_DEPOSIT':
      return { kind: 'PLACEMENT', delta: amount.negated() };
    case 'FIXED_TERM_DEPOSIT':
      return { kind: 'PLACEMENT_FIXED', delta: amount.negated() };
    case 'INVESTMENT_WITHDRAWAL':
      return { kind: 'WITHDRAWAL', delta: amount };
    case 'FIXED_TERM_MATURITY_PAYOUT':
      return { kind: 'MATURITY', delta: amount };
    default:
      return null;
  }
}

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
    (m) =>
      !m.depositsUsd.isZero() ||
      !m.withdrawalsUsd.isZero() ||
      !m.yieldUsd.isZero() ||
      !m.endValueUsd.isZero(),
  );
  const months = firstActive === -1 ? window.slice(-1) : window.slice(firstActive);
  const from = new Date(`${months[0].month}-01T00:00:00.000Z`);

  const deposits = months.reduce((s, m) => s.plus(m.depositsUsd), zero());
  const withdrawals = months.reduce((s, m) => s.plus(m.withdrawalsUsd), zero());
  const yieldNet = months.reduce((s, m) => s.plus(m.yieldUsd), zero());
  const closingValue = perf.totals.currentValueUsd;
  const openingValue = closingValue.minus(deposits).plus(withdrawals).minus(yieldNet);
  const committed = openingValue.plus(deposits);
  const returnPct = committed.gt(0) ? yieldNet.div(committed).mul(100).toNumber() : null;

  // Wallet : solde courant recalculé sur tout le journal (le solde d'ouverture de la période
  // est celui juste avant `from`), jamais lu ailleurs — un relevé doit se recouper.
  const sorted = rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => a.row.createdAt.getTime() - b.row.createdAt.getTime() || a.index - b.index)
    .map((x) => x.row);

  let running = zero();
  let walletOpening = zero();
  let openingSet = false;
  const operations: StatementOperation[] = [];
  const wallet = {
    contributions: zero(),
    proceeds: zero(),
    placements: zero(),
    transfersOut: zero(),
  };
  const yieldByMonth = new Map<string, StatementYieldMonth>();

  for (const row of sorted) {
    if (row.createdAt > now) continue;
    const inPeriod = row.createdAt >= from;
    if (inPeriod && !openingSet) {
      walletOpening = running;
      openingSet = true;
    }
    const effect = walletEffect(row);
    if (effect) {
      running = running.plus(effect.delta);
      if (inPeriod) {
        operations.push({
          at: row.createdAt,
          ref: `OP-${row.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
          kind: effect.kind,
          currency: row.currency,
          referenceTx: row.referenceTx,
          amount: effect.delta,
          balanceAfter: running,
        });
        switch (effect.kind) {
          case 'DEPOSIT':
          case 'CARD_TOPUP':
          case 'TRANSFER_IN':
            wallet.contributions = wallet.contributions.plus(effect.delta);
            break;
          case 'WITHDRAWAL':
          case 'MATURITY':
            wallet.proceeds = wallet.proceeds.plus(effect.delta);
            break;
          case 'PLACEMENT':
          case 'PLACEMENT_FIXED':
            wallet.placements = wallet.placements.plus(effect.delta.abs());
            break;
          case 'TRANSFER_OUT':
            wallet.transfersOut = wallet.transfersOut.plus(effect.delta.abs());
            break;
        }
      }
      continue;
    }
    if (
      inPeriod &&
      (row.type === 'INVESTMENT_YIELD_ACCRUAL' || row.type === 'FIXED_TERM_YIELD_ACCRUAL')
    ) {
      const key = monthKeyOf(row.createdAt);
      const cur = yieldByMonth.get(key) ?? {
        month: key,
        ref: `RDT-${key.replace('-', '')}`,
        firstAt: row.createdAt,
        lastAt: row.createdAt,
        count: 0,
        amount: zero(),
      };
      cur.amount = cur.amount.plus(new Prisma.Decimal(row.amount));
      cur.count += 1;
      cur.lastAt = row.createdAt;
      yieldByMonth.set(key, cur);
    }
  }
  if (!openingSet) walletOpening = running;

  return {
    from,
    to: now,
    months,
    summary: { openingValue, deposits, withdrawals, yieldNet, closingValue, returnPct },
    wallet: { opening: walletOpening, closing: running, ...wallet },
    operations,
    yields: [...yieldByMonth.values()].sort((a, b) => a.month.localeCompare(b.month)),
    // Positions ouvertes pendant la période ou encore actives.
    positions: positions.filter(
      (p) => p.status === 'ACTIVE' || (p.closedAt ?? p.openedAt) >= from,
    ),
  };
}

// Empreinte d'intégrité du contenu chiffré du relevé (SHA-256 sur une sérialisation
// canonique des données, pas du PDF lui-même) : deux éditions du même relevé portent la
// même empreinte, toute modification d'un chiffre en change la valeur.
export function statementFingerprint(data: StatementData, accountRef: string): string {
  const canonical = JSON.stringify({
    accountRef,
    from: data.from.toISOString(),
    to: data.to.toISOString(),
    summary: {
      o: data.summary.openingValue.toFixed(6),
      d: data.summary.deposits.toFixed(6),
      w: data.summary.withdrawals.toFixed(6),
      y: data.summary.yieldNet.toFixed(6),
      c: data.summary.closingValue.toFixed(6),
    },
    wallet: [data.wallet.opening.toFixed(6), data.wallet.closing.toFixed(6)],
    operations: data.operations.map((o) => [o.ref, o.at.toISOString(), o.amount.toFixed(6)]),
    yields: data.yields.map((y) => [y.ref, y.count, y.amount.toFixed(6)]),
    positions: data.positions.map((p) => [p.id, p.principal.toFixed(6), p.accruedYield.toFixed(6)]),
  });
  return createHash('sha256').update(canonical).digest('hex').toUpperCase();
}
