import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';
import {
  statementFingerprint,
  type StatementData,
  type StatementLocale,
  type StatementOperationKind,
} from './investment-statement';
import { STATEMENT_LOGO_JPG_BASE64 } from './statement-logo';

const A4_W = 595.28;
const A4_H = 841.89;
const MARGIN = 44;
const CONTENT_W = A4_W - MARGIN * 2;
const FOOTER_H = 58; // réservé au pied de page
const HEADER_H_CONT = 46; // en-tête réduit des pages suivantes

const INK = rgb(0.1, 0.12, 0.16);
const MUTED = rgb(0.4, 0.44, 0.5);
const RULE = rgb(0.82, 0.84, 0.87);
const RULE_DARK = rgb(0.25, 0.28, 0.33);
const PANEL = rgb(0.955, 0.962, 0.972);
const GREEN = rgb(0.055, 0.5, 0.36);
const RED = rgb(0.7, 0.16, 0.16);

interface Labels {
  entityLines: string[];
  legalFooter: string[];
  title: string;
  subtitle: (from: string, to: string) => string;
  refBox: { statementNo: string; period: string; issued: string; account: string; currency: string; page: string };
  currencyValue: Record<'USD' | 'EUR', string>;
  fxNote: (rate: string, date: string) => string;
  clientBlock: string;
  intro: (from: string, to: string) => string;
  s1: string;
  s1a: string;
  s1b: string;
  valueOpening: (d: string) => string;
  valueDeposits: string;
  valueWithdrawals: string;
  valueYield: string;
  valueClosing: (d: string) => string;
  walletOpening: (d: string) => string;
  walletContrib: string;
  walletProceeds: string;
  walletPlacements: string;
  walletTransfers: string;
  walletClosing: (d: string) => string;
  totalAssets: (d: string) => string;
  returnPct: string;
  returnMethod: string;
  s2: string;
  colMonth: string;
  colPlaced: string;
  colWithdrawn: string;
  colNet: string;
  colEndValue: string;
  s3: string;
  colRef: string;
  colProduct: string;
  colOpened: string;
  colCapital: string;
  colYield: string;
  colValue: string;
  colStatus: string;
  active: string;
  closed: string;
  matured: string;
  due: string;
  noPositions: string;
  s4: string;
  colDate: string;
  colLabel: string;
  colDebit: string;
  colCredit: string;
  colBalance: string;
  openingBalance: string;
  closingBalance: string;
  noOperations: string;
  s5: string;
  colPeriod: string;
  colNature: string;
  colCount: string;
  colAmount: string;
  yieldNature: string;
  yieldPeriod: (a: string, b: string) => string;
  noYields: string;
  s6: string;
  notes: { title: string; body: string }[];
  s7: string;
  docRef: string;
  fingerprint: string;
  fingerprintNote: string;
  signatureTitle: string;
  signatureHint: string;
  ops: Record<StatementOperationKind, string>;
  txRef: string;
  basket: Record<string, string>;
  plan: Record<string, string>;
  planPrefix: string;
  page: string;
  of: string;
  continued: string;
}

