import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

// Charge le fichier de messages de la langue résolue (cf. routing.ts) — un seul fichier
// JSON par langue (messages/{locale}.json), pas de découpage par page : le volume total
// reste raisonnable et un seul fichier par langue est plus simple à maintenir en
// cohérence (terminologie partagée entre pages, cf. glossaire en tête de messages/fr.json).
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
