import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ENTITY_IDENTITY } from "@/lib/entity-identity";

// Pied de page en 4 colonnes thématiques, à l'image des grands sites financiers suisses :
// La plateforme / Aide & Contact / Documentation contractuelle / Données personnelles.
// Choix délibérés de contenu, pour rester honnête sur ce que la société fait réellement
// (cf. lib/entity-identity.ts) :
// - Pas de "Politique d'exécution" / "Rapport de meilleure sélection" (documents propres à
//   un courtier exécutant des ordres pour compte de tiers, activité que la société
//   n'exerce pas) : remplacés par "Gestion des risques et garde des avoirs".
// - Pas de "Gérer mes cookies" comme préférence center factice : un seul cookie
//   strictement nécessaire est déposé, donc rien à faire consentir (cf. /cookies §3).
export async function SiteFooter() {
  const t = await getTranslations("Footer");

  const FOOTER_COLUMNS = [
    {
      title: t("columns.help.title"),
      links: [
        { href: "/a-propos", label: t("columns.help.aboutUs") },
        { href: "/contact", label: t("columns.help.contact") },
        { href: "/faq", label: t("columns.help.faq") },
        { href: "/plan-du-site", label: t("columns.help.sitemap") },
        { href: "/accessibilite", label: t("columns.help.accessibility") },
        { href: "/archives", label: t("columns.help.archives") },
      ],
    },
    {
      title: t("columns.contractual.title"),
      links: [
        { href: "/conditions-generales", label: t("columns.contractual.terms") },
        { href: "/mentions-legales", label: t("columns.contractual.legalNotice") },
        { href: "/reglementation", label: t("columns.contractual.regulation") },
        { href: "/gestion-des-risques", label: t("columns.contractual.riskManagement") },
      ],
    },
    {
      title: t("columns.privacy.title"),
      links: [
        { href: "/confidentialite", label: t("columns.privacy.privacyPolicy") },
        { href: "/cookies", label: t("columns.privacy.cookiePolicy") },
      ],
    },
  ] as const;

  const MECHANISM_LINKS = [
    { href: "/comment-ca-marche", label: t("columns.platform.howItWorks") },
    { href: "/rendement", label: t("columns.platform.yield") },
    { href: "/strategie-rwa", label: t("columns.platform.rwaStrategy") },
    { href: "/marche", label: t("columns.platform.market") },
    { href: "/tarifs", label: t("columns.platform.pricing") },
    { href: "/investissement-direct", label: t("columns.platform.directInvestment") },
    { href: "/demande-de-compte", label: t("columns.platform.requestAccount") },
  ] as const;

  return (
    <footer className="border-t border-border/80 bg-card/60 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/60">
              {t("columns.platform.title")}
            </h3>
            <ul className="mt-3 space-y-2">
              {MECHANISM_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/60">
                {column.title}
              </h3>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-border/80 pt-6">
          <p className="mx-auto max-w-3xl text-center text-xs text-muted-foreground">
            {t("disclaimer", {
              tradingName: ENTITY_IDENTITY.tradingName,
              legalName: ENTITY_IDENTITY.legalName,
              supervisionBodyName: ENTITY_IDENTITY.supervisionBodyName,
              supervisoryAuthority: ENTITY_IDENTITY.supervisoryAuthority,
            })}
          </p>
          <p className="mt-3 text-center text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} {ENTITY_IDENTITY.legalName}. {t("rightsReserved")}
          </p>
        </div>
      </div>
    </footer>
  );
}
