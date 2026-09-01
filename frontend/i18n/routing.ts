import { defineRouting } from "next-intl/routing";

// Langues de la vitrine publique ET de l'espace client (/dashboard, cf. décision produit
// de traduire aussi le tableau de bord — proxy.ts n'exclut plus que /admin, réservé au
// back-office interne et jamais traduit). Le français reste la langue de référence
// légale/contractuelle (cf. LegalDisclaimerNotice) : les autres langues sont des
// traductions de confort, jamais la version qui fait foi en cas de litige.
export const routing = defineRouting({
  locales: ["fr", "en", "es", "de", "pt", "nl", "sv"],
  defaultLocale: "fr",
  // /fr/tarifs n'existe pas : le français reste à la racine (/tarifs), seules les autres
  // langues portent un préfixe (/en/pricing... non, on garde les mêmes segments de route
  // pour toutes les langues, seul le contenu change — cf. décision produit : pas de
  // traduction des URLs elles-mêmes, seulement du contenu).
  localePrefix: "as-needed",
  // Désactive la détection automatique via l'en-tête Accept-Language (et le cookie
  // NEXT_LOCALE) sur les URL sans préfixe : "/" reste toujours la vitrine française,
  // jamais redirigé silencieusement vers la langue du navigateur. Choix produit délibéré
  // (clientèle suisse francophone en priorité) et corrige un vrai bug découvert via les
  // tests e2e : le navigateur Playwright envoie Accept-Language "en-US" par défaut, ce qui
  // faisait rediriger "/" vers "/en" dès la première visite et cassait tous les tests
  // écrits contre le contenu français. Le sélecteur de langue reste le seul moyen de
  // changer de langue ; le choix se fait alors via l'URL préfixée, pas via ce cookie.
  localeDetection: false,
});

export type AppLocale = (typeof routing.locales)[number];
