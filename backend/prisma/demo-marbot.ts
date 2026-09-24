import { PrismaClient, Prisma } from '@prisma/client';
import { hashPassword } from '../src/common/password.util';
import { buildInvestmentPerformance } from '../src/investment/investment-performance';

// ============================================================================================
// DONNÉES DE DÉMONSTRATION — SIMULATION, JAMAIS UNE PERFORMANCE RÉELLE.
//
// Crée (ou recrée) un compte client fictif "Julien Marbot" (profil, adresse, situation
// professionnelle et dossier KYC complets et validés, données inventées) avec un historique d'investissement
// rétro-daté (dépôts, placements, rendements quotidiens composés, un retrait) pour tester
// l'espace Investissement et produire des captures de démonstration.
//
// - Les rendements sont GÉNÉRÉS (générateur pseudo-aléatoire à graine fixe, calé sur un
//   rendement cible), pas issus du marché : ils ne doivent JAMAIS être présentés comme une
//   performance réelle ou passée de la plateforme (cf. CLAUDE.md §2H : objectif indicatif
//   8-14 %/an, jamais garanti). Toute capture destinée à un public doit porter la mention
//   "Simulation à titre illustratif".
// - Relançable : supprime le compte de démo existant (cascade) avant de le recréer.
// - Refuse de tourner en production.
//
// Usage : cd backend && npx ts-node prisma/demo-marbot.ts
// Suppression du compte de démo : npx ts-node prisma/demo-marbot.ts --remove
// Options (variables d'environnement) : DEMO_RETURN_PCT (défaut 10, rendement cumulé visé,
// en % du capital placé), DEMO_TODAY (défaut : maintenant, format ISO).
// ============================================================================================

if (process.env.NODE_ENV === 'production') {
  throw new Error('demo-marbot : refusé en production (données fictives).');
}

const prisma = new PrismaClient();

const EMAIL = 'julien.marbot@example.com';
const DEV_PASSWORD = 'ChangeMe123!';
const TARGET_RETURN_PCT = Number(process.env.DEMO_RETURN_PCT ?? '10');
const NOW = process.env.DEMO_TODAY ? new Date(process.env.DEMO_TODAY) : new Date();

const MAIN_WALLET_DEPOSIT = 2000;
const at = (iso: string) => new Date(`${iso}Z`);
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

type BasketKey =
  | 'RWA_STRATEGY'
  | 'STOCKS_CONSERVATIVE'
  | 'STOCKS_BALANCED'
  | 'STOCKS_TECH_AI'
  | 'STOCKS_MOMENTUM';
type PlanKey = 'SEMICONDUCTORS_6M' | 'CORE_BALANCED_12M';

// Profil de chaque produit : `weight` = part du rendement moyen cible, `sigma` = volatilité
// quotidienne (écart-type du rendement journalier, en fraction) — du plus calme au plus
// nerveux, dans le même ordre que le gradient de risque du produit (§2H).
const PROFILE: Record<string, { weight: number; sigma: number; stock: boolean }> = {
  RWA_STRATEGY: { weight: 1.0, sigma: 0.0035, stock: false },
  STOCKS_CONSERVATIVE: { weight: 0.6, sigma: 0.0035, stock: true },
  STOCKS_BALANCED: { weight: 1.0, sigma: 0.007, stock: true },
  STOCKS_TECH_AI: { weight: 1.6, sigma: 0.011, stock: true },
  STOCKS_MOMENTUM: { weight: 2.2, sigma: 0.016, stock: true },
  SEMICONDUCTORS_6M: { weight: 1.5, sigma: 0.012, stock: true },
  CORE_BALANCED_12M: { weight: 0.9, sigma: 0.006, stock: true },
};

