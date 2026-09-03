import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { InviteSignupWizard } from "@/components/marketing/invite-signup-wizard";
import { buildPageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "InviteSignup.meta" });
  return buildPageMetadata({ locale, path: "/inscription", title: t("title"), description: t("description") });
}

// Point d'entrée réel pour créer un compte (cf. §6 CLAUDE.md entrée #41) — remplace
// l'ancien formulaire public "Demander l'ouverture d'un compte" (désormais un simple
// renvoi ici, cf. /demande-de-compte). Un code d'invitation valide déverrouille un
// dossier KYC progressif, terminé par un récapitulatif régénérant le dossier en PDF avant
// toute création réelle de compte.
export default async function InscriptionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("InviteSignup");

  return (
    <MarketingPageShell eyebrow={t("eyebrow")} title={t("title")} description={t("description")}>
      <div className="mx-auto w-full max-w-2xl px-4 pb-16 sm:px-6">
        <InviteSignupWizard />
      </div>
    </MarketingPageShell>
  );
}
