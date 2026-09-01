import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { LegalField, LegalPageShell, LegalSection } from "@/components/marketing/legal-page-shell";
import { ENTITY_IDENTITY } from "@/lib/entity-identity";
import { buildPageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "LegalNotice.meta" });
  return buildPageMetadata({ locale, path: "/mentions-legales", title: t("title"), description: t("description") });
}

// Page de mentions légales (impressum) — identité de l'éditeur, statut réglementaire réel
// (gestionnaire de fortune indépendant, PAS une banque) et supervision, hébergement,
// propriété intellectuelle. Tous les champs viennent de lib/entity-identity.ts.
export default async function MentionsLegalesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("LegalNotice");

  return (
    <LegalPageShell title={t("title")} intro={t("intro")}>
      <LegalSection title={t("s1.title")}>
        <dl className="space-y-2">
          <LegalField label={t("s1.companyName")} value={ENTITY_IDENTITY.legalName} />
          <LegalField label={t("s1.legalForm")} value={ENTITY_IDENTITY.legalForm} />
          <LegalField label={t("s1.tradingName")} value={ENTITY_IDENTITY.tradingName} />
          <LegalField label={t("s1.registeredOffice")} value={ENTITY_IDENTITY.registeredOffice} />
          <LegalField label={t("s1.postalAddress")} value={ENTITY_IDENTITY.postalAddress} />
          <LegalField label={t("s1.canton")} value={ENTITY_IDENTITY.canton} />
          <LegalField label={t("s1.country")} value={ENTITY_IDENTITY.country} />
          <LegalField label={t("s1.registerNumber")} value={ENTITY_IDENTITY.commercialRegisterNumber} />
          <LegalField label={t("s1.vatNumber")} value={ENTITY_IDENTITY.vatNumber} />
          <LegalField label={t("s1.publicationDirector")} value={ENTITY_IDENTITY.publicationDirector} />
        </dl>
      </LegalSection>

      <LegalSection title={t("s2.title")}>
        <p>
          {t.rich("s2.body", {
            legalName: ENTITY_IDENTITY.legalName,
            supervisoryAuthority: ENTITY_IDENTITY.supervisoryAuthority,
            b: (chunks) => <strong className="font-semibold text-foreground">{chunks}</strong>,
          })}
        </p>
        <dl className="space-y-2">
          <LegalField label={t("s2.supervisionBody")} value={ENTITY_IDENTITY.supervisionBodyName} />
          <LegalField label={t("s2.amlBody")} value={ENTITY_IDENTITY.amlBodyName} />
        </dl>
        <p>{ENTITY_IDENTITY.supervisionBodyDescription}.</p>
        <p>
          {t.rich("s2.footer", {
            link: (chunks) => (
              <Link href="/reglementation" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </LegalSection>

      <LegalSection title={t("s3.title")}>
        <p>{ENTITY_IDENTITY.depositaryNote}</p>
        <p>{ENTITY_IDENTITY.digitalAssetCustodyNote}</p>
        <p>{ENTITY_IDENTITY.depositProtectionNote}</p>
      </LegalSection>

      <LegalSection title={t("s4.title")}>
        <p>{t("s4.body", { tradingName: ENTITY_IDENTITY.tradingName, legalName: ENTITY_IDENTITY.legalName })}</p>
      </LegalSection>

      <LegalSection title={t("s5.title")}>
        <dl className="space-y-2">
          <LegalField label={t("s5.email")} value={ENTITY_IDENTITY.generalContactEmail} />
          <LegalField label={t("s5.phone")} value={ENTITY_IDENTITY.generalContactPhone} />
        </dl>
      </LegalSection>

      <LegalSection title={t("s6.title")}>
        <p>{t("s6.body")}</p>
        <p className="font-medium text-foreground/80">{ENTITY_IDENTITY.hostingProvider}</p>
      </LegalSection>

      <LegalSection title={t("s7.title")}>
        <p>{t("s7.body", { legalName: ENTITY_IDENTITY.legalName })}</p>
      </LegalSection>

      <LegalSection title={t("s8.title")}>
        <p>
          {t.rich("s8.body", {
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
