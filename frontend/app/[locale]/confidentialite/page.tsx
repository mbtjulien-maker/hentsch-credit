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
  const t = await getTranslations({ locale, namespace: "Privacy.meta" });
  return buildPageMetadata({ locale, path: "/confidentialite", title: t("title"), description: t("description") });
}

// Politique de confidentialité — traitement des données personnelles au sens de la loi
// fédérale suisse sur la protection des données (nLPD) et, le cas échéant, du RGPD. Les
// sous-traitants listés reflètent les intégrations réellement prévues par la plateforme
// (cf. CLAUDE.md §3) — à confirmer/compléter selon les prestataires effectivement retenus
// en production.
export default async function ConfidentialitePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Privacy");

  return (
    <LegalPageShell title={t("title")} intro={t("intro")}>
      <LegalSection title={t("s1.title")}>
        <dl className="space-y-2">
          <LegalField label={t("s1.controller")} value={ENTITY_IDENTITY.legalName} />
          <LegalField label={t("s1.address")} value={ENTITY_IDENTITY.registeredOffice} />
          <LegalField label={t("s1.dpoContact")} value={ENTITY_IDENTITY.dataProtectionContact} />
        </dl>
        <p>{t("s1.compliance")}</p>
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
        <ul className="list-disc space-y-1 pl-5">
          <li>{t("s3.item1")}</li>
          <li>{t("s3.item2")}</li>
          <li>{t("s3.item3")}</li>
          <li>{t("s3.item4")}</li>
        </ul>
      </LegalSection>

      <LegalSection title={t("s4.title")}>
        <p>{t("s4.intro", { legalName: ENTITY_IDENTITY.legalName })}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <span className="font-medium text-foreground/80">{t("s4.item1Label")}</span> : {t("s4.item1Body")}
          </li>
          <li>
            <span className="font-medium text-foreground/80">
              {t("s4.item2Label", { custodians: ENTITY_IDENTITY.digitalAssetCustodians.join(" et ") })}
            </span>{" "}
            : {t("s4.item2Body")}
          </li>
          <li>
            <span className="font-medium text-foreground/80">{t("s4.item3Label")}</span> : {t("s4.item3Body")}
          </li>
          <li>
            <span className="font-medium text-foreground/80">{t("s4.item4Label")}</span> : {t("s4.item4Body")}
          </li>
          <li>
            <span className="font-medium text-foreground/80">{t("s4.item5Label")}</span> : {t("s4.item5Body")}
          </li>
        </ul>
        <p>{t("s4.outro")}</p>
      </LegalSection>

      <LegalSection title={t("s5.title")}>
        <p>{t("s5.body")}</p>
      </LegalSection>

      <LegalSection title={t("s6.title")}>
        <p>{t("s6.body", { legalName: ENTITY_IDENTITY.legalName })}</p>
      </LegalSection>

      <LegalSection title={t("s7.title")}>
        <p>{t("s7.body")}</p>
      </LegalSection>

      <LegalSection title={t("s8.title")}>
        <p>
          {t.rich("s8.body", {
            link: (chunks) => (
              <Link href="/cookies" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </LegalSection>

      <LegalSection title={t("s9.title")}>
        <p>{t("s9.body")}</p>
      </LegalSection>

      <LegalSection title={t("s10.title")}>
        <p>{t("s10.body", { legalName: ENTITY_IDENTITY.legalName })}</p>
      </LegalSection>

      <LegalSection title={t("s11.title")}>
        <dl className="space-y-2">
          <LegalField label={t("s11.dpo")} value={ENTITY_IDENTITY.dataProtectionContact} />
          <LegalField label={t("s11.email")} value={ENTITY_IDENTITY.generalContactEmail} />
        </dl>
      </LegalSection>
    </LegalPageShell>
  );
}
