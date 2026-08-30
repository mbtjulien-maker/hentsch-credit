import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { MarketView } from "@/components/dashboard/market-view";

export const metadata = {
  title: "Marché en direct · Hentsch Credit",
  description:
    "Les cours en temps réel des actifs acceptés en garantie sur Hentsch Credit : stablecoins, or, argent, ETH et métaux industriels tokenisés.",
};

// Page dédiée au marché en direct — contenu déplacé depuis la page d'accueil (cf.
// app/page.tsx, désormais une simple carte de renvoi).
export default function MarchePage() {
  return (
    <MarketingPageShell
      eyebrow="Données en direct"
      title="Le marché en direct"
      description="Les cours des actifs acceptés en garantie, en temps réel."
    >
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
        <MarketView />
      </div>
    </MarketingPageShell>
  );
}
