import type { Metadata } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { ENTITY_IDENTITY } from "@/lib/entity-identity";

// URL publique du site — même source que app/layout.tsx et app/sitemap.ts (à garder
// synchronisée si l'une des trois change).
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";

const LOGO_URL = `${SITE_URL}/brand/hentsch-logo-full.png`;

// Codes de langue attendus par Open Graph (xx_YY, cf. spec Facebook), distincts des codes
// courts de next-intl (fr, en...) — une paire raisonnable par langue plutôt qu'un pays
// arbitraire, la vitrine n'ayant pas de déclinaison par pays au sein d'une même langue.
const OG_LOCALES: Record<string, string> = {
  fr: "fr_CH",
  en: "en_US",
  es: "es_ES",
  de: "de_DE",
  pt: "pt_PT",
  nl: "nl_NL",
  sv: "sv_SE",
};

// Construit les métadonnées d'une page publique traduite : titre/description (déjà
// traduits par l'appelant via getTranslations), URL canonique, hreflang vers les 7
// langues (complète les alternates du sitemap — cf. app/sitemap.ts — par les balises
// <link rel="alternate"> dans le <head> de chaque page, recommandées par Google en plus
// du sitemap) et Open Graph/Twitter par page (le layout racine ne fournit qu'un
// title/description génériques par défaut, jamais spécifiques à une page). `path` est le
// chemin non localisé tel que défini dans i18n/routing.ts (ex. "/tarifs"), jamais un
// chemin déjà préfixé.
export function buildPageMetadata({
  locale,
  path,
  title,
  description,
}: {
  locale: string;
  path: string;
  title: string;
  description: string;
}): Metadata {
  const canonicalPath = getPathname({ locale, href: path });
  const canonicalUrl = `${SITE_URL}${canonicalPath}`;
  const languages = Object.fromEntries(
    routing.locales.map((altLocale) => [
      altLocale,
      `${SITE_URL}${getPathname({ locale: altLocale, href: path })}`,
    ]),
  );

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: ENTITY_IDENTITY.tradingName,
      locale: OG_LOCALES[locale] ?? locale,
      type: "website",
      images: [{ url: LOGO_URL, width: 1200, height: 630, alt: ENTITY_IDENTITY.tradingName }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [LOGO_URL],
    },
  };
}

// Schéma Organization (schema.org), injecté une fois par LocaleLayout (cf.
// app/[locale]/layout.tsx) — décrit l'exploitant réel du site, pas un produit financier
// ni une offre au public (cf. accès restreint, ENTITY_IDENTITY). Champs tirés
// exclusivement de la fiche d'identité déjà utilisée par les mentions légales : aucune
// donnée inventée pour ce balisage.
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: ENTITY_IDENTITY.legalName,
    alternateName: ENTITY_IDENTITY.tradingName,
    url: SITE_URL,
    logo: LOGO_URL,
    email: ENTITY_IDENTITY.generalContactEmail,
    telephone: ENTITY_IDENTITY.generalContactPhone,
    address: {
      "@type": "PostalAddress",
      streetAddress: ENTITY_IDENTITY.registeredOffice,
      addressRegion: ENTITY_IDENTITY.canton,
      addressCountry: "CH",
    },
  };
}

// Schéma FAQPage (schema.org) — à construire par chaque page avec de vraies questions
// visibles (cf. /faq, /comment-ca-marche, /rendement, /strategie-rwa, /tarifs), à partir
// des MÊMES questions/réponses traduites que celles affichées à l'écran : Google exige
// une correspondance exacte avec le contenu visible, jamais un contenu parallèle inventé
// pour le balisage seul.
export function faqPageJsonLd(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

// Rendu d'un bloc JSON-LD — un seul endroit pour le `dangerouslySetInnerHTML`, avec le
// name qui sert de clé React (page multi-schémas type FAQPage + BreadcrumbList à terme).
export function JsonLd({ id, data }: { id: string; data: object }) {
  return (
    <script
      id={id}
      type="application/ld+json"
      // JSON.stringify d'un objet interne, jamais de HTML/texte utilisateur non échappé.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
