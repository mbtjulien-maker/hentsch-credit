import type { ReactNode } from "react";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { LocaleHtmlLangSync } from "@/components/locale-html-lang-sync";
import { JsonLd, organizationJsonLd } from "@/lib/seo";

// Layout imbriqué (pas de <html>/<body> ici — hérités de app/layout.tsx, partagé avec
// /dashboard et /admin) : ne fait que résoudre la langue et fournir les traductions à
// toute la vitrine publique (app/[locale]/**). generateStaticParams pré-rend les 7 langues
// au build plutôt qu'à la demande.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Fige la langue pour le rendu statique de cette requête (cf. doc next-intl) — sans ça,
  // les Server Components de la vitrine ne sauraient pas quelle langue utiliser lors du
  // pré-rendu statique de generateStaticParams ci-dessus.
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      {/* Un seul schéma Organization pour toute la vitrine publique (cf. lib/seo.ts) —
          décrit l'exploitant réel, jamais dupliqué par page. */}
      <JsonLd id="organization-jsonld" data={organizationJsonLd()} />
      <LocaleHtmlLangSync locale={locale} />
      {children}
    </NextIntlClientProvider>
  );
}
