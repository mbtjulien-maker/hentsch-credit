import { InvestmentProvider } from "@/components/dashboard/investment/investment-context";
import { InvestmentSectionHeader } from "@/components/dashboard/investment/investment-section-header";

// Espace Investissement — une section autonome (retour client : "une section complètement
// à part") avec ses propres sous-pages : vue d'ensemble, approvisionnement, produits,
// placements, journal. Le provider charge les données UNE fois pour toutes les sous-pages ;
// l'en-tête (titre + navigation locale) reste identique partout.
//
// Ouvert aux comptes PARTICULIER et BUSINESS (cf. §2H CLAUDE.md) — aucun masquage par
// accountType. L'API (KycVerifiedGuard) reste la garde qui compte réellement pour les
// placements ; la consultation reste possible avant vérification (tout est alors à zéro).
export default function InvestmentSpaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <InvestmentProvider>
      <div className="flex flex-col gap-6">
        <InvestmentSectionHeader />
        {children}
      </div>
    </InvestmentProvider>
  );
}
