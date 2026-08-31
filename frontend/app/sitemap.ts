import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getPathname } from "@/i18n/navigation";

// Liste maintenue à la main plutôt que générée par scan du système de fichiers : garde
// une trace explicite de ce qui est volontairement public (cf. app/[locale]/plan-du-site,
// qui liste exactement ces mêmes routes pour les visiteurs). /dashboard/* et /admin/*
// sont exclus (cf. robots.ts) : pages authentifiées, aucun intérêt à les faire indexer.
// /login est volontairement absent : page fonctionnelle, pas un contenu à faire remonter
// dans une recherche.
const PUBLIC_ROUTES = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/comment-ca-marche", priority: 0.8, changeFrequency: "monthly" },
  { path: "/rendement", priority: 0.8, changeFrequency: "monthly" },
  { path: "/strategie-rwa", priority: 0.7, changeFrequency: "monthly" },
  { path: "/marche", priority: 0.6, changeFrequency: "daily" },
  { path: "/tarifs", priority: 0.8, changeFrequency: "monthly" },
  { path: "/demande-de-compte", priority: 0.9, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.5, changeFrequency: "yearly" },
  { path: "/faq", priority: 0.6, changeFrequency: "monthly" },
  { path: "/plan-du-site", priority: 0.3, changeFrequency: "monthly" },
  { path: "/accessibilite", priority: 0.2, changeFrequency: "yearly" },
  { path: "/archives", priority: 0.3, changeFrequency: "monthly" },
  { path: "/gestion-des-risques", priority: 0.5, changeFrequency: "monthly" },
  { path: "/cookies", priority: 0.2, changeFrequency: "yearly" },
  { path: "/confidentialite", priority: 0.3, changeFrequency: "yearly" },
  { path: "/mentions-legales", priority: 0.3, changeFrequency: "yearly" },
  { path: "/conditions-generales", priority: 0.3, changeFrequency: "yearly" },
  { path: "/reglementation", priority: 0.3, changeFrequency: "yearly" },
] as const;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";

// Une entrée par route × par langue, avec les 7 versions linguistiques croisées en
// hreflang (alternates.languages) sur chaque entrée — le français reste sans préfixe
// (localePrefix: "as-needed", cf. i18n/routing.ts), les 6 autres langues sous /en, /es...
// getPathname() résout ce préfixage à la place d'une concaténation manuelle.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PUBLIC_ROUTES.flatMap((route) =>
    routing.locales.map((locale) => ({
      url: `${SITE_URL}${getPathname({ locale, href: route.path })}`,
      lastModified,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((altLocale) => [
            altLocale,
            `${SITE_URL}${getPathname({ locale: altLocale, href: route.path })}`,
          ]),
        ),
      },
    })),
  );
}