// Scénario : 70 000 (unité du ledger, affichée en $US) au total — 2 000 sur le wallet
// principal et 68 000 déposés en trois fois sur le wallet investissement, placés sur cinq
// paniers et deux plans à échéance fixe. Le compte est ouvert le 26 juillet 2026, premier dépôt le 27.
const DEPOSITS = [
  { at: at('2026-07-27T10:12:00'), amount: 56000, kind: 'CRYPTO' as const, currency: 'USDC' as const, ref: 'demo-marbot-dep-1' },
  { at: at('2026-08-18T14:03:00'), amount: 7000, kind: 'CRYPTO' as const, currency: 'USDT' as const, ref: 'demo-marbot-dep-2' },
  { at: at('2026-09-03T09:41:00'), amount: 5000, kind: 'CARD' as const, currency: null, ref: 'demo-marbot-card-1' },
];

type Placement = { at: Date; target: BasketKey | PlanKey; fixed: boolean; amount: number; maturity?: Date };
const PLACEMENTS: Placement[] = [
  { at: at('2026-07-27T11:20:00'), target: 'RWA_STRATEGY', fixed: false, amount: 18000 },
  { at: at('2026-07-27T11:22:00'), target: 'STOCKS_BALANCED', fixed: false, amount: 12000 },
  { at: at('2026-07-27T11:25:00'), target: 'STOCKS_TECH_AI', fixed: false, amount: 10000 },
  { at: at('2026-07-27T11:31:00'), target: 'SEMICONDUCTORS_6M', fixed: true, amount: 8500, maturity: at('2027-01-27T11:31:00') },
  { at: at('2026-08-05T09:15:00'), target: 'STOCKS_CONSERVATIVE', fixed: false, amount: 5000 },
  { at: at('2026-08-05T09:18:00'), target: 'STOCKS_MOMENTUM', fixed: false, amount: 2500 },
  { at: at('2026-08-20T10:05:00'), target: 'CORE_BALANCED_12M', fixed: true, amount: 7000, maturity: at('2027-08-20T10:05:00') },
  { at: at('2026-09-04T10:30:00'), target: 'RWA_STRATEGY', fixed: false, amount: 3500 },
];
// Retrait complet du panier Momentum (les paniers se retirent toujours en totalité, §2H).
const WITHDRAWAL = { at: at('2026-09-15T10:12:00'), target: 'STOCKS_MOMENTUM' as BasketKey };

