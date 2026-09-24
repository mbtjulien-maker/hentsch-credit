import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type {
  StatementData,
  StatementLocale,
  StatementOperationKind,
} from './investment-statement';

const A4_W = 595.28;
const A4_H = 841.89;
const MARGIN = 42;
const CONTENT_W = A4_W - MARGIN * 2;

const GREEN = rgb(0.055, 0.624, 0.431);
const GREEN_SOFT = rgb(0.91, 0.973, 0.945);
const RED = rgb(0.8, 0.19, 0.19);
const INK = rgb(0.09, 0.11, 0.16);
const MUTED = rgb(0.42, 0.46, 0.53);
const RULE = rgb(0.88, 0.9, 0.92);
const PANEL = rgb(0.965, 0.972, 0.98);

interface Labels {
  title: string;
  client: string;
  account: string;
  period: string;
  issued: string;
  currencyNote: string;
  summary: string;
  opening: string;
  deposits: string;
  withdrawals: string;
  yieldNet: string;
  closing: string;
  returnPct: string;
  monthly: string;
  yieldChart: string;
  month: string;
  placed: string;
  withdrawn: string;
  yieldCol: string;
  endValue: string;
  positions: string;
  product: string;
  opened: string;
  capital: string;
  yieldShort: string;
  value: string;
  status: string;
  active: string;
  closed: string;
  matured: string;
  due: string;
  noPositions: string;
  operations: string;
  date: string;
  operation: string;
  amount: string;
  noOperations: string;
  page: string;
  disclaimer: string[];
  ops: Record<StatementOperationKind, string>;
  yieldOp: (count: number) => string;
  basket: Record<string, string>;
  plan: Record<string, string>;
  fixedPrefix: string;
}

