import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";

// /dashboard et /admin sont déjà protégés par authentification (AuthGate/AdminAuthGate
// côté client, JwtAuthGuard/AdminGuard côté API) : ce disallow n'est pas une mesure de
// sécurité (un robot n'indexerait de toute façon qu'un écran de connexion vide), juste
// une hygiène normale pour ne pas faire apparaître de pages sans contenu utile dans les
// résultats de recherche.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/dashboard/*", "/admin", "/admin/*"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
