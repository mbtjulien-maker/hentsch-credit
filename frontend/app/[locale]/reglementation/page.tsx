import type { ReactNode } from "react";
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
  const t = await getTranslations({ locale, namespace: "Regulation.meta" });
  return { title: t("title"), description: t("description") };
}

const bold = (chunks: ReactNode) => <strong className="font-semibold text-foreground">{chunks}</strong>;

// Page dédiée au cadre réglementaire — complète les mentions légales (qui restent la
// référence pour l'identité de l'éditeur) avec le détail du cadre légal suisse applicable
// à un gestionnaire de fortune indépendant (GFI), à la garde d'actifs numériques et à la
// lutte contre le blanchiment. Contenu à valider par la conformité avant publication,
// notamment la classification de clientèle (section 4) et l'organe de médiation (section 6),
// laissés en placeholder tant que l'information officielle n'a pas été communiquée.
export default async function ReglementationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Regulation");

  return (
    <LegalPageShell title={t("title")} intro={t("intro")}>
      <LegalSection title={t("s1.title")}>
        <p>{t("s1.intro", { legalName: ENTITY_IDENTITY.legalName })}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t("s1.item1")}</li>
          <li>{t("s1.item2")}</li>
          <li>{t("s1.item3")}</li>
          <li>{t("s1.item4")}</li>
        </ul>
      </LegalSection>

      <LegalSection title={t("s2.title")}>
        <p>{t.rich("s2.body1", { legalName: ENTITY_IDENTITY.legalName, b: bold })}</p>
        <dl className="space-y-2">
          <LegalField label={t("s2.supervisionBody")} value={ENTITY_IDENTITY.supervisionBodyName} />
          <LegalField label={t("s2.supervisoryAuthority")} value={ENTITY_IDENTITY.supervisoryAuthority} />
          <LegalField label={t("s2.amlBody")} value={ENTITY_IDENTITY.amlBodyName} />
        </dl>
        <p>
          {t.rich("s2.body2", {
            link: (chunks) => (
              <Link href="/mentions-legales" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
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
        <p>
          {t.rich("s4.body", {
            tradingName: ENTITY_IDENTITY.tradingName,
            legalName: ENTITY_IDENTITY.legalName,
            classification: ENTITY_IDENTITY.clientClassification,
            b: bold,
          })}
        </p>
      </LegalSection>

      <LegalSection title={t("s5.title")}>
        <p>{t("s5.body", { legalName: ENTITY_IDENTITY.legalName })}</p>
      </LegalSection>

      <LegalSection title={t("s6.title")}>
        <p>
          {t.rich("s6.body", { legalName: ENTITY_IDENTITY.legalName, mediationBody: ENTITY_IDENTITY.mediationBody, b: bold })}
        </p>
      </LegalSection>

      <LegalSection title={t("s7.title")}>
        <dl className="space-y-2">
          <LegalField label={t("s7.email")} value={ENTITY_IDENTITY.generalContactEmail} />
          <LegalField label={t("s7.phone")} value={ENTITY_IDENTITY.generalContactPhone} />
        </dl>
      </LegalSection>
    </LegalPageShell>
  );
}
