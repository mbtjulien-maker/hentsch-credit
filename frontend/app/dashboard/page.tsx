"use client";

import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { BalanceCards } from "@/components/dashboard/balance-cards";
import { CardsSection } from "@/components/dashboard/cards-section";
import { CreditForm } from "@/components/dashboard/credit-form";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { MarketView } from "@/components/dashboard/market-view";
import { ProfileSection } from "@/components/dashboard/profile-section";
import { SupportSection } from "@/components/dashboard/support-section";
import { TransactionHistory } from "@/components/dashboard/transaction-history";
import { useSectionData } from "@/components/dashboard/use-section-data";
import { WalletActions } from "@/components/dashboard/wallet-actions";
import { api } from "@/lib/api";
import { useCreditRequests } from "@/lib/use-credit-requests";

// Page d'accueil : vue d'ensemble regroupant toutes les sections, en plus des routes
// dédiées (/solde, /marche, /credit, /cartes, /profil, /support, /historique) pour
// un accès direct depuis la nav.
export default function HomePage() {
  const { triggerRefresh, selectedUser } = useDashboard();
  const balance = useSectionData((userId) => api.getBalance(userId));
  const cards = useSectionData((userId) => api.listCards(userId));
  const wallets = useSectionData((userId) => api.listWallets(userId));
  const transactions = useSectionData((userId) => api.listTransactions(userId));
  const requestsState = useCreditRequests(balance.selectedUserId ?? "");

  const error = balance.error ?? cards.error ?? wallets.error ?? transactions.error;
  const loading =
    balance.loading || cards.loading || wallets.loading || transactions.loading || !selectedUser;

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertTitle>Impossible de charger le tableau de bord</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (
    loading ||
    !balance.data ||
    !cards.data ||
    !wallets.data ||
    !transactions.data ||
    !balance.selectedUserId
  ) {
    return <HomeSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6">
      <BalanceCards summary={balance.data} />
      <WalletActions summary={balance.data} userId={balance.selectedUserId} onSuccess={triggerRefresh} />

      <MarketView />

      <div className="grid gap-6 lg:grid-cols-2">
        <CreditForm
          summary={balance.data}
          requestsState={requestsState}
          transactions={transactions.data}
          onSuccess={async () => {
            requestsState.refetch();
            await triggerRefresh();
          }}
        />
        <CardsSection cards={cards.data} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileSection user={selectedUser} wallets={wallets.data} />
        <SupportSection />
      </div>

      <TransactionHistory transactions={transactions.data} />
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}
