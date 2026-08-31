import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { RwaStrategySection } from "@/components/marketing/rwa-strategy-section";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "RwaStrategy.meta" });
  return { title: t("title"), description: t("description") };
}

// Page dédiée à la stratégie de trésorerie sur les métaux industriels/matières premières
// tokenisés — contenu déplacé depuis la page d'accueil (cf. app/[locale]/page.tsx,
// désormais une simple carte de renvoi). RwaStrategySection porte déjà son propre
// habillage (fond sombre pleine largeur, en-tête, eyebrow) : pas de MarketingPageShell
// ici pour éviter un double en-tête, seulement le chrome SiteNav/SiteFooter + un fil
// d'Ariane de retour.
export default async function StrategieRwaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Common");

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1 bg-slate-900">
        <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white"
          >
            <ArrowLeft className="size-3.5" />
            {t("backToHome")}
          </Link>
        </div>
        <RwaStrategySection />
      </main>
      <SiteFooter />
    </div>
  );
}
