// Organisation de la navigation de la vitrine publique — SOURCE UNIQUE partagée par
// l'en-tête (SiteNav, menus déroulants + menu mobile) et le pied de page (SiteFooter),
// pour que les deux ne divergent plus (retour client : "les choses sont un peu trop
// mélangées"). Regroupée par intention du visiteur plutôt qu'une liste plate de pages :
// investir (produit phare : gestion de fortune), suivre les marchés/tarifs, le crédit
// (service secondaire), connaître l'entreprise.
//
// `labelKey` / `itemKey` pointent vers Nav.groups.* / Nav.links.* (cf. messages/*.json).
// Un groupe SANS `items` est un lien direct (`href`), affiché tel quel dans l'en-tête.
export type SiteNavItem = { href: string; itemKey: string };
export type SiteNavGroup = {
  id: string;
  labelKey: string;
  href?: string;
  items?: SiteNavItem[];
};

export const SITE_NAV: SiteNavGroup[] = [
  { id: "investment", labelKey: "investment", href: "/investissement-direct" },
  {
    id: "market",
    labelKey: "market",
    items: [
      { href: "/marche", itemKey: "marche" },
      { href: "/tarifs", itemKey: "tarifs" },
    ],
  },
  {
    id: "credit",
    labelKey: "credit",
    items: [
      { href: "/comment-ca-marche", itemKey: "commentCaMarche" },
      { href: "/rendement", itemKey: "rendement" },
      { href: "/strategie-rwa", itemKey: "strategieRwa" },
    ],
  },
  {
    id: "company",
    labelKey: "company",
    items: [
      { href: "/a-propos", itemKey: "aboutUs" },
      { href: "/contact", itemKey: "contact" },
      { href: "/faq", itemKey: "faq" },
    ],
  },
];

// Vrai si `pathname` correspond à la page du lien direct ou à l'une des pages du groupe.
export function isGroupActive(group: SiteNavGroup, pathname: string): boolean {
  if (group.href) return pathname === group.href;
  return (group.items ?? []).some((item) => pathname === item.href);
}
