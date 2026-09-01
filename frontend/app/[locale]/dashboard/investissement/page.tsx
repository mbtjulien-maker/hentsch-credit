"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { InvestmentPanel } from "@/components/dashboard/investment-panel";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { useSectionData } from "@/components/dashboard/use-section-data";
import { api } from "@/lib/api";

// Ouvert aux comptes PARTICULIER et BUSINESS vérifiés (KYC) — contrairement à
// /dashboard/credit-direct, aucun masquage par accountType ici (cf. §2H CLAUDE.md).
// L'API (KycVerifiedGuard) reste la garde qui compte réellement ; le formulaire renvoie
// simplement l'erreur générique du backend si une tentative de dépôt échoue faute de KYC.
export default function InvestmentPage() {
  const t = useTranslations("Dashboard.investment");
  const { authLoading, triggerRefresh } = useDashboard();
  const { data: positions, loading, error } = useSectionData((userId) =>
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

  if (loading || !positions) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {t("intro")}
        </CardContent>
      </Card>
      <InvestmentPanel positions={positions} onSuccess={triggerRefresh} />
    </div>
  );
}
