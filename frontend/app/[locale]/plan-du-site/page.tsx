import {
  BookText,
  Compass,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  LockKeyhole,
  UserPlus,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { buildPageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Sitemap.meta" });
  return buildPageMetadata({ locale, path: "/plan-du-site", title: t("title"), description: t("description") });
}

// Plan du site PUBLIC — distinct de l'artefact interne "Plan du Site Hentsch Credit" (qui
// couvre en plus le back-office admin, à usage interne/audit). Celui-ci liste les pages
// visiteur (accessibles sans connexion) et les pages de l'espace client (cf.
// CLIENT_SECTIONS dans components/dashboard/sidebar.tsx), mais jamais le back-office
// (BACKOFFICE_SECTIONS dans ce même fichier : demandes-crédit, demandes-comptes, /admin)
// — même principe déjà appliqué à la sidebar cliente (isAdmin && ...) : ne montrer que ce
// qui concerne un visiteur ou un client, jamais la gestion interne.
export default async function PlanDuSitePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Sitemap");

  const GROUPS = [
    {
      icon: Compass,
      title: t("groups.discover.title"),
      links: [
        { href: "/", label: t("links.home") },
        { href: "/comment-ca-marche", label: t("links.howItWorks") },
        { href: "/rendement", label: t("links.yield") },
        { href: "/strategie-rwa", label: t("links.rwaStrategy") },
        { href: "/marche", label: t("links.market") },
        { href: "/tarifs", label: t("links.pricing") },
        { href: "/investissement-direct", label: t("links.directInvestment") },
      ],
    },
    {
      icon: UserPlus,
      title: t("groups.account.title"),
      links: [
        { href: "/inscription", label: t("links.requestAccount") },
        { href: "/login", label: t("links.login") },
      ],
    },
    {
      icon: LifeBuoy,
      title: t("groups.help.title"),
      links: [
        { href: "/a-propos", label: t("links.aboutUs") },
        { href: "/contact", label: t("links.contact") },
        { href: "/faq", label: t("links.faq") },
        { href: "/accessibilite", label: t("links.accessibility") },
        { href: "/archives", label: t("links.archives") },
        { href: "/plan-du-site", label: t("links.sitemap") },
      ],
    },
    {
      icon: FileText,
      title: t("groups.contractual.title"),
      links: [
        { href: "/conditions-generales", label: t("links.terms") },
        { href: "/mentions-legales", label: t("links.legalNotice") },
        { href: "/reglementation", label: t("links.regulation") },
        { href: "/gestion-des-risques", label: t("links.riskManagement") },
      ],
    },
    {
      icon: LockKeyhole,
      title: t("groups.privacy.title"),
      links: [
        { href: "/confidentialite", label: t("links.privacyPolicy") },
        { href: "/cookies", label: t("links.cookiePolicy") },
      ],
    },
    // Espace client (cf. CLIENT_SECTIONS dans sidebar.tsx) — /dashboard fait désormais
    // partie du routage par locale (proxy.ts ne l'exclut plus), donc même Link localisé
    // que les autres groupes ci-dessus ; jamais le back-office (BACKOFFICE_SECTIONS :
    // demandes-crédit, demandes-comptes, /admin), qui reste hors de ce plan public.
    {
      icon: LayoutDashboard,
      title: t("groups.client.title"),
      links: [
        { href: "/dashboard", label: t("clientLinks.home") },
        { href: "/dashboard/solde", label: t("clientLinks.balance") },
        { href: "/dashboard/marche", label: t("clientLinks.market") },
        { href: "/dashboard/credit", label: t("clientLinks.credit") },
        { href: "/dashboard/investissement", label: t("clientLinks.investment") },
        { href: "/dashboard/cartes", label: t("clientLinks.cards") },
        { href: "/dashboard/historique", label: t("clientLinks.history") },
        { href: "/dashboard/profil", label: t("clientLinks.profile") },
        { href: "/dashboard/support", label: t("clientLinks.support") },
      ],
    },
  ] as const;

  return (
    <MarketingPageShell eyebrow={t("eyebrow")} title={t("title")} description={t("description")}>
      <div className="mx-auto w-full max-w-4xl px-4 pb-10 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GROUPS.map((group) => (
            <div key={group.title} className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-fuchsia-600 text-white">
                  <group.icon className="size-4" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
              </div>
              <ul className="mt-3 space-y-1.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-border/80 bg-muted p-5">
          <BookText className="mt-0.5 size-4.5 shrink-0 text-muted-foreground/80" />
          <p className="text-sm leading-relaxed text-muted-foreground">{t("clientAreaNote")}</p>
        </div>
      </div>
    </MarketingPageShell>
  );
}
