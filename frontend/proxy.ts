// Convention "proxy" (Next.js 16 — remplace l'ancien "middleware", cf.
// node_modules/next/dist/docs/.../proxy.md, section "Migration to Proxy") : même rôle
// (négociation/routage de langue), juste un nom de fichier et de fonction renommés.
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Exclut /dashboard et /admin (hors périmètre i18n, cf. i18n/routing.ts), l'API interne
  // Next.js, les fichiers statiques et les routes spéciales (sitemap/robots/icônes) — ce
  // proxy ne doit tourner que sur les pages de la vitrine publique.
  matcher: [
    "/((?!api|dashboard|admin|_next|_vercel|.*\\..*).*)",
  ],
};