const LABELS: Record<StatementLocale, Labels> = {
  fr: {
    title: "Relevé d'opérations d'investissement",
    client: 'Client',
    account: 'Compte',
    period: 'Période',
    issued: 'Édité le',
    currencyNote: 'Montants en USD',
    summary: 'Synthèse de la période',
    opening: 'Valeur en début de période',
    deposits: 'Capital placé',
    withdrawals: 'Retraits et règlements',
    yieldNet: 'Rendement net',
    closing: 'Valeur du portefeuille',
    returnPct: 'Rendement du capital engagé',
    monthly: 'Évolution mois par mois',
    yieldChart: 'Rendement net mensuel',
    month: 'Mois',
    placed: 'Placé',
    withdrawn: 'Retiré',
    yieldCol: 'Rendement',
    endValue: 'Valeur fin de mois',
    positions: 'Répartition des placements',
    product: 'Produit',
    opened: 'Ouverture',
    capital: 'Capital',
    yieldShort: 'Rendement',
    value: 'Valeur',
    status: 'Statut',
    active: 'Actif',
    closed: 'Clôturé',
    matured: 'Échu',
    due: 'éch.',
    noPositions: 'Aucun placement sur la période.',
    operations: 'Détail des opérations',
    date: 'Date',
    operation: 'Opération',
    amount: 'Montant',
    noOperations: 'Aucune opération sur la période.',
    page: 'Page',
    disclaimer: [
      "Les performances passées ne préjugent pas des performances futures. Un placement n'est jamais garanti : le rendement peut être négatif et le capital investi peut diminuer.",
      "Ce relevé est établi à partir du journal des opérations de votre compte ; les rendements quotidiens sont regroupés par mois. Il ne constitue ni un conseil en investissement ni une attestation fiscale.",
    ],
    ops: {
      DEPOSIT: 'Dépôt vers le wallet investissement',
      CARD_TOPUP: 'Recharge par carte vers le wallet investissement',
      TRANSFER_IN: 'Virement vers le wallet investissement',
      TRANSFER_OUT: 'Virement depuis le wallet investissement',
      PLACEMENT: 'Placement sur un panier',
      PLACEMENT_FIXED: 'Placement sur un plan à échéance fixe',
      WITHDRAWAL: 'Retrait complet d’un panier',
      MATURITY: 'Règlement à échéance',
      YIELD_MONTH: 'Rendements',
    },
    yieldOp: (n) => `Rendements du mois (${n} crédits)`,
    basket: {
      RWA_STRATEGY: 'Stratégie RWA',
      STOCKS: "Panier d'actions",
      STOCKS_CONSERVATIVE: 'Panier Conservateur',
      STOCKS_BALANCED: 'Panier Équilibré',
      STOCKS_TECH_AI: 'Panier Tech & IA',
      STOCKS_MOMENTUM: 'Panier Momentum IA & Storage',
    },
    plan: {
      TREASURY_3M: 'Trésorerie Dynamic',
      SEMICONDUCTORS_6M: 'Puces & Mémoire IA',
      CORE_BALANCED_12M: 'Core Balanced',
      RWA_METALS_12M: 'Stratégie RWA & Métaux',
      AI_MEGACAPS_12M: 'Leaders IA & Cloud',
      ALPHA_MOMENTUM_12M: 'Alpha Momentum',
    },
    fixedPrefix: 'Plan',
  },
  en: {
    title: 'Investment account statement',
    client: 'Client',
    account: 'Account',
    period: 'Period',
    issued: 'Issued on',
    currencyNote: 'Amounts in USD',
    summary: 'Period summary',
    opening: 'Value at start of period',
    deposits: 'Capital invested',
    withdrawals: 'Withdrawals and payouts',
    yieldNet: 'Net return',
    closing: 'Portfolio value',
    returnPct: 'Return on committed capital',
    monthly: 'Month by month',
    yieldChart: 'Net monthly return',
    month: 'Month',
    placed: 'Invested',
    withdrawn: 'Withdrawn',
    yieldCol: 'Return',
    endValue: 'End-of-month value',
    positions: 'Breakdown of investments',
    product: 'Product',
    opened: 'Opened',
    capital: 'Capital',
    yieldShort: 'Return',
    value: 'Value',
    status: 'Status',
    active: 'Active',
    closed: 'Closed',
    matured: 'Matured',
    due: 'due',
    noPositions: 'No investment over the period.',
    operations: 'Operations detail',
    date: 'Date',
    operation: 'Operation',
    amount: 'Amount',
    noOperations: 'No operation over the period.',
    page: 'Page',
    disclaimer: [
      'Past performance is not a guide to future performance. An investment is never guaranteed: returns can be negative and the invested capital can decrease.',
      'This statement is drawn from your account operations journal; daily returns are grouped by month. It is neither investment advice nor a tax certificate.',
    ],
    ops: {
      DEPOSIT: 'Deposit to the investment wallet',
      CARD_TOPUP: 'Card top-up to the investment wallet',
      TRANSFER_IN: 'Transfer to the investment wallet',
      TRANSFER_OUT: 'Transfer from the investment wallet',
      PLACEMENT: 'Investment in a basket',
      PLACEMENT_FIXED: 'Investment in a fixed-term plan',
      WITHDRAWAL: 'Full withdrawal from a basket',
      MATURITY: 'Maturity payout',
      YIELD_MONTH: 'Returns',
    },
    yieldOp: (n) => `Monthly returns (${n} credits)`,
    basket: {
      RWA_STRATEGY: 'RWA strategy',
      STOCKS: 'Stock basket',
      STOCKS_CONSERVATIVE: 'Conservative basket',
      STOCKS_BALANCED: 'Balanced basket',
      STOCKS_TECH_AI: 'Tech & AI basket',
      STOCKS_MOMENTUM: 'AI & Storage Momentum basket',
    },
    plan: {
      TREASURY_3M: 'Dynamic Treasury',
      SEMICONDUCTORS_6M: 'Chips & AI Memory',
      CORE_BALANCED_12M: 'Core Balanced',
      RWA_METALS_12M: 'RWA & Metals Strategy',
      AI_MEGACAPS_12M: 'AI & Cloud Leaders',
      ALPHA_MOMENTUM_12M: 'Alpha Momentum',
    },
    fixedPrefix: 'Plan',
  },
};

export interface StatementPdfInput {
  data: StatementData;
  locale: StatementLocale;
  clientName: string;
  email: string;
  accountRef: string;
  issuedAt: Date;
}

