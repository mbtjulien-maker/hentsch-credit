import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { RwaStrategySection } from "@/components/marketing/rwa-strategy-section";

export const metadata = {
  title: "Stratégie d'investissement RWA · Hentsch Credit",
};

// Page dédiée à la stratégie de trésorerie sur les métaux industriels/matières premières
// tokenisés — contenu déplacé depuis la page d'accueil (cf. app/page.tsx, désormais une
// simple carte de renvoi). RwaStrategySection porte déjà son propre habillage (fond
// sombre pleine largeur, en-tête, eyebrow) : pas de MarketingPageShell ici pour éviter un
// double en-tête, seulement le chrome SiteNav/SiteFooter + un fil d'Ariane de retour.
export default function StrategieRwaPage() {
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
            Retour à l&apos;accueil
          </Link>
        </div>
        <RwaStrategySection />
      </main>
      <SiteFooter />
    </div>
  );
}
