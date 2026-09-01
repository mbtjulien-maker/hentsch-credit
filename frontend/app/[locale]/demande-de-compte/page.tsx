import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { AccountRequestForm } from "@/components/marketing/account-request-form";
import { buildPageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AccountRequest.meta" });
  return buildPageMetadata({ locale, path: "/demande-de-compte", title: t("title"), description: t("description") });
}

// Page dédiée à la demande d'ouverture de compte — contenu déplacé depuis la page
// d'accueil (cf. app/page.tsx, désormais une simple carte de renvoi).
export default async function DemandeDeComptePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("AccountRequest");

  return (
    <MarketingPageShell eyebrow={t("eyebrow")} title={t("title")} description={t("description")}>
      <div className="mx-auto w-full max-w-2xl px-4 pb-16 sm:px-6">
        <AccountRequestForm />
        <p className="mt-6 text-center text-sm text-muted-foreground/80">
          {t.rich("alreadyHaveAccount", {
            link: (chunks) => (
              <Link href="/login" className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
    </MarketingPageShell>
  );
}
