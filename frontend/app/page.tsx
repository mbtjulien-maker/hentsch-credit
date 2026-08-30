import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Layers,
  Percent,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Wallet,
} from "lucide-react";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { AssetLogoRow } from "@/components/marketing/asset-logo-row";
import { YieldAssetGrid } from "@/components/marketing/yield-assets-showcase";
import { SectionTeaserCard } from "@/components/marketing/section-teaser-card";

export const metadata = {
  title: "Hentsch Credit · Crédit crypto-collatéralisé",
  description:
    "350% du montant mis en gage débloqué en pouvoir d'achat immédiat. Or, argent et ETH génèrent un rendement réel qui rembourse automatiquement une partie de votre crédit.",
};

const STATS = [
  { icon: Percent, value: "350%", label: "Ratio de crédit sur le gage déposé" },
  { icon: ShieldCheck, value: "Garde via dépositaires agréés", label: "Avoirs déposés auprès d'établissements tiers agréés, jamais en nom propre" },
  { icon: UserCheck, value: "KYC vérifié", label: "Accès au crédit réservé aux clients vérifiés" },
] as const;

// Chaque carte renvoie vers une page dédiée (cf. SiteNav pour le menu, ces mêmes pages
// pour le contenu complet) — l'accueil garde un aperçu court plutôt que de tout dérouler
// en une seule page.
const SECTION_TEASERS = [
  {
    icon: Wallet,
    title: "Comment ça marche",
    description: "Du dépôt de garantie à la dépense, en quatre étapes.",
    href: "/comment-ca-marche",
  },
  {
    icon: Sparkles,
    title: "Rendement du gage",
    description: "Or, argent et ETH remboursent jusqu'à 60% de votre crédit, automatiquement.",
    href: "/rendement",
  },
  {
    icon: Layers,
    title: "Stratégie d'investissement RWA",
    description: "Métaux industriels tokenisés : notre stratégie de trésorerie, en toute transparence.",
    href: "/strategie-rwa",
  },
  {
    icon: TrendingUp,
    title: "Le marché en direct",
    description: "Les cours des actifs acceptés en garantie, en temps réel.",
    href: "/marche",
  },
] as const;

// Vitrine publique de la plateforme — "/" ; distincte de l'espace client connecté qui vit
// désormais sous "/dashboard" (cf. app/dashboard/layout.tsx). Ne garde que le hero et un
// aperçu court de chaque section : le détail de chacune vit sur sa propre page (cf.
// SECTION_TEASERS et /demande-de-compte) — un vrai site à plusieurs pages plutôt qu'un
// unique long scroll, avec un menu dans SiteNav pour y accéder depuis n'importe où.
export default function LandingPage() {
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
              Gestion de fortune régulée · Accès réservé, sur invitation
            </span>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Votre or et votre argent{" "}
              <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-fuchsia-500 bg-clip-text text-transparent">
                ne dorment plus
              </span>
              .
            </h1>
            <p className="max-w-lg text-lg text-slate-300">
              Déposez-les en garantie, sans jamais les vendre. Débloquez du pouvoir d&apos;achat
              immédiat, remboursé automatiquement grâce à leur performance.
            </p>

            <div className="relative flex flex-col items-center gap-3 rounded-2xl border border-amber-200/60 bg-gradient-to-br from-white via-amber-50/60 to-orange-50/60 px-8 py-5 shadow-2xl shadow-black/40 lg:items-start">
              <div className="flex items-baseline gap-2">
                <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-fuchsia-600 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent">
                  350%
                </span>
                <span className="text-sm font-medium text-slate-600">de pouvoir d&apos;achat, dès le dépôt</span>
              </div>
              <div className="flex items-center gap-2">
                <AssetLogoRow currencies={["XAUT", "PAXG", "KAG"]} variant="bare" />
                <span className="text-xs font-medium text-slate-500">Or &amp; argent tokenisés</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Link
                href="/login"
                className="group flex items-center gap-2 rounded-lg bg-gradient-to-br from-cyan-400 to-fuchsia-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
              >
                Accéder à mon compte
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/comment-ca-marche"
                className="rounded-lg border border-white/15 bg-white/10 px-5 py-3 text-sm font-medium text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-white/15"
              >
                Comment ça marche
              </Link>
            </div>
            <Link
              href="/demande-de-compte"
              className="text-sm text-slate-300 underline underline-offset-2 hover:text-white"
            >
              Pas encore de compte ? Demander l&apos;ouverture d&apos;un compte
            </Link>
          </div>

          <YieldAssetGrid />
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-semibold text-foreground">Découvrir la plateforme</h2>
          <p className="mt-2 text-muted-foreground">Le détail de chaque mécanisme, sur sa propre page.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <h2 className="text-2xl font-semibold text-foreground">Prêt à débloquer votre pouvoir d&apos;achat ?</h2>
        <p className="mt-2 text-muted-foreground">
          Plateforme réservée à une clientèle restreinte. Notre équipe étudie chaque dossier avant
          d&apos;accorder l&apos;accès.
        </p>
        <Link
          href="/demande-de-compte"
          className="group mt-5 inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-cyan-400 to-fuchsia-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
        >
          Demander l&apos;ouverture d&apos;un compte
          <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
        </Link>
      </section>

      <SiteFooter />
    </div>
  );
}
