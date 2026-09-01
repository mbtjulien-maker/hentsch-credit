// Convention "proxy" (Next.js 16 — remplace l'ancien "middleware", cf.
// node_modules/next/dist/docs/.../proxy.md, section "Migration to Proxy") : même rôle
// (négociation/routage de langue), juste un nom de fichier et de fonction renommés.
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Exclut /admin (seule zone hors périmètre i18n désormais — cf. décision produit de
  // traduire aussi l'espace client, /dashboard/**, en plus de la vitrine), l'API interne
  // Next.js, les fichiers statiques et les routes spéciales (sitemap/robots/icônes).
  matcher: [
    "/((?!api|admin|_next|_vercel|.*\\..*).*)",
  ],
};
