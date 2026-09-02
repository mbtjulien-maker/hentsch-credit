import { ArrowRight, Landmark, LineChart, ShieldAlert, Wallet } from "lucide-react";
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

// Page dédiée au troisième produit de la plateforme (§2H CLAUDE.md) — même traitement
// vitrine que le crédit gagé (teaser sur "/", entrée SiteNav, entrée /tarifs et
// /plan-du-site) : un placement réel, distinct du crédit, ouvert aux comptes particulier
// ET business. Les indicatifs de rendement (8,58%/2,5%) reprennent les mêmes constantes
// que le backend (cf. backend/src/investment/investment.constants.ts) — duplication
// assumée côté marketing, même principe que /tarifs pour le crédit gagé.
export default async function InvestissementDirectPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("DirectInvestment");

  const STEPS = [
    { icon: LineChart, title: t("steps.choose.title"), description: t("steps.choose.description") },
    { icon: Wallet, title: t("steps.deposit.title"), description: t("steps.deposit.description") },
    { icon: Landmark, title: t("steps.accrue.title"), description: t("steps.accrue.description") },
    { icon: ArrowRight, title: t("steps.withdraw.title"), description: t("steps.withdraw.description") },
  ] as const;

  const FAQ_ITEMS = (["guarantee", "withdraw", "difference"] as const).map((key) => ({
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

        <h2 className="mt-14 text-xl font-semibold text-foreground">{t("basketsTitle")}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {(["rwa", "stocks"] as const).map((key) => (
            <div key={key} className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">{t(`baskets.${key}.title`)}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(`baskets.${key}.description`)}</p>
              <p className="mt-3 text-lg font-semibold tabular-nums text-foreground">{t(`baskets.${key}.rate`)}</p>
            </div>
          ))}
        </div>

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
            href="/demande-de-compte"
            className="rounded-lg border border-border/80 bg-card px-5 py-3 text-sm font-medium text-foreground/80 shadow-sm transition-colors hover:border-border hover:text-foreground"
          >
            {t("ctaNoAccount")}
          </Link>
        </div>
      </div>
    </MarketingPageShell>
  );
}
