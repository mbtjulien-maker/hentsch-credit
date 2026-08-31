import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { MarketView } from "@/components/dashboard/market-view";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Market.meta" });
  return { title: t("title"), description: t("description") };
}

// Page dédiée au marché en direct — contenu déplacé depuis la page d'accueil (cf.
// app/page.tsx, désormais une simple carte de renvoi). MarketView est partagé avec
// /dashboard/marche (espace client connecté, hors routage par locale, cf. proxy.ts) : il
// reste volontairement en français en dur plutôt que d'utiliser useTranslations(), qui
// plaquerait sans NextIntlClientProvider côté dashboard.
export default async function MarchePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Market");

  return (
    <MarketingPageShell eyebrow={t("eyebrow")} title={t("title")} description={t("description")}>
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
        <MarketView />
      </div>
    </MarketingPageShell>
  );
}
