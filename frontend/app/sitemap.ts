import type { MetadataRoute } from "next";

// Liste maintenue à la main plutôt que générée par scan du système de fichiers : garde
// une trace explicite de ce qui est volontairement public (cf. app/plan-du-site/page.tsx,
// qui liste exactement ces mêmes routes pour les visiteurs). /dashboard/* et /admin/*
// sont exclus (cf. robots.ts) : pages authentifiées, aucun intérêt à les faire indexer.
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

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
