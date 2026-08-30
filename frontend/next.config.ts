import type { NextConfig } from "next";

// En-têtes de sécurité de base, appliqués à toutes les routes de la vitrine/dashboard
// Next.js (le back-office NestJS a les siens via helmet, cf. backend/src/main.ts).
// Pas de Content-Security-Policy ici : la CSP dépend fortement des sources externes
// réellement utilisées (CoinGecko pour les logos d'actifs, cf. market-view.tsx) et une
// CSP mal calibrée casse silencieusement des fonctionnalités — à composer et tester
// explicitement plutôt qu'ajoutée à l'aveugle.
const SECURITY_HEADERS = [
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

export default nextConfig;
