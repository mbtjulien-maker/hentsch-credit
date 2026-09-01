import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { LegalPageShell, LegalSection } from "@/components/marketing/legal-page-shell";
import { ENTITY_IDENTITY } from "@/lib/entity-identity";
import { buildPageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Cookies.meta" });
  return buildPageMetadata({ locale, path: "/cookies", title: t("title"), description: t("description") });
}

// Politique de cookies dédiée, en complément de la section 8 (courte) de la page
// Confidentialité. Honnête sur l'absence de bandeau de préférences : puisque la plateforme
// ne dépose qu'un seul cookie strictement nécessaire, il n'y a rien à faire consentir ni à
// gérer via un centre de préférences, ce qui évite de construire un faux bouton "gérer mes
// cookies" qui n'aurait rien à piloter.
export default async function CookiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Cookies");

  return (
    <LegalPageShell title={t("title")} intro={t("intro")}>
      <LegalSection title={t("s1.title")}>
        <p>{t("s1.body")}</p>
      </LegalSection>

      <LegalSection title={t("s2.title")}>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t("s2.item1")}</li>
          <li>{t("s2.item2")}</li>
          <li>{t("s2.item3")}</li>
          <li>{t("s2.item4")}</li>
        </ul>
      </LegalSection>

      <LegalSection title={t("s3.title")}>
        <p>{t("s3.body")}</p>
      </LegalSection>

      <LegalSection title={t("s4.title")}>
        <p>{t("s4.body")}</p>
      </LegalSection>

      <LegalSection title={t("s5.title")}>
        <p>
          {t.rich("s5.body", {
            dpo: ENTITY_IDENTITY.dataProtectionContact,
            link: (chunks) => (
              <Link href="/confidentialite" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