const LABELS: Record<StatementLocale, Labels> = {
  fr: {
    entityLines: [
      'H. Hentsch Asset Management SA',
      'Rue de Rive 23 · 1260 Nyon · Suisse',
      'Tél. +41 22 809 57 00 · office@hhentsch.com',
    ],
    legalFooter: [
      "H. Hentsch Asset Management SA · Gestionnaire de fortune indépendant · Rue de Rive 23, 1260 Nyon (Suisse) · IDE CHE-115.630.564",
      "Société affiliée à l'organisme de surveillance SO-FIT, agréé par l'Autorité fédérale de surveillance des marchés financiers (FINMA).",
    ],
    title: "RELEVÉ D'OPÉRATIONS ET DE PLACEMENTS",
    subtitle: (a, b) => `Wallet investissement · du ${a} au ${b}`,
    refBox: {
      statementNo: 'Relevé n°',
      period: 'Période',
      issued: 'Établi le',
      account: 'Compte',
      currency: 'Monnaie du relevé',
      page: 'Page',
    },
    currencyValue: { USD: 'Dollar américain (USD)', EUR: 'Euro (EUR)' },
    fxNote: (rate, date) =>
      `Montants exprimés en euros : le registre est tenu en dollars américains (USD) et converti au taux de 1 USD = ${rate} EUR du ${date}. De légers écarts d'arrondi (0,01) peuvent apparaître entre deux lignes.`,
    clientBlock: 'Titulaire du compte',
    intro: (a, b) =>
      `Ce relevé retrace, du ${a} au ${b}, les mouvements de votre wallet investissement (dépôts, placements, retraits et règlements), les rendements crédités sur vos placements et leur valeur à la date d'arrêté. Chaque opération est identifiée par une référence unique permettant son rapprochement avec votre espace client.`,
    s1: '1. Situation à la date d’arrêté',
    s1a: 'Portefeuille de placements',
    s1b: 'Wallet investissement (liquidités disponibles)',
    valueOpening: (d) => `Valeur du portefeuille au ${d}`,
    valueDeposits: '+ Capital placé pendant la période',
    valueWithdrawals: '− Retraits et règlements de la période',
    valueYield: '± Résultat net des placements',
    valueClosing: (d) => `Valeur du portefeuille au ${d}`,
    walletOpening: (d) => `Solde du wallet au ${d}`,
    walletContrib: '+ Apports (dépôts, recharges par carte, virements reçus)',
    walletProceeds: '+ Retraits de paniers et règlements à échéance',
    walletPlacements: '− Capital placé',
    walletTransfers: '− Virements vers le solde principal',
    walletClosing: (d) => `Solde du wallet au ${d}`,
    totalAssets: (d) => `Total des avoirs d'investissement au ${d}`,
    returnPct: 'Rendement du capital engagé sur la période',
    returnMethod: "Résultat net ÷ (valeur d'ouverture + capital placé). Indicatif : ce n'est pas un rendement annualisé.",
    s2: '2. Évolution mois par mois',
    colMonth: 'Mois',
    colPlaced: 'Capital placé',
    colWithdrawn: 'Retraits',
    colNet: 'Résultat net',
    colEndValue: 'Valeur fin de mois',
    s3: '3. Détail des placements',
    colRef: 'Réf.',
    colProduct: 'Produit',
    colOpened: 'Ouverture',
    colCapital: 'Capital',
    colYield: 'Rendement',
    colValue: 'Valeur',
    colStatus: 'Statut',
    active: 'Actif',
    closed: 'Clôturé',
    matured: 'Échu',
    due: 'éch.',
    noPositions: 'Aucun placement sur la période.',
    s4: '4. Mouvements du wallet investissement',
    colDate: 'Date',
    colLabel: 'Opération',
    colDebit: 'Débit',
    colCredit: 'Crédit',
    colBalance: 'Solde',
    openingBalance: "Solde d'ouverture",
    closingBalance: 'Solde de clôture',
    noOperations: 'Aucun mouvement sur la période.',
    s5: '5. Rendements crédités sur les placements',
    colPeriod: 'Période',
    colNature: 'Nature',
    colCount: 'Crédits',
    colAmount: 'Montant',
    yieldNature: 'Rendement des placements',
    yieldPeriod: (a, b) => `${a} – ${b}`,
    noYields: 'Aucun rendement crédité sur la période.',
    s6: '6. Notes explicatives',
    notes: [
      {
        title: 'Valeur du portefeuille',
        body: "Capital placé augmenté du rendement accumulé, tous produits confondus (paniers et plans à échéance fixe), à la date d'arrêté. Un produit clôturé ou échu n'y figure plus : son produit a été reversé sur le wallet.",
      },
      {
        title: 'Rendements',
        body: "Les rendements sont crédités chaque jour à 03h15 (UTC), pour chaque placement actif, et capitalisés. Ils ne sont jamais garantis : un jour de marché défavorable, le rendement crédité est négatif et le capital placé peut diminuer. Pour lisibilité, ce relevé les regroupe par mois (section 5).",
      },
      {
        title: 'Paniers et plans à échéance fixe',
        body: "Un panier peut être retiré à tout moment, en totalité. Un plan à échéance fixe est bloqué jusqu'à son échéance : aucun retrait anticipé n'est possible, et le capital augmenté du rendement est reversé automatiquement sur le wallet à l'échéance.",
      },
      {
        title: 'Dates et références',
        body: "La date d'une opération est celle de son enregistrement ; la date de valeur est identique. Chaque référence (OP-…, RDT-…) permet de retrouver l'opération dans l'historique de votre espace client.",
      },
    ],
    s7: '7. Édition du document',
    docRef: 'Référence du document',
    fingerprint: "Empreinte d'intégrité (SHA-256)",
    fingerprintNote:
      "Calculée sur les données de ce relevé : toute modification d'un montant ou d'une référence en change la valeur.",
    signatureTitle: 'Signature électronique',
    signatureHint: 'Emplacement réservé',
    ops: {
      DEPOSIT: 'Dépôt sur le wallet',
      CARD_TOPUP: 'Recharge par carte',
      TRANSFER_IN: 'Virement reçu du solde principal',
      TRANSFER_OUT: 'Virement vers le solde principal',
      PLACEMENT: 'Placement sur un panier',
      PLACEMENT_FIXED: 'Souscription plan à échéance fixe',
      WITHDRAWAL: "Retrait complet d'un panier",
      MATURITY: 'Règlement à échéance',
    },
    txRef: 'Réf. tx',
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
    planPrefix: 'Plan',
    page: 'Page',
    of: 'sur',
    continued: 'suite',
  },
  en: {
    entityLines: [
      'H. Hentsch Asset Management SA',
      'Rue de Rive 23 · 1260 Nyon · Switzerland',
      'Tel. +41 22 809 57 00 · office@hhentsch.com',
    ],
    legalFooter: [
      'H. Hentsch Asset Management SA · Independent asset manager · Rue de Rive 23, 1260 Nyon (Switzerland) · UID CHE-115.630.564',
      'Affiliated with the supervisory organisation SO-FIT, licensed by the Swiss Financial Market Supervisory Authority (FINMA).',
    ],
    title: 'STATEMENT OF OPERATIONS AND INVESTMENTS',
    subtitle: (a, b) => `Investment wallet · from ${a} to ${b}`,
    refBox: {
      statementNo: 'Statement no.',
      period: 'Period',
      issued: 'Issued on',
      account: 'Account',
      currency: 'Statement currency',
      page: 'Page',
    },
    currencyValue: { USD: 'US dollar (USD)', EUR: 'Euro (EUR)' },
    fxNote: (rate, date) =>
      `Amounts shown in euros: the ledger is kept in US dollars (USD) and converted at 1 USD = ${rate} EUR on ${date}. Minor rounding differences (0.01) may appear between two lines.`,
    clientBlock: 'Account holder',
    intro: (a, b) =>
      `This statement covers, from ${a} to ${b}, the movements of your investment wallet (deposits, investments, withdrawals and payouts), the returns credited to your investments and their value at the closing date. Each operation carries a unique reference so it can be matched with your client area.`,
    s1: '1. Position at the closing date',
    s1a: 'Investment portfolio',
    s1b: 'Investment wallet (available cash)',
    valueOpening: (d) => `Portfolio value on ${d}`,
    valueDeposits: '+ Capital invested during the period',
    valueWithdrawals: '− Withdrawals and payouts of the period',
    valueYield: '± Net result of the investments',
    valueClosing: (d) => `Portfolio value on ${d}`,
    walletOpening: (d) => `Wallet balance on ${d}`,
    walletContrib: '+ Contributions (deposits, card top-ups, transfers received)',
    walletProceeds: '+ Basket withdrawals and maturity payouts',
    walletPlacements: '− Capital invested',
    walletTransfers: '− Transfers to the main balance',
    walletClosing: (d) => `Wallet balance on ${d}`,
    totalAssets: (d) => `Total investment assets on ${d}`,
    returnPct: 'Return on committed capital over the period',
    returnMethod: 'Net result ÷ (opening value + capital invested). Indicative: not an annualised return.',
    s2: '2. Month by month',
    colMonth: 'Month',
    colPlaced: 'Capital invested',
    colWithdrawn: 'Withdrawals',
    colNet: 'Net result',
    colEndValue: 'End-of-month value',
    s3: '3. Investment detail',
    colRef: 'Ref.',
    colProduct: 'Product',
    colOpened: 'Opened',
    colCapital: 'Capital',
    colYield: 'Return',
    colValue: 'Value',
    colStatus: 'Status',
    active: 'Active',
    closed: 'Closed',
    matured: 'Matured',
    due: 'due',
    noPositions: 'No investment over the period.',
    s4: '4. Investment wallet movements',
    colDate: 'Date',
    colLabel: 'Operation',
    colDebit: 'Debit',
    colCredit: 'Credit',
    colBalance: 'Balance',
    openingBalance: 'Opening balance',
    closingBalance: 'Closing balance',
    noOperations: 'No movement over the period.',
    s5: '5. Returns credited to the investments',
    colPeriod: 'Period',
    colNature: 'Nature',
    colCount: 'Credits',
    colAmount: 'Amount',
    yieldNature: 'Investment returns',
    yieldPeriod: (a, b) => `${a} – ${b}`,
    noYields: 'No return credited over the period.',
    s6: '6. Explanatory notes',
    notes: [
      {
        title: 'Portfolio value',
        body: 'Invested capital plus accumulated return, across all products (baskets and fixed-term plans), at the closing date. A closed or matured product no longer appears: its proceeds were paid back to the wallet.',
      },
      {
        title: 'Returns',
        body: 'Returns are credited every day at 03:15 (UTC) for each active investment and compounded. They are never guaranteed: on an unfavourable market day the credited return is negative and the invested capital can decrease. For readability, this statement groups them by month (section 5).',
      },
      {
        title: 'Baskets and fixed-term plans',
        body: 'A basket can be withdrawn at any time, in full. A fixed-term plan is locked until maturity: no early withdrawal is possible, and the capital plus return is paid back automatically to the wallet at maturity.',
      },
      {
        title: 'Dates and references',
        body: 'The date of an operation is its recording date; the value date is identical. Each reference (OP-…, RDT-…) lets you find the operation in your client area history.',
      },
    ],
    s7: '7. Document issuance',
    docRef: 'Document reference',
    fingerprint: 'Integrity fingerprint (SHA-256)',
    fingerprintNote:
      'Computed on the data of this statement: changing any amount or reference changes its value.',
    signatureTitle: 'Electronic signature',
    signatureHint: 'Reserved area',
    ops: {
      DEPOSIT: 'Deposit to the wallet',
      CARD_TOPUP: 'Card top-up',
      TRANSFER_IN: 'Transfer received from the main balance',
      TRANSFER_OUT: 'Transfer to the main balance',
      PLACEMENT: 'Investment in a basket',
      PLACEMENT_FIXED: 'Subscription to a fixed-term plan',
      WITHDRAWAL: 'Full withdrawal from a basket',
      MATURITY: 'Maturity payout',
    },
    txRef: 'Tx ref.',
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
    planPrefix: 'Plan',
    page: 'Page',
    of: 'of',
    continued: 'continued',
  },
};

