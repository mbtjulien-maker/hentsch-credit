import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { LegalField, LegalPageShell, LegalSection } from "@/components/marketing/legal-page-shell";
import { ENTITY_IDENTITY } from "@/lib/entity-identity";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Accessibility.meta" });
  return { title: t("title"), description: t("description") };
}

// Déclaration d'accessibilité honnête : le site n'a fait l'objet d'aucun audit RGAA/WCAG
// formel à ce stade, donc "conformité partielle, non auditée" plutôt qu'une conformité
// revendiquée sans preuve. Décrit ce qui est réellement en place (structure sémantique,
// contraste, navigation clavier de base) sans prétendre à un niveau de conformité précis.
export default async function AccessibilitePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Accessibility");

  return (
    <LegalPageShell title={t("title")} intro={t("intro")}>
      <LegalSection title={t("s1.title")}>
        <p>{t("s1.body")}</p>
      </LegalSection>

      <LegalSection title={t("s2.title")}>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t("s2.item1")}</li>
          <li>{t("s2.item2")}</li>
          <li>{t("s2.item3", { legalName: ENTITY_IDENTITY.legalName })}</li>
        </ul>
      </LegalSection>

      <LegalSection title={t("s3.title")}>
        <p>{t("s3.body")}</p>
        <dl className="space-y-2">
          <LegalField label={t("s3.email")} value={ENTITY_IDENTITY.generalContactEmail} />
          <LegalField label={t("s3.phone")} value={ENTITY_IDENTITY.generalContactPhone} />
        </dl>
      </LegalSection>

      <LegalSection title={t("s4.title")}>
        <p>
          {t.rich("s4.body", {
            link: (chunks) => (
              <Link href="/reglementation" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
