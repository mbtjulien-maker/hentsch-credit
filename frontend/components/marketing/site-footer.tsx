import Link from "next/link";
import { ENTITY_IDENTITY } from "@/lib/entity-identity";

// Pied de page en 3 colonnes thématiques, à l'image des grands sites financiers suisses :
// Aide & Contact / Documentation contractuelle / Données personnelles. Remplace l'ancien
// pied de page à une seule rangée de liens (LEGAL_LINKS + SITE_LINKS mobile-only) — les
// liens de navigation vers les pages de mécanisme (comment ça marche, rendement...)
// restent disponibles via SiteNav sur desktop, et rejoignent ici la colonne "Aide &
// Contact" pour rester accessibles sur toutes les tailles d'écran sans dupliquer un menu
// mobile séparé.
//
// Choix délibérés de contenu, pour rester honnête sur ce que la société fait réellement
// (cf. lib/entity-identity.ts) :
// - Pas de "Politique d'exécution" / "Rapport de meilleure sélection" (documents propres à
//   un courtier exécutant des ordres pour compte de tiers, activité que la société
//   n'exerce pas) : remplacés par "Gestion des risques et garde des avoirs".
// - Pas de "Gérer mes cookies" comme préférence center factice : un seul cookie
//   strictement nécessaire est déposé, donc rien à faire consentir (cf. /cookies §3).
const FOOTER_COLUMNS = [
  {
    title: "Aide & Contact",
    links: [
      { href: "/contact", label: "Contactez-nous" },
      { href: "/faq", label: "Foire aux questions" },
      { href: "/plan-du-site", label: "Plan du site" },
      { href: "/accessibilite", label: "Accessibilité numérique" },
      { href: "/archives", label: "Archives" },
    ],
  },
  {
    title: "Documentation contractuelle",
    links: [
      { href: "/conditions-generales", label: "Conditions générales" },
      { href: "/mentions-legales", label: "Mentions légales" },
      { href: "/reglementation", label: "Réglementation" },
      { href: "/gestion-des-risques", label: "Gestion des risques et garde des avoirs" },
    ],
  },
  {
    title: "Données personnelles",
    links: [
      { href: "/confidentialite", label: "Politique de confidentialité" },
      { href: "/cookies", label: "Politique de cookies" },
    ],
  },
] as const;

// Pages de mécanisme autrefois affichées en pleine longueur sur "/" (cf. SiteNav — masquées
// en dessous de lg) : reprises ici pour rester accessibles sur mobile, dans une colonne à
// part plutôt que mélangées à l'aide/contact.
const MECHANISM_LINKS = [
  { href: "/comment-ca-marche", label: "Comment ça marche" },
  { href: "/rendement", label: "Rendement" },
  { href: "/strategie-rwa", label: "Stratégie RWA" },
  { href: "/marche", label: "Marché" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/demande-de-compte", label: "Demander un compte" },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-border/80 bg-card/60 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/60">
              La plateforme
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
          <p className="mx-auto max-w-3xl text-center text-xs text-muted-foreground/80">
            {ENTITY_IDENTITY.tradingName} est une offre de {ENTITY_IDENTITY.legalName}, gestionnaire
            de fortune indépendant de droit suisse, supervisé par {ENTITY_IDENTITY.supervisionBodyName}
            , organisme de surveillance agréé par l&apos;{ENTITY_IDENTITY.supervisoryAuthority}.
            Accès réservé à une clientèle restreinte, sur invitation. Cette plateforme n&apos;est pas
            ouverte au public.
          </p>
          <p className="mt-3 text-center text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} {ENTITY_IDENTITY.legalName}. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