// Rendu du relevé (pdf-lib, polices Helvetica standard — jeu WinAnsi : tout caractère hors
// jeu est remplacé plutôt que de faire échouer la génération).
export async function renderStatementPdf(input: StatementPdfInput): Promise<Uint8Array> {
  const { data, locale } = input;
  const L = LABELS[locale];
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const supported = new Set(font.getCharacterSet());

  const safe = (text: string): string =>
    Array.from(text.replace(/ /g, ' ').replace(/−/g, '-'))
      .map((ch) => (supported.has(ch.codePointAt(0)!) ? ch : '?'))
      .join('');

  const numberFmt = new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const money = (v: { toNumber(): number }, signed = false): string => {
    const n = v.toNumber();
    const body = numberFmt.format(Math.abs(n));
    const sign = n < 0 ? '-' : signed && n > 0 ? '+' : '';
    return safe(`${sign}${body}`);
  };
  const pct = (n: number | null): string =>
    n === null ? '—' : safe(`${n >= 0 ? '+' : '-'}${Math.abs(n).toFixed(2).replace('.', locale === 'fr' ? ',' : '.')} %`);
  const dateFmt = new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const monthFmt = new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const fmtDate = (d: Date) => safe(dateFmt.format(d));
  // Étiquette d'axe : mois seul quand il y en a beaucoup (l'année figure dans le tableau).
  const monthOnlyFmt = new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', { month: 'short', timeZone: 'UTC' });
  const shortMonth = (key: string) =>
    (data.months.length > 6 ? monthOnlyFmt : monthFmt).format(new Date(`${key}-01T00:00:00Z`));

  const pages: PDFPage[] = [];
  let page!: PDFPage;
  let y = 0;

  const newPage = () => {
    page = doc.addPage([A4_W, A4_H]);
    pages.push(page);
    y = A4_H - MARGIN;
  };
  const ensure = (needed: number) => {
    if (y - needed < MARGIN + 46) newPage();
  };

  const text = (
    s: string,
    x: number,
    yy: number,
    opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; align?: 'left' | 'right' | 'center'; maxWidth?: number } = {},
  ) => {
    const f = opts.font ?? font;
    const size = opts.size ?? 9;
    let out = safe(s);
    if (opts.maxWidth) {
      while (out.length > 1 && f.widthOfTextAtSize(out, size) > opts.maxWidth) out = out.slice(0, -2) + '…';
      out = safe(out);
    }
    const w = f.widthOfTextAtSize(out, size);
    const px = opts.align === 'right' ? x - w : opts.align === 'center' ? x - w / 2 : x;
    page.drawText(out, { x: px, y: yy, size, font: f, color: opts.color ?? INK });
  };

  const heading = (label: string) => {
    ensure(40);
    y -= 14;
    text(label, MARGIN, y, { size: 12, font: bold });
    y -= 6;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: A4_W - MARGIN, y }, thickness: 0.7, color: GREEN });
    y -= 16;
  };

  // ---- Page 1 : bandeau ------------------------------------------------------------
  newPage();
  page.drawRectangle({ x: 0, y: A4_H - 92, width: A4_W, height: 92, color: GREEN });
  text('Hentsch Vault', MARGIN, A4_H - 44, { size: 22, font: bold, color: rgb(1, 1, 1) });
  text('H. Hentsch Asset Management SA · Nyon, Suisse', MARGIN, A4_H - 62, { size: 8.5, color: rgb(0.85, 0.96, 0.92) });
  text(L.title, A4_W - MARGIN, A4_H - 44, { size: 12.5, font: bold, color: rgb(1, 1, 1), align: 'right' });
  text(L.currencyNote, A4_W - MARGIN, A4_H - 62, { size: 8.5, color: rgb(0.85, 0.96, 0.92), align: 'right' });
  y = A4_H - 92 - 22;

  // Bloc identité (deux colonnes)
  const info: [string, string][] = [
    [L.client, input.clientName],
    [L.account, `${input.accountRef} · ${input.email}`],
    [L.period, `${fmtDate(data.from)} – ${fmtDate(data.to)}`],
    [L.issued, fmtDate(input.issuedAt)],
  ];
  const colW = CONTENT_W / 2;
  info.forEach(([k, v], i) => {
    const cx = MARGIN + (i % 2) * colW;
    const cy = y - Math.floor(i / 2) * 30;
    text(k.toUpperCase(), cx, cy, { size: 7, font: bold, color: MUTED });
    text(v, cx, cy - 12, { size: 10.5, font: bold, maxWidth: colW - 14 });
  });
  y -= 60;

  // ---- Synthèse : quatre tuiles ----------------------------------------------------
  heading(L.summary);
  const tiles: { label: string; value: string; color?: ReturnType<typeof rgb> }[] = [
    { label: L.closing, value: money(data.summary.closingValue) },
    {
      label: L.yieldNet,
      value: money(data.summary.yieldNet, true),
      color: data.summary.yieldNet.lt(0) ? RED : GREEN,
    },
    { label: L.deposits, value: money(data.summary.deposits) },
    {
      label: L.returnPct,
      value: pct(data.summary.returnPct),
      color: (data.summary.returnPct ?? 0) < 0 ? RED : GREEN,
    },
  ];
  const tileGap = 8;
  const tileW = (CONTENT_W - tileGap * 3) / 4;
  ensure(64);
  tiles.forEach((tile, i) => {
    const tx = MARGIN + i * (tileW + tileGap);
    page.drawRectangle({ x: tx, y: y - 50, width: tileW, height: 50, color: i === 0 ? GREEN_SOFT : PANEL });
    text(tile.label, tx + 9, y - 14, { size: 7.5, color: MUTED, maxWidth: tileW - 16 });
    text(tile.value, tx + 9, y - 37, { size: 15, font: bold, color: tile.color ?? INK, maxWidth: tileW - 14 });
  });
  y -= 62;
  text(`${L.opening} : ${money(data.summary.openingValue)}   ·   ${L.withdrawals} : ${money(data.summary.withdrawals)}`, MARGIN, y, {
    size: 8.5,
    color: MUTED,
  });
  y -= 10;

  // ---- Graphique : rendement net mensuel -------------------------------------------
  heading(L.monthly);
  const chartH = 88;
  ensure(chartH + 30);
  const yields = data.months.map((m) => m.yieldUsd.toNumber());
  const maxAbs = Math.max(1, ...yields.map((v) => Math.abs(v)));
  const hasNeg = yields.some((v) => v < 0);
  const top = y;
  const baseline = hasNeg ? top - chartH * 0.62 : top - chartH;
  const scale = (hasNeg ? chartH * 0.6 : chartH - 14) / maxAbs;
  text(L.yieldChart, MARGIN, top - 2, { size: 8, color: MUTED });
  page.drawLine({ start: { x: MARGIN, y: baseline }, end: { x: A4_W - MARGIN, y: baseline }, thickness: 0.6, color: RULE });
  const slot = CONTENT_W / data.months.length;
  data.months.forEach((m, i) => {
    const v = yields[i];
    const h = Math.max(Math.abs(v) * scale, v === 0 ? 0 : 1);
    const bx = MARGIN + i * slot + slot * 0.2;
    const bw = slot * 0.6;
    if (v !== 0) {
      page.drawRectangle({ x: bx, y: v >= 0 ? baseline : baseline - h, width: bw, height: h, color: v >= 0 ? GREEN : RED });
      text(money({ toNumber: () => v }, true), bx + bw / 2, v >= 0 ? baseline + h + 3 : baseline - h - 9, {
        size: 6.5,
        color: MUTED,
        align: 'center',
      });
    }
    text(safe(shortMonth(m.month)), bx + bw / 2, top - chartH - 11, {
      size: 7,
      color: MUTED,
      align: 'center',
    });
  });
  y = top - chartH - 34;

  // ---- Tableau mensuel -------------------------------------------------------------
  const tableRow = (
    cells: { t: string; x: number; align?: 'left' | 'right'; bold?: boolean; color?: ReturnType<typeof rgb>; max?: number }[],
    opts: { header?: boolean; zebra?: boolean } = {},
  ) => {
    ensure(18);
    if (opts.header) {
      page.drawRectangle({ x: MARGIN, y: y - 5, width: CONTENT_W, height: 16, color: PANEL });
    } else if (opts.zebra) {
      page.drawLine({ start: { x: MARGIN, y: y - 5 }, end: { x: A4_W - MARGIN, y: y - 5 }, thickness: 0.3, color: RULE });
    }
    for (const c of cells) {
      text(c.t, c.x, y, {
        size: opts.header ? 7.5 : 8.5,
        font: opts.header || c.bold ? bold : font,
        color: opts.header ? MUTED : c.color ?? INK,
        align: c.align,
        maxWidth: c.max,
      });
    }
    y -= 17;
  };
  const R = A4_W - MARGIN - 6;
  tableRow(
    [
      { t: L.month, x: MARGIN + 6 },
      { t: L.placed, x: MARGIN + 190, align: 'right' },
      { t: L.withdrawn, x: MARGIN + 290, align: 'right' },
      { t: L.yieldCol, x: MARGIN + 390, align: 'right' },
      { t: L.endValue, x: R, align: 'right' },
    ],
    { header: true },
  );
  for (const m of data.months) {
    tableRow(
      [
        { t: safe(monthFmt.format(new Date(`${m.month}-01T00:00:00Z`))), x: MARGIN + 6 },
        { t: money(m.depositsUsd), x: MARGIN + 190, align: 'right' },
        { t: money(m.withdrawalsUsd), x: MARGIN + 290, align: 'right' },
        { t: money(m.yieldUsd, true), x: MARGIN + 390, align: 'right', color: m.yieldUsd.lt(0) ? RED : m.yieldUsd.gt(0) ? GREEN : INK },
        { t: money(m.endValueUsd), x: R, align: 'right', bold: true },
      ],
      { zebra: true },
    );
  }

  // ---- Positions -------------------------------------------------------------------
  heading(L.positions);
  if (data.positions.length === 0) {
    text(L.noPositions, MARGIN, y - 4, { size: 9, color: MUTED });
    y -= 18;
  } else {
    tableRow(
      [
        { t: L.product, x: MARGIN + 6 },
        { t: L.opened, x: MARGIN + 160 },
        { t: L.capital, x: MARGIN + 270, align: 'right' },
        { t: L.yieldShort, x: MARGIN + 340, align: 'right' },
        { t: L.value, x: MARGIN + 412, align: 'right' },
        { t: L.status, x: R, align: 'right' },
      ],
      { header: true },
    );
    const sorted = [...data.positions].sort((a, b) => b.principal.plus(b.accruedYield).comparedTo(a.principal.plus(a.accruedYield)));
    for (const p of sorted) {
      const name = p.kind === 'BASKET' ? L.basket[p.key] ?? p.key : `${L.fixedPrefix} ${L.plan[p.key] ?? p.key}`;
      const statusLabel = p.status === 'ACTIVE' ? L.active : p.status === 'MATURED' ? L.matured : L.closed;
      const value = p.principal.plus(p.accruedYield);
      tableRow(
        [
          { t: name, x: MARGIN + 6, max: 148 },
          { t: fmtDate(p.openedAt), x: MARGIN + 160 },
          { t: money(p.principal), x: MARGIN + 270, align: 'right' },
          { t: money(p.accruedYield, true), x: MARGIN + 340, align: 'right', color: p.accruedYield.lt(0) ? RED : GREEN },
          { t: money(value), x: MARGIN + 412, align: 'right', bold: true },
          { t: p.maturityDate && p.status === 'ACTIVE' ? `${statusLabel} · ${L.due} ${fmtDate(p.maturityDate)}` : statusLabel, x: R, align: 'right', color: MUTED, max: 108 },
        ],
        { zebra: true },
      );
    }
  }

  // ---- Opérations ------------------------------------------------------------------
  heading(L.operations);
  if (data.operations.length === 0) {
    text(L.noOperations, MARGIN, y - 4, { size: 9, color: MUTED });
    y -= 18;
  } else {
    tableRow(
      [
        { t: L.date, x: MARGIN + 6 },
        { t: L.operation, x: MARGIN + 80 },
        { t: L.amount, x: R, align: 'right' },
      ],
      { header: true },
    );
    for (const op of data.operations) {
      const label =
        op.kind === 'YIELD_MONTH'
          ? L.yieldOp(op.count ?? 0)
          : op.kind === 'DEPOSIT' && op.currency
            ? `${L.ops.DEPOSIT} (${op.currency})`
            : L.ops[op.kind];
      tableRow(
        [
          { t: fmtDate(op.at), x: MARGIN + 6 },
          { t: label, x: MARGIN + 80, max: 330 },
          { t: money(op.amount, true), x: R, align: 'right', bold: true, color: op.amount.lt(0) ? INK : GREEN },
        ],
        { zebra: true },
      );
    }
  }

  // ---- Mentions + pieds de page ---------------------------------------------------
  ensure(70);
  y -= 12;
  for (const line of L.disclaimer) {
    const words = line.split(' ');
    let cur = '';
    const lines: string[] = [];
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (font.widthOfTextAtSize(safe(next), 7.5) > CONTENT_W) {
        lines.push(cur);
        cur = w;
      } else cur = next;
    }
    if (cur) lines.push(cur);
    for (const l of lines) {
      ensure(11);
      text(l, MARGIN, y, { size: 7.5, color: MUTED });
      y -= 10;
    }
    y -= 3;
  }

  pages.forEach((pg, i) => {
    page = pg;
    page.drawLine({ start: { x: MARGIN, y: MARGIN + 18 }, end: { x: A4_W - MARGIN, y: MARGIN + 18 }, thickness: 0.4, color: RULE });
    text(`Hentsch Vault · ${L.title}`, MARGIN, MARGIN + 6, { size: 7, color: MUTED });
    text(`${L.page} ${i + 1}/${pages.length}`, A4_W - MARGIN, MARGIN + 6, { size: 7, color: MUTED, align: 'right' });
  });

  return doc.save();
}
