import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Content-Security-Policy — composée et testée en direct (navigateur, console sans
// violation) sur la vitrine, le dashboard (logos d'actifs CoinMarketCap, cf.
// market-view.tsx/asset-picker.tsx/yield-*.tsx) et les paramètres 2FA back-office (QR code
// en data: URI, cf. two-factor-settings.tsx) plutôt qu'ajoutée à l'aveugle.
// script-src garde 'unsafe-eval' seulement en dev (requis par le HMR webpack de
// `next dev`, absent du build de production) et 'unsafe-inline' des deux côtés — Next.js
// n'utilise pas encore de nonce par requête ici ; à resserrer si ce besoin disparaît.
function buildContentSecurityPolicy(): string {
  const isDev = process.env.NODE_ENV !== "production";
  let apiOrigin = "http://localhost:3000";
  try {
    apiOrigin = new URL(process.env.NEXT_PUBLIC_API_URL ?? apiOrigin).origin;
  } catch {
    // NEXT_PUBLIC_API_URL mal formée : on garde le repli localhost plutôt que de faire
    // planter le build pour une CSP, qui reste une défense en profondeur.
  }

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    `connect-src 'self' ${apiOrigin}`,
    // blob: — prévisualisation du dossier KYC régénéré en PDF avant inscription (cf. §6
    // CLAUDE.md entrée #41, InviteSignupWizard) : le PDF binaire reçu de l'API est
    // affiché via URL.createObjectURL dans un <iframe>, jamais une URL distante — sans
    // cette directive explicite, default-src bloque le chargement (violation constatée en
    // direct : "Framing ... violates ... default-src 'self'").
    "frame-src 'self' blob:",
    // s2.coinmarketcap.com : logos d'actifs (MarketDataService), seule image externe
    // réellement chargée par le frontend. data: pour le QR code TOTP (généré en mémoire,
    // jamais servi par une URL) et les icônes inline.
    "img-src 'self' data: https://s2.coinmarketcap.com",
    "font-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  ].join("; ");
}

// En-têtes de sécurité de base, appliqués à toutes les routes de la vitrine/dashboard
// Next.js (le back-office NestJS a les siens via helmet, cf. backend/src/main.ts).
const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: buildContentSecurityPolicy() },
  // Empêche un navigateur de "deviner" un type MIME différent du Content-Type déclaré
  // (protection contre certaines attaques XSS par confusion de type).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Interdit d'intégrer le site dans une <iframe> tierce (protection anti-clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // N'envoie l'URL complète comme referrer que vers la même origine ; une origine tierce
  // ne reçoit que le domaine, jamais le chemin (qui peut contenir un identifiant de compte).
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Désactive l'accès aux capteurs sensibles du navigateur : aucune fonctionnalité de
  // cette plateforme n'en a besoin.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  // Retire l'en-tête "X-Powered-By: Next.js" (évite d'annoncer gratuitement la stack
  // technique à un attaquant qui scanne le site).
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

// Vitrine publique multilingue (/[locale]/...) — cf. i18n/routing.ts pour la liste des
// langues et i18n/request.ts pour le chargement des messages. L'espace client (/dashboard)
// et le back-office (/admin) restent hors de ce plugin, donc uniquement en français : ce
// sont des routes internes à un compte déjà ouvert, pas la "vitrine visiteur".
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);