// Générateur pseudo-aléatoire à graine fixe (mulberry32) + Box-Muller : mêmes rendements à
// chaque exécution, donc des captures reproductibles.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gaussian(rand: () => number) {
  const u = Math.max(rand(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

// Jours d'accrual : chaque jour à 03:15 UTC (cron réel, §2H), du lendemain du premier
// placement jusqu'à aujourd'hui inclus si 03:15 est passé.
function accrualTimes(): Date[] {
  const times: Date[] = [];
  const first = at('2026-07-28T03:15:00');
  for (let t = first.getTime(); t <= NOW.getTime(); t += 86400000) times.push(new Date(t));
  return times;
}

interface Sim {
  accruals: { key: string; fixed: boolean; at: Date; amount: number }[];
  finalYield: Record<string, number>;
  withdrawalAmount: number;
  principal: Record<string, number>;
}

// Simule l'historique complet pour une échelle de rendement `k` (1 = rendement moyen par
// défaut de chaque produit). Le bruit est tiré une fois par (produit, jour) : seul `k`
// varie entre deux appels, ce qui rend le rendement total monotone en `k` (dichotomie).
function simulate(k: number): Sim {
  const times = accrualTimes();
  const noise: Record<string, number[]> = {};
  Object.keys(PROFILE).forEach((key, i) => {
    const rand = rng(1000 + i * 97);
    noise[key] = times.map(() => gaussian(rand));
  });

  const principal: Record<string, number> = {};
  const accrued: Record<string, number> = {};
  const fixedFlag: Record<string, boolean> = {};
  const closed = new Set<string>();
  const accruals: Sim['accruals'] = [];
  let withdrawalAmount = 0;

  const events = [
    ...PLACEMENTS.map((p) => ({ at: p.at, type: 'place' as const, p })),
    { at: WITHDRAWAL.at, type: 'withdraw' as const, p: null },
  ].sort((a, b) => a.at.getTime() - b.at.getTime());
  let ev = 0;

  times.forEach((t, dayIdx) => {
    while (ev < events.length && events[ev].at.getTime() <= t.getTime()) {
      const e = events[ev++];
      if (e.type === 'place' && e.p) {
        principal[e.p.target] = (principal[e.p.target] ?? 0) + e.p.amount;
        accrued[e.p.target] = accrued[e.p.target] ?? 0;
        fixedFlag[e.p.target] = e.p.fixed;
      } else {
        const key = WITHDRAWAL.target;
        withdrawalAmount = (principal[key] ?? 0) + (accrued[key] ?? 0);
        closed.add(key);
      }
    }
    const weekend = [0, 6].includes(t.getUTCDay());
    for (const key of Object.keys(principal)) {
      if (closed.has(key)) continue;
      const prof = PROFILE[key];
      // Week-end : les actions ne cotent pas, seul le portage (dividende) s'accumule.
      const base = k * prof.weight * 0.0012;
      const shock = prof.stock && weekend ? 0 : prof.sigma * noise[key][dayIdx];
      const r = base + shock;
      const amount = Math.round((principal[key] + accrued[key]) * r * 1e6) / 1e6;
      accrued[key] += amount;
      accruals.push({ key, fixed: fixedFlag[key], at: t, amount });
    }
  });
  // Un retrait programmé après le dernier accrual (si NOW est antérieur) n'a pas eu lieu.
  return { accruals, finalYield: accrued, withdrawalAmount, principal };
}

function totalYield(sim: Sim) {
  return sim.accruals.reduce((sum, a) => sum + a.amount, 0);
}

async function main() {
  if (process.argv.includes('--remove')) {
    const { count } = await prisma.user.deleteMany({ where: { email: EMAIL } });
    console.log(count ? `Compte ${EMAIL} supprimé (transactions, positions et soldes en cascade).` : `Aucun compte ${EMAIL} à supprimer.`);
    return;
  }
  const placed = PLACEMENTS.reduce((s, p) => s + p.amount, 0);
  const targetYield = (placed * TARGET_RETURN_PCT) / 100;

  // Dichotomie sur l'échelle k pour atteindre le rendement cible.
  let lo = 0;
  let hi = 5;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (totalYield(simulate(mid)) < targetYield) lo = mid;
    else hi = mid;
  }
  const sim = simulate((lo + hi) / 2);

  // Trésorerie du wallet investissement : ne doit jamais être négative.
  const cashEvents = [
    ...DEPOSITS.map((d) => ({ at: d.at, delta: d.amount })),
    ...PLACEMENTS.map((p) => ({ at: p.at, delta: -p.amount })),
    { at: WITHDRAWAL.at, delta: sim.withdrawalAmount },
  ].sort((a, b) => a.at.getTime() - b.at.getTime());
  let cash = 0;
  for (const e of cashEvents) {
    cash += e.delta;
    if (cash < -1e-6) throw new Error(`Scénario incohérent : trésorerie négative au ${e.at.toISOString()}`);
  }

  await prisma.user.deleteMany({ where: { email: EMAIL } });

  const user = await prisma.user.create({
    data: {
      email: EMAIL,
      passwordHash: await hashPassword(DEV_PASSWORD),
      kycStatus: 'VERIFIED',
      accountType: 'PARTICULIER',
      createdAt: at('2026-07-26T16:40:00'),
      clientProfile: {
        create: {
          firstName: 'Julien',
          lastName: 'Marbot',
          dateOfBirth: at('1984-03-12T00:00:00'),
          placeOfBirth: 'Lyon',
          birthCountry: 'France',
          gender: 'M',
          nationality: 'Française',
          maritalStatus: 'MARIE',
          dependents: 2,
          phone: '+41 79 000 00 00',
        },
      },
      addresses: {
        create: {
          label: 'DOMICILE',
          street: '14 chemin des Vignes',
          city: 'Nyon',
          postalCode: '1260',
          country: 'Suisse',
          residenceType: 'PROPRIETAIRE',
          since: '2019',
          verified: true,
          verifiedAt: at('2026-07-27T09:00:00'),
        },
      },
      employment: {
        create: {
          isIndependent: false,
          professionalStatus: 'DIRIGEANT',
          employer: 'Marbot Conseil SA',
          sector: 'FINANCE_ASSURANCE',
          role: 'Directeur associé',
          seniority: '8 ans',
          annualIncome: new Prisma.Decimal(185000),
          annualIncomeBracket: 'B100K_250K',
          netWorthBracket: 'B500K_1M',
          verified: true,
        },
      },
      identityDocument: {
        create: {
          documentType: 'PASSEPORT',
          documentNumber: 'DEMO000000',
          issuingAuthority: 'Préfecture (démo)',
          issuePlace: 'Lyon',
          issueDate: at('2022-05-10T00:00:00'),
          expiryDate: at('2032-05-09T00:00:00'),
          identityCheckMethod: 'PVID',
          proofOfAddressType: 'FACTURE',
          proofOfAddressIssuer: 'Services industriels (démo)',
          proofOfAddressDate: at('2026-07-01T00:00:00'),
          verified: true,
          verifiedAt: at('2026-07-27T09:00:00'),
        },
      },
      amlProfile: {
        create: {
          isPoliticallyExposed: false,
          fundsOrigin: ['REVENUS_PROFESSIONNELS', 'EPARGNE'],
          relationshipPurpose: ['PLACEMENT', 'COMPTE_COURANT'],
          attestedAt: at('2026-07-26T17:05:00'),
          attestationCity: 'Nyon',
          riskLevel: 'FAIBLE',
          reviewDecision: 'VALIDE',
          reviewedAt: at('2026-07-27T09:00:00'),
        },
      },
    },
  });

  const dec = (n: number) => new Prisma.Decimal(n.toFixed(6));
  const txs: Prisma.TransactionCreateManyInput[] = [];

  for (const d of DEPOSITS) {
    txs.push(
      d.kind === 'CRYPTO'
        ? {
            userId: user.id,
            type: 'DEPOSIT',
            amount: dec(d.amount),
            status: 'COMPLETED',
            currency: d.currency,
            tokenAmount: dec(d.amount),
            chain: 'ETHEREUM',
            referenceTx: d.ref,
            creditTarget: 'INVESTMENT',
            createdAt: d.at,
          }
        : {
            userId: user.id,
            type: 'CARD_TOPUP',
            amount: dec(d.amount),
            status: 'COMPLETED',
            referenceTx: d.ref,
            creditTarget: 'INVESTMENT',
            createdAt: d.at,
          },
    );
  }
  // Petit solde sur le wallet principal (dépôt classique, hors wallet investissement) pour
  // que l'accueil montre trois soldes distincts.
  txs.push({
    userId: user.id,
    type: 'DEPOSIT',
    amount: dec(MAIN_WALLET_DEPOSIT),
    status: 'COMPLETED',
    currency: 'USDT',
    tokenAmount: dec(MAIN_WALLET_DEPOSIT),
    chain: 'ETHEREUM',
    referenceTx: 'demo-marbot-main-1',
    creditTarget: 'AVAILABLE',
    createdAt: at('2026-07-26T18:30:00'),
  });
  for (const p of PLACEMENTS) {
    txs.push({
      userId: user.id,
      type: p.fixed ? 'FIXED_TERM_DEPOSIT' : 'INVESTMENT_DEPOSIT',
      amount: dec(p.amount),
      status: 'COMPLETED',
      createdAt: p.at,
    });
  }
  for (const a of sim.accruals) {
    if (a.key === WITHDRAWAL.target && a.at.getTime() > WITHDRAWAL.at.getTime()) continue;
    if (a.amount === 0) continue;
    txs.push({
      userId: user.id,
      type: a.fixed ? 'FIXED_TERM_YIELD_ACCRUAL' : 'INVESTMENT_YIELD_ACCRUAL',
      amount: dec(a.amount),
      status: 'COMPLETED',
      createdAt: a.at,
    });
  }
  txs.push({
    userId: user.id,
    type: 'INVESTMENT_WITHDRAWAL',
    amount: dec(sim.withdrawalAmount),
    status: 'COMPLETED',
    createdAt: WITHDRAWAL.at,
  });
  await prisma.transaction.createMany({ data: txs });

  // Positions : une ligne par panier (ACTIVE, ou CLOSED pour Momentum), une par plan.
  const placedByTarget: Record<string, { first: Placement; amount: number }> = {};
  for (const p of PLACEMENTS) {
    const cur = placedByTarget[p.target];
    placedByTarget[p.target] = { first: cur?.first ?? p, amount: (cur?.amount ?? 0) + p.amount };
  }
  for (const [key, { first, amount }] of Object.entries(placedByTarget)) {
    const yieldAmount = sim.finalYield[key] ?? 0;
    if (first.fixed) {
      await prisma.fixedTermPosition.create({
        data: {
          userId: user.id,
          plan: key as PlanKey,
          principalAmount: dec(amount),
          accruedYield: dec(yieldAmount),
          status: 'ACTIVE',
          createdAt: first.at,
          maturityDate: first.maturity!,
        },
      });
    } else {
      const isClosed = key === WITHDRAWAL.target;
      await prisma.investmentPosition.create({
        data: {
          userId: user.id,
          basket: key as BasketKey,
          principalAmount: dec(amount),
          accruedYield: dec(yieldAmount),
          status: isClosed ? 'CLOSED' : 'ACTIVE',
          createdAt: first.at,
          closedAt: isClosed ? WITHDRAWAL.at : null,
        },
      });
    }
  }

  await prisma.ledgerBalance.upsert({
    where: { userId: user.id },
    create: { userId: user.id, availableBalance: dec(MAIN_WALLET_DEPOSIT), investmentBalance: dec(cash) },
    update: { availableBalance: dec(MAIN_WALLET_DEPOSIT), investmentBalance: dec(cash) },
  });

  // Contrôle : ce que l'espace Investissement affichera (même fonction que l'API).
  const rows = await prisma.transaction.findMany({ where: { userId: user.id } });
  const perf = buildInvestmentPerformance(rows, NOW);
  console.log(`\nCompte : ${EMAIL} / ${DEV_PASSWORD}  (Julien Marbot, KYC vérifié)`);
  console.log(`Dépôts : ${DEPOSITS.reduce((s, d) => s + d.amount, 0) + MAIN_WALLET_DEPOSIT} $ (dont ${MAIN_WALLET_DEPOSIT} sur le wallet principal) — placé : ${placed} $ — wallet libre : ${cash.toFixed(2)} $`);
  console.log(`Valeur actuelle du portefeuille : ${perf.totals.currentValueUsd.toFixed(2)} $`);
  console.log(`Rendement cumulé : ${perf.totals.yieldUsd.toFixed(2)} $ (${perf.totals.returnPct?.toFixed(2)} % du capital placé)`);
  for (const m of perf.months.filter((m) => !m.depositsUsd.isZero() || !m.yieldUsd.isZero() || !m.endValueUsd.isZero())) {
    console.log(
      `  ${m.month}  placé ${m.depositsUsd.toFixed(0).padStart(6)}  retiré ${m.withdrawalsUsd.toFixed(0).padStart(6)}  rendement ${m.yieldUsd.toFixed(0).padStart(6)}  valeur fin ${m.endValueUsd.toFixed(0).padStart(6)}`,
    );
  }
  console.log('\nRappel : SIMULATION — ne jamais présenter ces chiffres comme une performance réelle.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
