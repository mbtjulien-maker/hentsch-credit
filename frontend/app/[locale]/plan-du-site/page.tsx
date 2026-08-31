import {
  BookText,
  Compass,
  FileText,
  LifeBuoy,
  LockKeyhole,
  UserPlus,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Sitemap.meta" });
  return { title: t("title"), description: t("description") };
}

// Plan du site PUBLIC — distinct de l'artefact interne "Plan du Site Hentsch Credit" (qui
// couvre aussi l'espace client connecté et le back-office admin, à usage interne/audit).
// Celui-ci ne liste que les pages réellement accessibles sans authentification, dans le
// même esprit que le principe déjà appliqué à la sidebar cliente (isAdmin && ...) : ne
// montrer que ce qui est réellement disponible au visiteur.
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
      ],
    },
    {
      icon: UserPlus,
      title: t("groups.account.title"),
      links: [
        { href: "/demande-de-compte", label: t("links.requestAccount") },
        { href: "/login", label: t("links.login") },
      ],
    },
    {
      icon: LifeBuoy,
      title: t("groups.help.title"),
      links: [
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
  ] as const;

  return (
    <MarketingPageShell eyebrow={t("eyebrow")} title={t("title")} description={t("description")}>
      <div className="mx-auto w-full max-w-4xl px-4 pb-10 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2">
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
