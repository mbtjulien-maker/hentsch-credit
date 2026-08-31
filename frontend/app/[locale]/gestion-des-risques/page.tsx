import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { LegalPageShell, LegalSection } from "@/components/marketing/legal-page-shell";
import { ENTITY_IDENTITY } from "@/lib/entity-identity";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "RiskManagement.meta" });
  return { title: t("title"), description: t("description") };
}

// Remplace, en toute honnêteté, les documents "Politique d'exécution" et "Rapport de
// meilleure sélection" d'un modèle de référence tiers (footer d'un courtier/gérant
// exécutant des ordres) : ces documents supposent une activité d'exécution d'ordres pour
// compte de tiers (MiFID / best execution) que H. Hentsch Asset Management SA n'exerce pas
// en tant que GFI opérant Hentsch Credit. Cette page décrit ce que la société fait
// réellement : garde des avoirs, valorisation du gage, mécanisme de liquidation, séparation
// du capital propre engagé dans la stratégie RWA. Aucune activité d'exécution d'ordres pour
// compte de tiers n'est revendiquée nulle part sur cette page.
export default async function GestionDesRisquesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("RiskManagement");

  return (
    <LegalPageShell title={t("title")} intro={t("intro")}>
      <LegalSection title={t("s1.title")}>
        <p>{t("s1.body", { legalName: ENTITY_IDENTITY.legalName })}</p>
      </LegalSection>

      <LegalSection title={t("s2.title")}>
        <p>{ENTITY_IDENTITY.depositaryNote}</p>
        <p>{ENTITY_IDENTITY.digitalAssetCustodyNote}</p>
        <p>
          {t.rich("s2.body", {
            link: (chunks) => (
              <Link href="/strategie-rwa" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </LegalSection>

      <LegalSection title={t("s3.title")}>
        <p>{t("s3.body")}</p>
      </LegalSection>

      <LegalSection title={t("s4.title")}>
        <p>
          {t.rich("s4.body", {
            yieldLink: (chunks) => (
              <Link href="/rendement" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
                {chunks}
              </Link>
            ),
            termsLink: (chunks) => (
              <Link href="/conditions-generales" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </LegalSection>

      <LegalSection title={t("s5.title")}>
        <p>{t("s5.body")}</p>
      </LegalSection>

      <LegalSection title={t("s6.title")}>
        <p>
          {t.rich("s6.body", {
            link: (chunks) => (
              <Link href="/archives" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
