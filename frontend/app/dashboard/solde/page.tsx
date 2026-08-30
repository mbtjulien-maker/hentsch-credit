"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { BalanceCards } from "@/components/dashboard/balance-cards";
import { ApprovedCreditRequestDeposit } from "@/components/dashboard/credit-request-deposit";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { useSectionData } from "@/components/dashboard/use-section-data";
import { WalletActions } from "@/components/dashboard/wallet-actions";
import { api } from "@/lib/api";
import { useCreditRequests } from "@/lib/use-credit-requests";

// useSearchParams() force un bailout hors du rendu statique — isolé dans un enfant sous
// Suspense pour ne pas empêcher le prerendering du reste de la page (cf. doc Next.js
// "missing-suspense-with-csr-bailout").
function TopupCompleteBanner() {
  const searchParams = useSearchParams();
  if (searchParams.get("topup") !== "complete") return null;
  return (
    <Alert>
      <CheckCircle2 className="size-4" />
      <AlertTitle>Recharge par carte confirmée</AlertTitle>
      <AlertDescription>
        Le solde disponible ci-dessous reflète la recharge.
      </AlertDescription>
    </Alert>
  );
}

// Page Solde : gère le portefeuille indépendamment du crédit — dépôts (généraux ou pour
// une demande de crédit approuvée), recharge par carte, retraits. La logique de crédit
// (simuler/demander/rembourser) vit exclusivement dans /dashboard/credit ; ici, on ne fait
// que déposer et voir son solde, y compris les adresses de dépôt de chaque crypto.
export default function SoldePage() {
  const { triggerRefresh } = useDashboard();
  const { data: summary, loading, error, selectedUserId } = useSectionData((userId) =>
    api.getBalance(userId),
  );
  const requestsState = useCreditRequests(selectedUserId ?? "");

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertTitle>Impossible de charger le solde</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (loading || !summary || !selectedUserId) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={null}>
        <TopupCompleteBanner />
      </Suspense>

      {requestsState.active?.status === "APPROVED" && (
        <ApprovedCreditRequestDeposit
          request={requestsState.active}
          onSuccess={async () => {
            requestsState.refetch();
            await triggerRefresh();
          }}
        />
      )}

      <BalanceCards summary={summary} />
      <WalletActions summary={summary} userId={selectedUserId} onSuccess={triggerRefresh} />
    </div>
  );
}
