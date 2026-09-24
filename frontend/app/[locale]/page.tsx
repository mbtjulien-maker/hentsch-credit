import {
  ArrowRight,
  Layers,
  LineChart,
  Percent,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Wallet,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { HeroCarousel } from "@/components/marketing/hero-carousel";
import { InvestmentPreviewGrid } from "@/components/marketing/investment-preview-grid";
import { AssetLogoRow } from "@/components/marketing/asset-logo-row";
import { YieldAssetGrid } from "@/components/marketing/yield-assets-showcase";
import { SectionTeaserCard } from "@/components/marketing/section-teaser-card";
import { buildPageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Home.meta" });
  return buildPageMetadata({ locale, path: "/", title: t("title"), description: t("description") });
}

// Vitrine publique de la plateforme — "/" ; distincte de l'espace client connecté qui vit
// désormais sous "/dashboard" (cf. app/dashboard/layout.tsx). Ne garde que le hero et un
// aperçu court de chaque section : le détail de chacune vit sur sa propre page (cf.
// SECTION_TEASERS et /demande-de-compte) — un vrai site à plusieurs pages plutôt qu'un
// unique long scroll, avec un menu dans SiteNav pour y accéder depuis n'importe où.
export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Home");

  const STATS = [
    { icon: Percent, value: "350%", label: t("stats.ratio") },
    { icon: ShieldCheck, value: t("stats.custodyValue"), label: t("stats.custodyLabel") },
    { icon: UserCheck, value: t("stats.kycValue"), label: t("stats.kycLabel") },
  ] as const;

  // Chaque carte renvoie vers une page dédiée (cf. SiteNav pour le menu, ces mêmes pages
  // pour le contenu complet) — l'accueil garde un aperçu court plutôt que de tout dérouler
  // en une seule page. Regroupées comme l'en-tête (cf. lib/site-navigation.ts) : le crédit
  // d'un côté, l'investissement et le suivi des marchés de l'autre, au lieu d'une seule
  // rangée de cinq cartes de natures différentes (retour client : "trop mélangé").
  const CREDIT_TEASERS = [
    { icon: Wallet, title: t("teasers.howItWorks.title"), description: t("teasers.howItWorks.description"), href: "/comment-ca-marche" },
    { icon: Sparkles, title: t("teasers.yield.title"), description: t("teasers.yield.description"), href: "/rendement" },
    { icon: Layers, title: t("teasers.rwa.title"), description: t("teasers.rwa.description"), href: "/strategie-rwa" },
  ] as const;
  const INVEST_TEASERS = [
    // Troisième produit de la plateforme (§2H CLAUDE.md) — aperçu court renvoyant vers sa
    // propre page dédiée.
    { icon: LineChart, title: t("teasers.investment.title"), description: t("teasers.investment.description"), href: "/investissement-direct" },
    { icon: TrendingUp, title: t("teasers.market.title"), description: t("teasers.market.description"), href: "/marche" },
  ] as const;

  // Deux slides du carrousel d'accueil (cf. HeroCarousel) — thème "fintech clair" partagé
  // avec l'espace client : fond clair, gros chiffre en émeraude, boutons en pilule. Même
  // structure pour les deux ; seule la pastille et le panneau de droite changent, pour ne
  // jamais laisser croire que crédit et investissement sont le même produit (cf. §2H).
  const primaryCta =
    "group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90";
  const secondaryCta =
    "rounded-full border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted";

  const creditHero = (
    <section className="relative overflow-hidden bg-primary/[0.04]">
      <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-28">
        <div className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
          <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            {t("badge")}
          </span>
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
            {t("titleLine1")} <span className="text-primary">{t("titleHighlight")}</span>.
          </h1>
          <p className="max-w-lg text-lg text-muted-foreground">{t("subtitle")}</p>

          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-8 py-5 lg:items-start">
            <div className="flex items-baseline gap-3">
              <span className="font-heading text-6xl leading-none font-medium tracking-tight text-primary">350%</span>
              <span className="text-sm font-medium text-muted-foreground">{t("statCardCaption")}</span>
            </div>
            <div className="flex items-center gap-2">
              <AssetLogoRow currencies={["XAUT", "PAXG", "KAG"]} variant="bare" />
              <span className="text-xs font-medium text-muted-foreground">{t("statCardAssets")}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Link href="/login" className={primaryCta}>
              {t("ctaLogin")}
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
            <Link href="/comment-ca-marche" className={secondaryCta}>
              {t("ctaHowItWorks")}
            </Link>
          </div>
          <Link href="/inscription" className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground">
            {t("ctaNoAccount")}
          </Link>
        </div>

        <YieldAssetGrid />
      </div>
    </section>
  );

  const investmentHero = (
    <section className="relative overflow-hidden bg-secondary/60">
      <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-24">
        <div className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
          <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {t("investmentHero.badge")}
          </span>
          <h2 className="font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
            {t("investmentHero.titleLine1")} <span className="text-primary">{t("investmentHero.titleHighlight")}</span>.
          </h2>
          <p className="max-w-lg text-lg text-muted-foreground">{t("investmentHero.subtitle")}</p>

          <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-8 py-5 lg:items-start">
            <div className="flex items-baseline gap-3">
              <span className="font-heading text-6xl leading-none font-medium tracking-tight text-primary">
                {t("investmentHero.statValue")}
              </span>
              <span className="text-sm font-medium text-muted-foreground">{t("investmentHero.statCaption")}</span>
            </div>
            <span className="text-xs font-medium text-muted-foreground">{t("investmentHero.statDisclaimer")}</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Link href="/login" className={primaryCta}>
              {t("ctaLogin")}
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
            <Link href="/investissement-direct" className={secondaryCta}>
              {t("investmentHero.ctaDiscover")}
            </Link>
          </div>
        </div>

        <InvestmentPreviewGrid />
      </div>
    </section>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />

      {/* Retour client : alterner crédit gagé et investissement direct plutôt que les
          empiler l'un sous l'autre, façon bandeau publicitaire (3s par slide, pause au
          survol, cf. HeroCarousel). */}
      <HeroCarousel slides={[creditHero, investmentHero]} />

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-semibold text-foreground">{t("discoverTitle")}</h2>
          <p className="mt-2 text-muted-foreground">{t("discoverDescription")}</p>
        </div>

        <div className="flex flex-col gap-12">
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground">{t("groups.credit.title")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t("groups.credit.description")}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {CREDIT_TEASERS.map((teaser) => (
                <SectionTeaserCard key={teaser.href} {...teaser} />
              ))}
            </div>
          </div>

          <div>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground">{t("groups.invest.title")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t("groups.invest.description")}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {INVEST_TEASERS.map((teaser) => (
                <SectionTeaserCard key={teaser.href} {...teaser} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
        <h2 className="mb-6 text-center text-2xl font-semibold text-foreground">{t("trustTitle")}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {STATS.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
              <stat.icon className="size-5 text-muted-foreground/80" />
              <div className="mt-3 text-xl font-semibold text-foreground">{stat.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-2xl px-4 pb-20 text-center sm:px-6">
        <h2 className="text-2xl font-semibold text-foreground">{t("closingTitle")}</h2>
        <p className="mt-2 text-muted-foreground">{t("closingDescription")}</p>
        <Link
          href="/inscription"
          className="group mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
        >
          {t("closingCta")}
          <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
        </Link>
      </section>

      <SiteFooter />
    </div>
  );
}
