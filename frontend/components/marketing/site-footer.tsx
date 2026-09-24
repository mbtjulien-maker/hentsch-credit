import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ENTITY_IDENTITY } from "@/lib/entity-identity";
import { SITE_NAV } from "@/lib/site-navigation";

// Pied de page en 4 colonnes par intention du visiteur (retour client : "les choses sont un
// peu trop mélangées") : Crédit / Investir et marchés / Aide & Contact / Informations
// légales — les deux colonnes de documents juridiques (contractuels + données
// personnelles) sont fusionnées en une seule, et la colonne "La plateforme" qui mélangeait
// sept pages de natures différentes est éclatée selon le même découpage que l'en-tête
// (cf. lib/site-navigation.ts, source unique). Un bandeau d'accès en tête (compte existant /
// demande de compte) remplace le lien "Demander un compte" qui était noyé dans la liste.
// Choix délibérés de contenu, pour rester honnête sur ce que la société fait réellement
// (cf. lib/entity-identity.ts) :
// - Pas de "Politique d'exécution" / "Rapport de meilleure sélection" (documents propres à
//   un courtier exécutant des ordres pour compte de tiers, activité que la société
//   n'exerce pas) : remplacés par "Gestion des risques et garde des avoirs".
// - Pas de "Gérer mes cookies" comme préférence center factice : un seul cookie
//   strictement nécessaire est déposé, donc rien à faire consentir (cf. /cookies §3).
export async function SiteFooter() {
  const t = await getTranslations("Footer");
  const tNav = await getTranslations("Nav");

  const creditGroup = SITE_NAV.find((group) => group.id === "credit")!;

  const FOOTER_COLUMNS = [
    {
      title: tNav("groups.credit"),
      links: (creditGroup.items ?? []).map((item) => ({
        href: item.href,
        label: tNav(`links.${item.itemKey}`),
      })),
    },
    {
      title: t("columns.invest.title"),
      links: [
        { href: "/investissement-direct", label: t("columns.platform.directInvestment") },
        { href: "/marche", label: t("columns.platform.market") },
        { href: "/tarifs", label: t("columns.platform.pricing") },
      ],
    },
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
      title: t("columns.legal.title"),
      links: [
        { href: "/conditions-generales", label: t("columns.contractual.terms") },
        { href: "/mentions-legales", label: t("columns.contractual.legalNotice") },
        { href: "/reglementation", label: t("columns.contractual.regulation") },
        { href: "/gestion-des-risques", label: t("columns.contractual.riskManagement") },
        { href: "/confidentialite", label: t("columns.privacy.privacyPolicy") },
        { href: "/cookies", label: t("columns.privacy.cookiePolicy") },
      ],
    },
  ];

  return (
    <footer className="border-t border-border/80 bg-card/60 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 sm:px-6">
        <div className="flex flex-col gap-4 border-b border-border/80 pb-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-base font-semibold text-foreground">{ENTITY_IDENTITY.tradingName}</p>
            <p className="text-sm text-muted-foreground">{tNav("tagline")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/inscription"
              className="rounded-lg bg-gradient-to-br from-cyan-400 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
            >
              {t("columns.platform.requestAccount")}
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-border/80 bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              {tNav("connexionLong")}
            </Link>
          </div>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
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
