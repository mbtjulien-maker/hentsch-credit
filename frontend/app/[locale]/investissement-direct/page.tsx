import { ArrowRight, Landmark, LineChart, Lock, ShieldAlert, Sparkles, Wallet } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { JsonLd, buildPageMetadata, faqPageJsonLd } from "@/lib/seo";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "DirectInvestment.meta" });
  return buildPageMetadata({ locale, path: "/investissement-direct", title: t("title"), description: t("description") });
}

// Composition et niveau de risque de chaque panier — dupliqués depuis
// backend/src/investment/investment.constants.ts (RISK_LEVEL, STOCK_SUB_BASKETS) et
// backend/src/stock-market-data/stock-market-data.constants.ts (STOCK_NAMES), même
// principe que les taux déjà dupliqués côté marketing (/tarifs) : à vérifier à chaque
// modification de ces fichiers.
const BASKET_RISK_LEVEL = {
  rwa: 2,
  stocks: 4,
  stocksConservative: 1.5,
  stocksBalanced: 3,
  stocksTechAi: 4.2,
  stocksMomentum: 4.8,
} as const;

const BASKET_COMPOSITION: Record<string, string> = {
  stocksConservative: "Coca-Cola, Johnson & Johnson, Procter & Gamble, Berkshire Hathaway",
  stocksBalanced: "Microsoft, Apple, Eli Lilly, Amazon",
  stocksTechAi: "NVIDIA, Broadcom, Meta Platforms, Alphabet",
  stocksMomentum: "Micron, SanDisk, Dell Technologies, Palantir",
};

// Rendement annualisé indicatif de chaque plan à échéance fixe — moyenne des rendements
// de dividende réels des tickers composant le plan (+ l'objectif RWA le cas échéant),
// recalculée à l'identique de FixedTermPlanService.computeAnnualPct (backend) à partir de
// TICKER_DIVIDEND_YIELD_PCT/INDICATIVE_ANNUAL_YIELD_PCT.RWA_STRATEGY (8,58%) — jamais le
// chiffre initialement proposé au client (jusqu'à 25%/an), déjà écarté à l'entrée #29 du
// journal. RWA_METALS_12M retombe exactement sur 8,58%, 100% RWA — vérifié en direct
// contre l'API au moment de sa mise en place (cf. §6 CLAUDE.md entrée #29).
const FIXED_TERM_PLANS = [
  { id: "TREASURY_3M", horizonMonths: 3, riskScore: 2.5, annualPct: "4,25" },
  { id: "SEMICONDUCTORS_6M", horizonMonths: 6, riskScore: 3.5, annualPct: "0,68" },
  { id: "CORE_BALANCED_12M", horizonMonths: 12, riskScore: 2.0, annualPct: "0,48" },
  { id: "RWA_METALS_12M", horizonMonths: 12, riskScore: 2.2, annualPct: "8,58" },
  { id: "AI_MEGACAPS_12M", horizonMonths: 12, riskScore: 4.0, annualPct: "0,53" },
  { id: "ALPHA_MOMENTUM_12M", horizonMonths: 12, riskScore: 4.8, annualPct: "0,51" },
] as const;

function riskLabel(level: number, t: Awaited<ReturnType<typeof getTranslations>>): string {
  if (level <= 2) return t("low");
  if (level <= 3.5) return t("medium");
  return t("high");
}

function riskAccent(level: number): { border: string; text: string } {
  if (level <= 2) return { border: "border-l-emerald-400", text: "text-emerald-600 dark:text-emerald-400" };
  if (level <= 3.5) return { border: "border-l-amber-400", text: "text-amber-600 dark:text-amber-400" };
  return { border: "border-l-rose-400", text: "text-rose-600 dark:text-rose-400" };
}

