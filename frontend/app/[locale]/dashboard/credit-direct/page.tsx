"use client";

import { ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DirectCreditForm } from "@/components/dashboard/direct-credit-form";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { useSectionData } from "@/components/dashboard/use-section-data";
import { api } from "@/lib/api";

// Réservée aux comptes BUSINESS (cf. AccountType) — appliqué côté API
// (BusinessAccountGuard, cf. backend/src/common/guards/business-account.guard.ts) ET ici
// en défense en profondeur : un compte particulier qui arriverait sur cette route (le
// lien de navigation lui est déjà masqué, cf. sidebar.tsx) voit un message d'accès
// refusé plutôt qu'un formulaire que l'API rejetterait de toute façon avec 403.
export default function DirectCreditPage() {
  const t = useTranslations("Dashboard.directCredit");
  const { selectedUser, authLoading, triggerRefresh } = useDashboard();
  const { data: history, loading, error } = useSectionData((userId) =>
    api.listDirectCreditRequests(userId),
  );

  const isBusiness = selectedUser?.accountType === "BUSINESS";

  if (authLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!isBusiness) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <ShieldAlert className="size-8 text-muted-foreground" />
          <p className="font-medium">{t("accessDeniedTitle")}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{t("accessDeniedBody")}</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
      </Card>
    );
  }

  if (loading || !history) {
    return <Skeleton className="h-96 w-full" />;
  }

  return <DirectCreditForm history={history} onSuccess={triggerRefresh} />;
}
