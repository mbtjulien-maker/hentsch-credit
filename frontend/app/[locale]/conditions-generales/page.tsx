import type { ReactNode } from "react";
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
  const t = await getTranslations({ locale, namespace: "Terms.meta" });
  return buildPageMetadata({ locale, path: "/conditions-generales", title: t("title"), description: t("description") });
}

const bold = (chunks: ReactNode) => <strong className="font-semibold text-foreground">{chunks}</strong>;

// Conditions générales d'utilisation (CGU) du service de crédit crypto-collatéralisé.
// Le contenu métier (ratio 350%, non-rétroactivité, blocage du gage, etc.) reflète les
// règles réellement implémentées par la plateforme (cf. CLAUDE.md §2 et CreditEngineService).
// L'exploitant (ENTITY_IDENTITY) est un gestionnaire de fortune indépendant (GFI), pas une
// banque : les avoirs ne sont jamais conservés en son nom propre, cf. section 5. À faire
// valider par la conformité/juridique avant publication.
export default async function ConditionsGeneralesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Terms");

  return (
    <LegalPageShell title={t("title")} intro={t("intro")}>
      <LegalSection title={t("s1.title")}>
        <p>{t("s1.body", { tradingName: ENTITY_IDENTITY.tradingName, legalName: ENTITY_IDENTITY.legalName })}</p>
      </LegalSection>

      <LegalSection title={t("s2.title")}>
        <p>{t("s2.body", { legalName: ENTITY_IDENTITY.legalName })}</p>
      </LegalSection>

      <LegalSection title={t("s3.title")}>
        <p>{t("s3.body")}</p>
      </LegalSection>

      <LegalSection title={t("s4.title")}>
        <p>{t.rich("s4.body1", { b: bold })}</p>
        <p className="rounded-lg bg-muted px-3 py-2 font-mono text-xs text-foreground/80">{t("s4.formula")}</p>
        <p>{t("s4.body2")}</p>
        <p>{t("s4.body3")}</p>
        <p>{t("s4.body4")}</p>
      </LegalSection>

      <LegalSection title={t("s5.title")}>
        <p>{ENTITY_IDENTITY.depositaryNote}</p>
        <p>{ENTITY_IDENTITY.digitalAssetCustodyNote}</p>
        <p>{ENTITY_IDENTITY.depositProtectionNote}</p>
      </LegalSection>

      <LegalSection title={t("s6.title")}>
        <p>{t("s6.body")}</p>
      </LegalSection>

      <LegalSection title={t("s7.title")}>
        <p>{t("s7.intro")}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t.rich("s7.item1", { b: bold })}</li>
          <li>{t.rich("s7.item2", { b: bold })}</li>
        </ul>
        <p>{t("s7.body")}</p>
      </LegalSection>

      <LegalSection title={t("s8.title")}>
        <p>{t("s8.body")}</p>
      </LegalSection>

      <LegalSection title={t("s9.title")}>
        <p>{t("s9.body")}</p>
      </LegalSection>

      <LegalSection title={t("s10.title")}>
        <p>
          {t.rich("s10.body", {
            b: bold,
            link: (chunks) => (
              <Link href="/tarifs" className="font-medium text-foreground underline underline-offset-2">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </LegalSection>

      <LegalSection title={t("s11.title")}>
        <p>{t("s11.intro")}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t("s11.item1")}</li>
          <li>{t("s11.item2")}</li>
          <li>{t("s11.item3")}</li>
          <li>{t("s11.item4")}</li>
        </ul>
        <p>{t("s11.body")}</p>
      </LegalSection>

      {/* Investissement direct (§2H CLAUDE.md) — troisième produit, distinct du crédit
          gagé (section 4) et du crédit direct : un placement réel, pas un emprunt.
          Placée juste après la section Risques (générale, orientée gage crypto) pour
          couvrir le risque spécifique de ce produit (perte réelle sur capital placé). */}
      <LegalSection title={t("s16.title")}>
        <p>{t("s16.intro")}</p>
        <p>{t("s16.body1")}</p>
        <p>{t("s16.body2")}</p>
        <p>{t("s16.body3")}</p>
      </LegalSection>

      <LegalSection title={t("s12.title")}>
        <p>{t("s12.body")}</p>
      </LegalSection>

      <LegalSection title={t("s13.title")}>
        <p>{t("s13.body")}</p>
      </LegalSection>

      <LegalSection title={t("s14.title")}>
        <p>{t("s14.body")}</p>
      </LegalSection>

      <LegalSection title={t("s15.title")}>
        <p>{t("s15.body", { jurisdiction: ENTITY_IDENTITY.jurisdiction })}</p>
      </LegalSection>
    </LegalPageShell>
  );
}