// Page dédiée au troisième produit de la plateforme (§2H CLAUDE.md) — même traitement
// vitrine que le crédit gagé (teaser sur "/", entrée SiteNav, entrée /tarifs et
// /plan-du-site) : un placement réel, distinct du crédit, ouvert aux comptes particulier
// ET business. Considérablement enrichie (§6 CLAUDE.md entrée #46, retour client : "cette
// section est très importante") pour expliquer le mécanisme et les deux modes de
// placement aussi en détail que /strategie-rwa le fait pour la stratégie RWA seule — sans
// dupliquer son contenu (pillars/case-study/roadmap), simplement un lien direct vers elle
// pour qui veut aller plus loin sur ce point précis. Les indicatifs de rendement
// reprennent les mêmes constantes que le backend (cf. backend/src/investment/
// investment.constants.ts et fixed-term-plan.constants.ts) — duplication assumée côté
// marketing, même principe que /tarifs pour le crédit gagé.
export default async function InvestissementDirectPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("DirectInvestment");
  const tPlans = await getTranslations("Dashboard.investment.fixedTermPlans");
  const tRisk = await getTranslations("Dashboard.investment.risk");

  const STEPS = [
    { icon: LineChart, title: t("steps.choose.title"), description: t("steps.choose.description") },
    { icon: Wallet, title: t("steps.deposit.title"), description: t("steps.deposit.description") },
    { icon: Landmark, title: t("steps.accrue.title"), description: t("steps.accrue.description") },
    { icon: ArrowRight, title: t("steps.withdraw.title"), description: t("steps.withdraw.description") },
  ] as const;

  const BASKET_KEYS = [
    "rwa",
    "stocks",
    "stocksConservative",
    "stocksBalanced",
    "stocksTechAi",
    "stocksMomentum",
  ] as const;

  const FAQ_ITEMS = (
    ["guarantee", "withdraw", "difference", "wallet", "fixedTermLock", "howComputed", "riskLevels"] as const
  ).map((key) => ({
    key,
    question: t(`faq.${key}.question`),
    answer: t(`faq.${key}.answer`),
  }));

  return (
    <MarketingPageShell eyebrow={t("eyebrow")} title={t("title")} description={t("description")}>
      {/* Balisage FAQPage — construit à partir des MÊMES questions/réponses affichées
          plus bas (cf. FAQ_ITEMS), jamais un contenu parallèle (cf. lib/seo.ts). */}
      <JsonLd id="faq-jsonld" data={faqPageJsonLd(FAQ_ITEMS)} />
      <div className="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6">
        <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <div
              key={step.title}
              className="flex flex-col rounded-2xl border border-border/80 bg-card p-4 shadow-sm transition-all duration-500 ease-out hover:-translate-y-1.5 hover:border-blue-300/40 hover:shadow-xl"
            >
              <div className="mb-2.5 flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-fuchsia-600 text-white">
                <step.icon className="size-4.5" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>

        {/* Mécanisme — comment le rendement quotidien est réellement calculé et les deux
            modes de placement disponibles (retour client : "en dire le plus possible sur
            nos stratégies et fonctionnement"), avant même de détailler chaque panier. */}
        <h2 className="mt-14 text-xl font-semibold text-foreground">{t("mechanism.title")}</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{t("mechanism.intro")}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <Sparkles className="size-5 text-primary" />
            <h3 className="mt-2.5 text-sm font-semibold text-foreground">{t("mechanism.accrual.title")}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t("mechanism.accrual.body")}</p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <Wallet className="size-5 text-primary" />
            <h3 className="mt-2.5 text-sm font-semibold text-foreground">{t("mechanism.wallet.title")}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t("mechanism.wallet.body")}</p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <Lock className="size-5 text-primary" />
            <h3 className="mt-2.5 text-sm font-semibold text-foreground">{t("mechanism.twoModes.title")}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t("mechanism.twoModes.body")}</p>
          </div>
        </div>

        <h2 className="mt-14 text-xl font-semibold text-foreground">{t("basketsTitle")}</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{t("basketsIntro")}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BASKET_KEYS.map((key) => {
            const risk = BASKET_RISK_LEVEL[key];
            const accent = riskAccent(risk);
            return (
              <div
                key={key}
                className={`flex flex-col rounded-2xl border border-l-4 border-border/80 bg-card p-5 shadow-sm ${accent.border}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{t(`baskets.${key}.title`)}</h3>
                  <span className={`shrink-0 rounded-full border border-current/30 px-2 py-0.5 text-[10px] font-medium ${accent.text}`}>
                    {tRisk("label", { level: risk, max: 5, description: riskLabel(risk, tRisk) })}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(`baskets.${key}.description`)}</p>
                {BASKET_COMPOSITION[key] && (
                  <p className="mt-2 text-xs text-muted-foreground/80">
                    {t("compositionLabel")} {BASKET_COMPOSITION[key]}
                  </p>
                )}
                <p className={`mt-3 text-lg font-semibold tabular-nums ${accent.text}`}>{t(`baskets.${key}.rate`)}</p>
                {key === "rwa" && (
                  <Link
                    href="/strategie-rwa"
                    className="mt-2 inline-flex w-fit items-center gap-1 text-xs font-medium text-primary underline underline-offset-2 hover:text-primary/80"
                  >
                    {t("rwaLearnMore")}
                    <ArrowRight className="size-3" />
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        {/* Plans à échéance fixe — DEUXIÈME mode de placement (§2H CLAUDE.md entrée #29/
            #30), jamais mentionné sur cette page jusqu'ici alors que réellement
            souscriptible depuis l'espace client. */}
        <h2 className="mt-14 text-xl font-semibold text-foreground">{t("fixedTermTitle")}</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{t("fixedTermIntro")}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FIXED_TERM_PLANS.map((plan) => {
            const accent = riskAccent(plan.riskScore);
            return (
              <div
                key={plan.id}
                className={`flex flex-col rounded-2xl border border-l-4 border-border/80 bg-card p-5 shadow-sm ${accent.border}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{tPlans(`plan.${plan.id}.title`)}</h3>
                  <span className="shrink-0 rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {plan.horizonMonths === 12 ? tPlans("horizon.year") : tPlans("horizon.months", { months: plan.horizonMonths })}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{tPlans(`plan.${plan.id}.description`)}</p>
                <p className={`mt-3 text-lg font-semibold tabular-nums ${accent.text}`}>
                  {plan.annualPct} %/an {t("indicativeSuffix")}
                </p>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground/80">{t("fixedTermNote")}</p>

        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-amber-300/40 bg-amber-50/60 p-5 dark:border-amber-300/20 dark:bg-amber-500/[0.06]">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">{t("riskTitle")}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t("riskBody")}</p>
          </div>
        </div>

        <h2 className="mt-14 text-xl font-semibold text-foreground">{t("faqTitle")}</h2>
        <div className="mt-4 space-y-4">
          {FAQ_ITEMS.map((item) => (
            <div key={item.key} className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">{item.question}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{item.answer}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className="group flex items-center gap-2 rounded-lg bg-gradient-to-br from-cyan-400 to-fuchsia-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
          >
            {t("ctaLogin")}
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/inscription"
            className="rounded-lg border border-border/80 bg-card px-5 py-3 text-sm font-medium text-foreground/80 shadow-sm transition-colors hover:border-border hover:text-foreground"
          >
            {t("ctaNoAccount")}
          </Link>
        </div>
      </div>
    </MarketingPageShell>
  );
}
