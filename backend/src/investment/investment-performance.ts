import { Prisma, TransactionType } from '@prisma/client';

// Nombre de mois glissants exposés à l'espace Investissement ("cadran de 365 jours",
// retour client : ce que le capital a généré selon les différents mois de l'année) — 12
// mois calendaires UTC, le mois en cours inclus (partiel, jusqu'à `now`).
export const PERFORMANCE_MONTHS = 12;

// Types de transaction qui composent la valeur du portefeuille investi (paniers perpétuels
// ET plans à échéance fixe, cf. §2H CLAUDE.md) — les mouvements de wallet (virement
// interne, dépôt direct) n'en font volontairement pas partie : ils déplacent du cash
// vers/depuis le wallet, pas le portefeuille placé.
const DEPOSIT_TYPES: ReadonlySet<TransactionType> = new Set([
  'INVESTMENT_DEPOSIT',
  'FIXED_TERM_DEPOSIT',
]);
const WITHDRAWAL_TYPES: ReadonlySet<TransactionType> = new Set([
  'INVESTMENT_WITHDRAWAL',
  'FIXED_TERM_MATURITY_PAYOUT',
]);
const ACCRUAL_TYPES: ReadonlySet<TransactionType> = new Set([
  'INVESTMENT_YIELD_ACCRUAL',
  'FIXED_TERM_YIELD_ACCRUAL',
]);

export const PERFORMANCE_TRANSACTION_TYPES: TransactionType[] = [
  ...DEPOSIT_TYPES,
  ...WITHDRAWAL_TYPES,
  ...ACCRUAL_TYPES,
];

export interface PerformanceTransactionRow {
  type: TransactionType;
  amount: Prisma.Decimal.Value;
  createdAt: Date;
}

export interface InvestmentPerformanceMonth {
  // 'YYYY-MM' (UTC) — le frontend le formate selon la langue de l'utilisateur.
  month: string;
  // Capital placé pendant ce mois (paniers + plans à échéance fixe).
  depositsUsd: Prisma.Decimal;
  // Capital + rendement rapatrié vers le wallet pendant ce mois.
  withdrawalsUsd: Prisma.Decimal;
  // Rendement net généré pendant ce mois — peut être négatif (vrai risque de perte,
  // cf. §2H : l'accrual quotidien n'est jamais garanti).
  yieldUsd: Prisma.Decimal;
  // Valeur du portefeuille investi (capital + rendement accru des positions encore
  // actives) à la fin du mois — ou à `now` pour le mois en cours.
  endValueUsd: Prisma.Decimal;
}

export interface InvestmentPerformance {
  periodDays: number;
  from: string;
  to: string;
  months: InvestmentPerformanceMonth[];
  totals: {
    depositsUsd: Prisma.Decimal;
    withdrawalsUsd: Prisma.Decimal;
    yieldUsd: Prisma.Decimal;
    // Valeur du portefeuille investi à `now`.
    currentValueUsd: Prisma.Decimal;
    // Rendement net de la période rapporté au capital engagé (valeur d'ouverture + dépôts
    // de la période) — `null` si aucun capital n'a jamais été engagé (jamais un 0 %
    // fabriqué). Indicatif : pas un TRI/TWR, une simple lecture du rendement cumulé.
    returnPct: number | null;
  };
}

function monthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

// Fonction pure (aucun accès base) pour rester exhaustivement testable : reconstitue,
// depuis le journal des transactions d'investissement d'un client, la valeur de son
// portefeuille placé et son rendement mois par mois. Aucune donnée fabriquée — tout vient
// des transactions réellement journalisées (dépôts, retraits/règlements, accruals
// quotidiens), jamais d'une projection.
export function buildInvestmentPerformance(
  rows: PerformanceTransactionRow[],
  now: Date = new Date(),
): InvestmentPerformance {
  const nowYear = now.getUTCFullYear();
  const nowMonth = now.getUTCMonth();

  const monthStarts: number[] = [];
  for (let offset = PERFORMANCE_MONTHS - 1; offset >= 0; offset--) {
    monthStarts.push(Date.UTC(nowYear, nowMonth - offset, 1));
  }
  const windowStart = monthStarts[0];

  const zero = new Prisma.Decimal(0);
  const signedFlow = (row: PerformanceTransactionRow): Prisma.Decimal => {
    const amount = new Prisma.Decimal(row.amount);
    if (WITHDRAWAL_TYPES.has(row.type)) return amount.negated();
    // Dépôts (+) et accruals (± selon le marché du jour) s'ajoutent tels quels.
    return amount;
  };

  const relevant = rows
    .filter(
      (row) =>
        DEPOSIT_TYPES.has(row.type) ||
        WITHDRAWAL_TYPES.has(row.type) ||
        ACCRUAL_TYPES.has(row.type),
    )
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // Valeur d'ouverture : tout ce qui précède la fenêtre de 12 mois.
  let running = zero;
  for (const row of relevant) {
    if (row.createdAt.getTime() < windowStart) {
      running = running.plus(signedFlow(row));
    }
  }
  const openingValue = running;

  const months: InvestmentPerformanceMonth[] = [];
  let totalDeposits = zero;
  let totalWithdrawals = zero;
  let totalYield = zero;

  for (let i = 0; i < monthStarts.length; i++) {
    const start = monthStarts[i];
    const end = monthStarts[i + 1] ?? Date.UTC(nowYear, nowMonth + 1, 1);

    let deposits = zero;
    let withdrawals = zero;
    let yieldUsd = zero;
    for (const row of relevant) {
      const time = row.createdAt.getTime();
      if (time < start || time >= end) continue;
      const amount = new Prisma.Decimal(row.amount);
      if (DEPOSIT_TYPES.has(row.type)) deposits = deposits.plus(amount);
      else if (WITHDRAWAL_TYPES.has(row.type))
        withdrawals = withdrawals.plus(amount);
      else yieldUsd = yieldUsd.plus(amount);
    }

    running = running.plus(deposits).minus(withdrawals).plus(yieldUsd);
    totalDeposits = totalDeposits.plus(deposits);
    totalWithdrawals = totalWithdrawals.plus(withdrawals);
    totalYield = totalYield.plus(yieldUsd);

    const date = new Date(start);
    months.push({
      month: monthKey(date.getUTCFullYear(), date.getUTCMonth()),
      depositsUsd: deposits,
      withdrawalsUsd: withdrawals,
      yieldUsd,
      endValueUsd: running,
    });
  }

  const committed = openingValue.plus(totalDeposits);
  const returnPct = committed.greaterThan(0)
    ? totalYield.dividedBy(committed).times(100).toNumber()
    : null;

  return {
    periodDays: 365,
    from: new Date(windowStart).toISOString(),
    to: now.toISOString(),
    months,
    totals: {
      depositsUsd: totalDeposits,
      withdrawalsUsd: totalWithdrawals,
      yieldUsd: totalYield,
      currentValueUsd: running,
      returnPct,
    },
  };
}
