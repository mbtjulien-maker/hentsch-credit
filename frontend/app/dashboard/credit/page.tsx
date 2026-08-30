"use client";

import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditForm } from "@/components/dashboard/credit-form";
import {
  CreditOverviewStrip,
  CreditRatesPanel,
  CreditRequestsHistory,
} from "@/components/dashboard/credit-overview";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { useSectionData } from "@/components/dashboard/use-section-data";
import { useCreditRates } from "@/lib/use-credit-rates";
import { useCreditRequests } from "@/lib/use-credit-requests";
import { api } from "@/lib/api";

// Page crédit — compacte, adaptative (colonne unique sur mobile, formulaire + panneau
// d'information sur desktop) et riche en contexte : position actuelle en un coup d'œil
// (CreditOverviewStrip), taux toujours visibles (CreditRatesPanel) et historique des
// demandes (CreditRequestsHistory) à côté du formulaire, pas seulement dans l'Historique
// général des transactions.
export default function CreditPage() {
  const { triggerRefresh } = useDashboard();
  const { data: summary, loading, error, selectedUserId } = useSectionData((userId) =>
    api.getBalance(userId),
  );
  const { data: transactions } = useSectionData((userId) => api.listTransactions(userId));
  const rates = useCreditRates();
  const requestsState = useCreditRequests(selectedUserId ?? "");

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertTitle>Impossible de charger la ligne de crédit</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (loading || !summary || !selectedUserId) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  async function handleSuccess() {
    requestsState.refetch();
    await triggerRefresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <CreditOverviewStrip summary={summary} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <CreditForm
          summary={summary}
          requestsState={requestsState}
          transactions={transactions}
          onSuccess={handleSuccess}
        />

        <div className="flex flex-col gap-4">
          <CreditRatesPanel rates={rates} />
          <CreditRequestsHistory requests={requestsState.requests} loading={requestsState.loading} />
        </div>
      </div>
    </div>
  );
}
