import Image from "next/image";
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
  // Réutilise les libellés déjà affichés sur /investissement-direct (mêmes chaînes,
  // jamais un doublon retapé ici) — cf. commentaire de la page dédiée sur la duplication
  // assumée des indicatifs de rendement, déjà appliquée entre backend et /tarifs.
  const tInvest = await getTranslations("DirectInvestment");

  // Quatre paniers représentatifs du gradient de risque (§2H CLAUDE.md entrée #27) —
  // pas les six, pour rester une vitrine courte : la page dédiée liste les six.
  const INVESTMENT_BASKETS = [
    "rwa",
    "stocksConservative",
    "stocksTechAi",
    "stocksMomentum",
  ] as const;

  const STATS = [
    { icon: Percent, value: "350%", label: t("stats.ratio") },
    { icon: ShieldCheck, value: t("stats.custodyValue"), label: t("stats.custodyLabel") },
    { icon: UserCheck, value: t("stats.kycValue"), label: t("stats.kycLabel") },
  ] as const;

  // Chaque carte renvoie vers une page dédiée (cf. SiteNav pour le menu, ces mêmes pages
  // pour le contenu complet) — l'accueil garde un aperçu court plutôt que de tout dérouler
  // en une seule page.
  const SECTION_TEASERS = [
    { icon: Wallet, title: t("teasers.howItWorks.title"), description: t("teasers.howItWorks.description"), href: "/comment-ca-marche" },
    { icon: Sparkles, title: t("teasers.yield.title"), description: t("teasers.yield.description"), href: "/rendement" },
    { icon: Layers, title: t("teasers.rwa.title"), description: t("teasers.rwa.description"), href: "/strategie-rwa" },
    { icon: TrendingUp, title: t("teasers.market.title"), description: t("teasers.market.description"), href: "/marche" },
    // Troisième produit de la plateforme (§2H CLAUDE.md) — même traitement que les
    // autres cartes ci-dessus : un aperçu court renvoyant vers sa propre page dédiée.
    { icon: LineChart, title: t("teasers.investment.title"), description: t("teasers.investment.description"), href: "/investissement-direct" },
  ] as const;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />

      <section className="relative overflow-hidden bg-slate-950">
        <Image
          src="/brand/homepage-vault-bg.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-slate-950/50" />
        <div className="absolute inset-0 z-0 bg-gradient-to-t from-slate-950/70 via-transparent to-slate-950/30" />
        <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-28">
          {/* Gauche : accroche + CTA, sur le fond photo réel du coffre-fort. Droite :
              preuve en direct (axe clé de la plateforme, cf. YieldAssetGrid), toujours en
              carte claire — côte à côte dès le premier écran, plutôt qu'en dessous, pour
              une visibilité maximale. */}
          <div className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-slate-200 backdrop-blur-sm">
              {t("badge")}
            </span>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {t("titleLine1")}{" "}
              <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-fuchsia-500 bg-clip-text text-transparent">
                {t("titleHighlight")}
              </span>
              .
            </h1>
            <p className="max-w-lg text-lg text-slate-300">{t("subtitle")}</p>

            <div className="relative flex flex-col items-center gap-3 rounded-2xl border border-amber-200/60 bg-gradient-to-br from-white via-amber-50/60 to-orange-50/60 px-8 py-5 shadow-2xl shadow-black/40 lg:items-start">
              <div className="flex items-baseline gap-2">
                <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-fuchsia-600 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent">
                  350%
                </span>
                <span className="text-sm font-medium text-slate-600">{t("statCardCaption")}</span>
              </div>
              <div className="flex items-center gap-2">
                <AssetLogoRow currencies={["XAUT", "PAXG", "KAG"]} variant="bare" />
                <span className="text-xs font-medium text-slate-500">{t("statCardAssets")}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Link
                href="/login"
                className="group flex items-center gap-2 rounded-lg bg-gradient-to-br from-cyan-400 to-fuchsia-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
              >
                {t("ctaLogin")}
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/comment-ca-marche"
                className="rounded-lg border border-white/15 bg-white/10 px-5 py-3 text-sm font-medium text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-white/15"
              >
                {t("ctaHowItWorks")}
              </Link>
            </div>
            <Link
              href="/demande-de-compte"
              className="text-sm text-slate-300 underline underline-offset-2 hover:text-white"
            >
              {t("ctaNoAccount")}
            </Link>
          </div>

          <YieldAssetGrid />
        </div>
      </section>

      {/* Deuxième hero, même poids visuel que celui du crédit gagé ci-dessus (demande
          explicite du client : mettre l'investissement en avant comme le crédit) —
          identité de couleur distincte (émeraude plutôt qu'ambre/coffre-fort) pour ne
          jamais laisser croire qu'il s'agit du même produit, cf. §2H CLAUDE.md pour le
          détail du produit lui-même. */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-slate-950 to-slate-950">
        <div className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_15%_20%,rgba(16,185,129,0.16),transparent_55%),radial-gradient(circle_at_85%_70%,rgba(45,212,191,0.12),transparent_55%)]" />
        <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-24">
          <div className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
            <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200 backdrop-blur-sm">
              {t("investmentHero.badge")}
            </span>
            <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {t("investmentHero.titleLine1")}{" "}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                {t("investmentHero.titleHighlight")}
              </span>
              .
            </h2>
            <p className="max-w-lg text-lg text-slate-300">{t("investmentHero.subtitle")}</p>

            <div className="relative flex flex-col items-center gap-2 rounded-2xl border border-emerald-200/30 bg-gradient-to-br from-white via-emerald-50/60 to-teal-50/60 px-8 py-5 shadow-2xl shadow-black/40 lg:items-start">
              <div className="flex items-baseline gap-2">
                <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent">
                  {t("investmentHero.statValue")}
                </span>
                <span className="text-sm font-medium text-slate-600">{t("investmentHero.statCaption")}</span>
              </div>
              <span className="text-xs font-medium text-slate-500">{t("investmentHero.statDisclaimer")}</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Link
                href="/login"
                className="group flex items-center gap-2 rounded-lg bg-gradient-to-br from-cyan-400 to-fuchsia-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
              >
                {t("ctaLogin")}
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/investissement-direct"
                className="rounded-lg border border-white/15 bg-white/10 px-5 py-3 text-sm font-medium text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-white/15"
              >
                {t("investmentHero.ctaDiscover")}
              </Link>
            </div>
          </div>

          <div className="flex h-full flex-col rounded-3xl bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-white p-6 shadow-[0_8px_30px_-12px_rgba(16,185,129,0.25)] sm:p-7">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-medium text-emerald-800">
              <LineChart className="size-3.5" />
              {t("investmentHero.basketsBadge")}
            </span>
            <h3 className="mt-3 text-xl font-semibold text-slate-900 sm:text-2xl">{t("investmentHero.basketsTitle")}</h3>
            <p className="mt-2 text-sm text-slate-600">{t("investmentHero.basketsSubtitle")}</p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {INVESTMENT_BASKETS.map((key) => (
                <div
                  key={key}
                  className="flex flex-col gap-1.5 rounded-2xl border border-emerald-200/70 bg-white p-3.5 shadow-sm transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-lg"
                >
                  <span className="text-xs font-medium text-slate-500">{tInvest(`baskets.${key}.title`)}</span>
                  <span className="text-sm font-semibold text-slate-900">{tInvest(`baskets.${key}.rate`)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-semibold text-foreground">{t("discoverTitle")}</h2>
          <p className="mt-2 text-muted-foreground">{t("discoverDescription")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {SECTION_TEASERS.map((teaser) => (
            <SectionTeaserCard key={teaser.href} {...teaser} />
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
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
          href="/demande-de-compte"
          className="group mt-5 inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-cyan-400 to-fuchsia-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
        >
          {t("closingCta")}
          <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
        </Link>
      </section>

      <SiteFooter />
    </div>
  );
}
