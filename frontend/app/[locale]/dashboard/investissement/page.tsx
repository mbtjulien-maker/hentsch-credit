"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { InvestmentPanel } from "@/components/dashboard/investment-panel";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { useSectionData } from "@/components/dashboard/use-section-data";
import { api } from "@/lib/api";

// Ouvert aux comptes PARTICULIER et BUSINESS vérifiés (KYC) — contrairement à
// /dashboard/credit-direct, aucun masquage par accountType ici (cf. §2H CLAUDE.md).
// L'API (KycVerifiedGuard) reste la garde qui compte réellement ; le formulaire renvoie
// simplement l'erreur générique du backend si une tentative de dépôt échoue faute de KYC.
//
// Pas d'en-tête "Investissement direct" / description ici (retour client : la page doit
// commencer directement par le wallet d'investissement, cf. InvestmentWalletCard en tête
// d'InvestmentPanel) — le titre de section vit déjà dans la sidebar/breadcrumb du dashboard.
export default function InvestmentPage() {
  const { authLoading, triggerRefresh } = useDashboard();
  const { data: positions, loading, error, selectedUserId } = useSectionData((userId) =>
    api.listInvestmentPositions(userId),
  );

  if (authLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
      </Card>
    );
  }

  if (loading || !positions || !selectedUserId) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <InvestmentPanel userId={selectedUserId} positions={positions} onSuccess={triggerRefresh} />
    </div>
  );
}