export interface StatementPdfInput {
  data: StatementData;
  locale: StatementLocale;
  clientName: string;
  clientAddressLines: string[];
  // Monnaie d'affichage choisie par le client ; le registre reste en USD, converti avec
  // `eurPerUsd` (nombre d'euros pour 1 dollar) quand elle vaut EUR.
  currency: 'USD' | 'EUR';
  eurPerUsd: number;
  email: string;
  accountRef: string;
  issuedAt: Date;
}

type Color = ReturnType<typeof rgb>;
interface Cell {
  t: string;
  bold?: boolean;
  color?: Color;
}
interface Col {
  label: string;
  w: number;
  align?: 'left' | 'right';
}

// Rendu du relevé (pdf-lib, polices Helvetica standard — jeu WinAnsi : tout caractère hors
// jeu est remplacé plutôt que de faire échouer la génération). Mise en page « relevé de
// compte » : papier à en-tête, bloc de références, sections numérotées, tableaux à soldes
// courants, notes explicatives, bloc d'édition (référence + empreinte + emplacement de
// signature).
export async function renderStatementPdf(input: StatementPdfInput): Promise<Uint8Array> {
  const { data, locale } = input;
  const L = LABELS[locale];
  const doc = await PDFDocument.create();
  doc.setTitle(L.title);
  doc.setAuthor('H. Hentsch Asset Management SA');
  doc.setCreator('Hentsch Vault');
  doc.setProducer('Hentsch Vault');
  doc.setCreationDate(input.issuedAt);

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);
  const logo: PDFImage = await doc.embedJpg(Buffer.from(STATEMENT_LOGO_JPG_BASE64, 'base64'));
  const supported = new Set(font.getCharacterSet());

  const safe = (text: string): string =>
    Array.from(text.replace(/ /g, ' ').replace(/−/g, '-'))
      .map((ch) => (supported.has(ch.codePointAt(0)!) ? ch : '?'))
      .join('');

  const localeTag = locale === 'fr' ? 'fr-FR' : 'en-US';
  const numberFmt = new Intl.NumberFormat(localeTag, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const factor = input.currency === 'EUR' ? input.eurPerUsd : 1;
  const money = (v: { toNumber(): number }, signed = false): string => {
    const n = Math.round(v.toNumber() * factor * 100) / 100;
    const body = numberFmt.format(Math.abs(n));
    return safe(`${n < 0 ? '-' : signed && n > 0 ? '+' : ''}${body}`);
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
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const fmtDate = (d: Date) => safe(dateFmt.format(d));
  const fmtMonth = (key: string) => {
    const s = monthFmt.format(new Date(`${key}-01T00:00:00Z`));
    return safe(s.charAt(0).toUpperCase() + s.slice(1));
  };

  const pages: PDFPage[] = [];
  let page!: PDFPage;
  let y = 0;

  const text = (
    s: string,
    x: number,
    yy: number,
    opts: { size?: number; font?: PDFFont; color?: Color; align?: 'left' | 'right' | 'center'; maxWidth?: number } = {},
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

  const wrap = (s: string, width: number, size: number, f: PDFFont = font): string[] => {
    const lines: string[] = [];
    let cur = '';
    for (const word of safe(s).split(' ')) {
      const next = cur ? `${cur} ${word}` : word;
      if (f.widthOfTextAtSize(next, size) > width && cur) {
        lines.push(cur);
        cur = word;
      } else cur = next;
    }
    if (cur) lines.push(cur);
    return lines;
  };

  const drawLogo = (x: number, top: number, width: number) => {
    const h = (width * logo.height) / logo.width;
    page.drawImage(logo, { x, y: top - h, width, height: h });
    return h;
  };

  const startContinuationPage = () => {
    page = doc.addPage([A4_W, A4_H]);
    pages.push(page);
    drawLogo(MARGIN, A4_H - 30, 84);
    text(`${L.title} · ${input.accountRef}`, A4_W - MARGIN, A4_H - 44, { size: 7.5, color: MUTED, align: 'right' });
    page.drawLine({
      start: { x: MARGIN, y: A4_H - 30 - HEADER_H_CONT + 8 },
      end: { x: A4_W - MARGIN, y: A4_H - 30 - HEADER_H_CONT + 8 },
      thickness: 0.5,
      color: RULE,
    });
    y = A4_H - 30 - HEADER_H_CONT - 6;
  };

  const ensure = (needed: number) => {
    if (y - needed < MARGIN + FOOTER_H) startContinuationPage();
  };

  const heading = (label: string) => {
    ensure(74);
    y -= 12;
    text(label, MARGIN, y, { size: 11, font: bold });
    y -= 5;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: A4_W - MARGIN, y }, thickness: 0.8, color: RULE_DARK });
    y -= 14;
  };
  const subheading = (label: string) => {
    ensure(30);
    text(label, MARGIN, y, { size: 8.5, font: bold, color: MUTED });
    y -= 12;
  };

  // Tableau à colonnes : en-tête redessiné après un saut de page.
  const drawTable = (cols: Col[], rows: Cell[][], opts: { firstBold?: boolean } = {}) => {
    const xs: number[] = [];
    let acc = MARGIN;
    for (const c of cols) {
      xs.push(acc);
      acc += c.w;
    }
    const cellPos = (i: number) =>
      cols[i].align === 'right' ? { x: xs[i] + cols[i].w - 4, align: 'right' as const } : { x: xs[i] + 4, align: 'left' as const };
    const header = () => {
      page.drawRectangle({ x: MARGIN, y: y - 5, width: CONTENT_W, height: 15, color: PANEL });
      cols.forEach((c, i) => {
        const pos = cellPos(i);
        text(c.label, pos.x, y, { size: 7.5, font: bold, color: MUTED, align: pos.align, maxWidth: c.w - 8 });
      });
      y -= 16;
    };
    ensure(40);
    header();
    rows.forEach((row) => {
      if (y - 16 < MARGIN + FOOTER_H) {
        startContinuationPage();
        header();
      }
      row.forEach((cell, i) => {
        const pos = cellPos(i);
        text(cell.t, pos.x, y, {
          size: 8.2,
          font: cell.bold || (opts.firstBold && i === 0) ? bold : font,
          color: cell.color ?? INK,
          align: pos.align,
          maxWidth: cols[i].w - 8,
        });
      });
      page.drawLine({ start: { x: MARGIN, y: y - 5 }, end: { x: A4_W - MARGIN, y: y - 5 }, thickness: 0.3, color: RULE });
      y -= 15;
    });
    y -= 4;
  };

  // Tableau de rapprochement (libellé / montant), avec une ligne de total soulignée.
  const drawReconciliation = (lines: { label: string; value: string; total?: boolean; color?: Color }[]) => {
    for (const line of lines) {
      ensure(18);
      if (line.total) {
        page.drawLine({ start: { x: MARGIN + 240, y: y + 11 }, end: { x: A4_W - MARGIN, y: y + 11 }, thickness: 0.7, color: RULE_DARK });
      }
      text(line.label, MARGIN + 4, y, { size: 8.6, font: line.total ? bold : font });
      text(line.value, A4_W - MARGIN - 4, y, { size: 8.6, font: line.total ? bold : font, color: line.color, align: 'right' });
      y -= 15;
    }
    y -= 4;
  };

  // ---- Page 1 : papier à en-tête ---------------------------------------------------
  page = doc.addPage([A4_W, A4_H]);
  pages.push(page);
  const logoH = drawLogo(MARGIN, A4_H - 36, 158);
  L.entityLines.forEach((line, i) => {
    text(line, A4_W - MARGIN, A4_H - 42 - i * 11, { size: 7.8, color: i === 0 ? INK : MUTED, font: i === 0 ? bold : font, align: 'right' });
  });
  const headBottom = A4_H - 36 - logoH - 12;
  page.drawLine({ start: { x: MARGIN, y: headBottom }, end: { x: A4_W - MARGIN, y: headBottom }, thickness: 1, color: RULE_DARK });

  // Bloc titulaire (gauche) et bloc références (droite)
  let by = headBottom - 24;
  text(L.clientBlock.toUpperCase(), MARGIN, by, { size: 6.8, font: bold, color: MUTED });
  by -= 14;
  text(input.clientName, MARGIN, by, { size: 11, font: bold, maxWidth: 240 });
  for (const line of input.clientAddressLines) {
    by -= 12;
    text(line, MARGIN, by, { size: 9, maxWidth: 240 });
  }
  by -= 12;
  text(input.email, MARGIN, by, { size: 8.2, color: MUTED, maxWidth: 240 });

  const statementNo = `REL-${input.issuedAt.toISOString().slice(0, 10).replace(/-/g, '')}-${input.accountRef.replace('HV-', '')}`;
  const refRows: [string, string][] = [
    [L.refBox.statementNo, statementNo],
    [L.refBox.period, `${fmtDate(data.from)} – ${fmtDate(data.to)}`],
    [L.refBox.issued, fmtDate(input.issuedAt)],
    [L.refBox.account, input.accountRef],
    [L.refBox.currency, L.currencyValue[input.currency]],
  ];
  const boxX = MARGIN + CONTENT_W - 236;
  const boxTop = headBottom - 16;
  const boxH = refRows.length * 15 + 12;
  page.drawRectangle({ x: boxX, y: boxTop - boxH, width: 236, height: boxH, color: PANEL });
  refRows.forEach(([k, v], i) => {
    const ry = boxTop - 16 - i * 15;
    text(k, boxX + 10, ry, { size: 7.6, color: MUTED });
    text(v, boxX + 226, ry, { size: 8.4, font: bold, align: 'right', maxWidth: 140 });
  });
  y = Math.min(by, boxTop - boxH) - 20;

  // Titre du document
  page.drawRectangle({ x: MARGIN, y: y - 30, width: CONTENT_W, height: 36, color: RULE_DARK });
  text(L.title, MARGIN + 12, y - 10, { size: 12, font: bold, color: rgb(1, 1, 1) });
  text(L.subtitle(fmtDate(data.from), fmtDate(data.to)), MARGIN + 12, y - 23, { size: 8.2, color: rgb(0.88, 0.9, 0.93) });
  y -= 50;

  for (const line of wrap(L.intro(fmtDate(data.from), fmtDate(data.to)), CONTENT_W, 8.6)) {
    text(line, MARGIN, y, { size: 8.6, color: INK });
    y -= 12;
  }
  if (input.currency === 'EUR') {
    for (const line of wrap(L.fxNote(new Intl.NumberFormat(localeTag, { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(input.eurPerUsd), fmtDate(input.issuedAt)), CONTENT_W, 7.6, italic)) {
      text(line, MARGIN, y, { size: 7.6, font: italic, color: MUTED });
      y -= 10;
    }
  }
  y -= 2;

  // ---- 1. Situation ---------------------------------------------------------------
  const s = data.summary;
  const w = data.wallet;
  heading(L.s1);
  subheading(L.s1a);
  drawReconciliation([
    { label: L.valueOpening(fmtDate(data.from)), value: money(s.openingValue) },
    { label: L.valueDeposits, value: money(s.deposits) },
    { label: L.valueWithdrawals, value: money(s.withdrawals.negated()) },
    { label: L.valueYield, value: money(s.yieldNet, true), color: s.yieldNet.lt(0) ? RED : GREEN },
    { label: L.valueClosing(fmtDate(data.to)), value: money(s.closingValue), total: true },
  ]);
  subheading(L.s1b);
  drawReconciliation([
    { label: L.walletOpening(fmtDate(data.from)), value: money(w.opening) },
    { label: L.walletContrib, value: money(w.contributions) },
    { label: L.walletProceeds, value: money(w.proceeds) },
    { label: L.walletPlacements, value: money(w.placements.negated()) },
    ...(w.transfersOut.isZero() ? [] : [{ label: L.walletTransfers, value: money(w.transfersOut.negated()) }]),
    { label: L.walletClosing(fmtDate(data.to)), value: money(w.closing), total: true },
  ]);
  // Total des avoirs + rendement
  ensure(64);
  page.drawRectangle({ x: MARGIN, y: y - 42, width: CONTENT_W, height: 50, color: PANEL });
  text(L.totalAssets(fmtDate(data.to)), MARGIN + 10, y - 6, { size: 9, font: bold });
  text(`${money(s.closingValue.plus(w.closing))} ${input.currency}`, A4_W - MARGIN - 10, y - 6, { size: 11, font: bold, align: 'right' });
  text(`${L.returnPct} : ${pct(s.returnPct)}`, MARGIN + 10, y - 22, {
    size: 8.2,
    font: bold,
    color: (s.returnPct ?? 0) < 0 ? RED : GREEN,
  });
  text(L.returnMethod, MARGIN + 10, y - 35, { size: 7, font: italic, color: MUTED, maxWidth: CONTENT_W - 20 });
  y -= 62;

  // ---- 2. Évolution mensuelle ---------------------------------------------------------
  heading(L.s2);
  drawTable(
    [
      { label: L.colMonth, w: 130 },
      { label: L.colPlaced, w: 92, align: 'right' },
      { label: L.colWithdrawn, w: 92, align: 'right' },
      { label: L.colNet, w: 92, align: 'right' },
      { label: L.colEndValue, w: CONTENT_W - 406, align: 'right' },
    ],
    data.months.map((m) => [
      { t: fmtMonth(m.month) },
      { t: money(m.depositsUsd) },
      { t: money(m.withdrawalsUsd) },
      { t: money(m.yieldUsd, true), color: m.yieldUsd.lt(0) ? RED : m.yieldUsd.gt(0) ? GREEN : INK },
      { t: money(m.endValueUsd), bold: true },
    ]),
  );

  // ---- 3. Placements ------------------------------------------------------------------
  heading(L.s3);
  if (data.positions.length === 0) {
    text(L.noPositions, MARGIN + 4, y, { size: 8.6, color: MUTED });
    y -= 18;
  } else {
    const sorted = [...data.positions].sort((a, b) => b.principal.plus(b.accruedYield).comparedTo(a.principal.plus(a.accruedYield)));
    drawTable(
      [
        { label: L.colRef, w: 62 },
        { label: L.colProduct, w: 106 },
        { label: L.colOpened, w: 54 },
        { label: L.colCapital, w: 60, align: 'right' },
        { label: L.colYield, w: 58, align: 'right' },
        { label: L.colValue, w: 60, align: 'right' },
        { label: L.colStatus, w: CONTENT_W - 400, align: 'right' },
      ],
      sorted.map((p) => {
        const name = p.kind === 'BASKET' ? L.basket[p.key] ?? p.key : `${L.planPrefix} ${L.plan[p.key] ?? p.key}`;
        const statusLabel = p.status === 'ACTIVE' ? L.active : p.status === 'MATURED' ? L.matured : L.closed;
        return [
          { t: `POS-${p.id.replace(/-/g, '').slice(0, 6).toUpperCase()}`, color: MUTED },
          { t: name },
          { t: fmtDate(p.openedAt) },
          { t: money(p.principal) },
          { t: money(p.accruedYield, true), color: p.accruedYield.lt(0) ? RED : GREEN },
          { t: money(p.principal.plus(p.accruedYield)), bold: true },
          {
            t: p.maturityDate && p.status === 'ACTIVE' ? `${statusLabel} · ${L.due} ${fmtDate(p.maturityDate)}` : statusLabel,
            color: MUTED,
          },
        ];
      }),
    );
  }

  // ---- 4. Mouvements du wallet ----------------------------------------------------------
  heading(L.s4);
  const opCols: Col[] = [
    { label: L.colDate, w: 54 },
    { label: L.colRef, w: 72 },
    { label: L.colLabel, w: CONTENT_W - 54 - 72 - 216 },
    { label: L.colDebit, w: 68, align: 'right' },
    { label: L.colCredit, w: 68, align: 'right' },
    { label: L.colBalance, w: 80, align: 'right' },
  ];
  const opRows: Cell[][] = [
    [
      { t: fmtDate(data.from) },
      { t: '' },
      { t: L.openingBalance, bold: true },
      { t: '' },
      { t: '' },
      { t: money(w.opening), bold: true },
    ],
    ...data.operations.map((op): Cell[] => {
      let label = L.ops[op.kind];
      if (op.kind === 'DEPOSIT' && op.currency) label += ` (${op.currency})`;
      if (op.referenceTx && !op.referenceTx.startsWith('demo-')) label += ` · ${L.txRef} ${op.referenceTx.slice(0, 12)}…`;
      const isCredit = op.amount.gt(0);
      return [
        { t: fmtDate(op.at) },
        { t: op.ref, color: MUTED },
        { t: label },
        { t: isCredit ? '' : money(op.amount.abs()) },
        { t: isCredit ? money(op.amount) : '', color: GREEN },
        { t: money(op.balanceAfter) },
      ];
    }),
    [
      { t: fmtDate(data.to) },
      { t: '' },
      { t: L.closingBalance, bold: true },
      { t: '' },
      { t: '' },
      { t: money(w.closing), bold: true },
    ],
  ];
  if (data.operations.length === 0) {
    text(L.noOperations, MARGIN + 4, y, { size: 8.6, color: MUTED });
    y -= 18;
  } else {
    drawTable(opCols, opRows);
  }

  // ---- 5. Rendements ----------------------------------------------------------------------
  heading(L.s5);
  if (data.yields.length === 0) {
    text(L.noYields, MARGIN + 4, y, { size: 8.6, color: MUTED });
    y -= 18;
  } else {
    drawTable(
      [
        { label: L.colPeriod, w: 130 },
        { label: L.colRef, w: 70 },
        { label: L.colNature, w: CONTENT_W - 130 - 70 - 60 - 90 },
        { label: L.colCount, w: 60, align: 'right' },
        { label: L.colAmount, w: 90, align: 'right' },
      ],
      data.yields.map((y2) => [
        { t: L.yieldPeriod(fmtDate(y2.firstAt), fmtDate(y2.lastAt)) },
        { t: y2.ref, color: MUTED },
        { t: L.yieldNature },
        { t: String(y2.count) },
        { t: money(y2.amount, true), bold: true, color: y2.amount.lt(0) ? RED : GREEN },
      ]),
    );
  }

  // ---- 6. Notes explicatives -----------------------------------------------------------------
  heading(L.s6);
  for (const note of L.notes) {
    const lines = wrap(note.body, CONTENT_W - 8, 8.2);
    ensure(14 + lines.length * 11);
    text(note.title, MARGIN + 4, y, { size: 8.4, font: bold });
    y -= 11;
    for (const line of lines) {
      text(line, MARGIN + 4, y, { size: 8.2, color: INK });
      y -= 10.5;
    }
    y -= 5;
  }

  // ---- 7. Édition du document ------------------------------------------------------------------
  heading(L.s7);
  const fp = statementFingerprint(data, input.accountRef);
  const fpShown = `${fp.slice(0, 16).match(/.{4}/g)!.join(' ')} … ${fp.slice(-8)}`;
  ensure(96);
  const blockTop = y;
  const leftW = CONTENT_W - 190;
  page.drawRectangle({ x: MARGIN, y: blockTop - 74, width: leftW, height: 80, color: PANEL });
  text(L.docRef, MARGIN + 10, blockTop - 8, { size: 7.4, color: MUTED });
  text(statementNo, MARGIN + 10, blockTop - 20, { size: 9, font: bold });
  text(L.fingerprint, MARGIN + 10, blockTop - 36, { size: 7.4, color: MUTED });
  text(fpShown, MARGIN + 10, blockTop - 48, { size: 8.2, font: bold });
  let fy = blockTop - 60;
  for (const line of wrap(L.fingerprintNote, leftW - 20, 6.8, italic)) {
    text(line, MARGIN + 10, fy, { size: 6.8, font: italic, color: MUTED });
    fy -= 8;
  }
  // Emplacement de signature (laissé vide : signature électronique apposée à part)
  const sx = MARGIN + leftW + 12;
  page.drawRectangle({ x: sx, y: blockTop - 74, width: 178, height: 80, borderColor: RULE_DARK, borderWidth: 0.7 });
  text(L.signatureTitle, sx + 8, blockTop - 8, { size: 7.4, color: MUTED });
  text(L.signatureHint, sx + 89, blockTop - 44, { size: 7.4, font: italic, color: RULE, align: 'center' });
  page.drawLine({ start: { x: sx + 12, y: blockTop - 62 }, end: { x: sx + 166, y: blockTop - 62 }, thickness: 0.5, color: RULE });
  y = blockTop - 90;

  // ---- Pieds de page (toutes pages) ---------------------------------------------------------------
  pages.forEach((pg, i) => {
    page = pg;
    const fy0 = MARGIN + FOOTER_H - 14;
    page.drawLine({ start: { x: MARGIN, y: fy0 }, end: { x: A4_W - MARGIN, y: fy0 }, thickness: 0.5, color: RULE });
    L.legalFooter.forEach((line, k) => {
      text(line, MARGIN, fy0 - 11 - k * 9, { size: 6.6, color: MUTED, maxWidth: CONTENT_W - 60 });
    });
    text(`${statementNo}`, MARGIN, fy0 - 11 - 2 * 9 - 3, { size: 6.6, color: MUTED });
    text(`${L.page} ${i + 1} ${L.of} ${pages.length}`, A4_W - MARGIN, fy0 - 11 - 2 * 9 - 3, { size: 7.2, font: bold, color: MUTED, align: 'right' });
  });

  return doc.save();
}
