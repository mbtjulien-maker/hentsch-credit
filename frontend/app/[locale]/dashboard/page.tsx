"use client";

import { AlertTriangle, PiggyBank, ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { CardsSection } from "@/components/dashboard/cards-section";
import { CreditForm } from "@/components/dashboard/credit-form";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { HomeBalanceOverview } from "@/components/dashboard/home-balance-overview";
import { MarketView } from "@/components/dashboard/market-view";
import { ProfileSection } from "@/components/dashboard/profile-section";
import { SupportSection } from "@/components/dashboard/support-section";
import { TransactionHistory } from "@/components/dashboard/transaction-history";
import { useSectionData } from "@/components/dashboard/use-section-data";
import { WalletActions } from "@/components/dashboard/wallet-actions";
import { api } from "@/lib/api";
import { formatUsd } from "@/lib/format";
import { useCreditRequests } from "@/lib/use-credit-requests";

// Page d'accueil : vue d'ensemble regroupant toutes les sections, en plus des routes
// dédiées (/solde, /marche, /credit, /cartes, /profil, /support, /historique) pour
// un accès direct depuis la nav.
export default function HomePage() {
  const t = useTranslations("Dashboard.home");
  const { triggerRefresh, selectedUser } = useDashboard();
  const balance = useSectionData((userId) => api.getBalance(userId));
  const wallets = useSectionData((userId) => api.listWallets(userId));
  const transactions = useSectionData((userId) => api.listTransactions(userId));
  const requestsState = useCreditRequests(balance.selectedUserId ?? "");

  const error = balance.error ?? wallets.error ?? transactions.error;
  const loading = balance.loading || wallets.loading || transactions.loading || !selectedUser;

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertTitle>{t("loadError")}</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (loading || !balance.data || !wallets.data || !transactions.data || !balance.selectedUserId) {
    return <HomeSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6">
      {selectedUser.kycStatus !== "VERIFIED" && (
        // Mention visible dès l'arrivée sur le compte (retour client, cf. §6 CLAUDE.md
        // entrée #41) — la garde qui compte réellement reste côté API
        // (KycVerifiedGuard) ; ceci évite juste au client de découvrir le verrouillage
        // en pleine action (cf. WalletActions, qui verrouille aussi ses boutons).
        <Alert className="border-amber-500/40 bg-amber-500/5">
          <ShieldAlert className="size-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle>{t("kycPendingBanner.title")}</AlertTitle>
          <AlertDescription>
            {t("kycPendingBanner.description")}{" "}
            <Link href="/dashboard/kyc" className="font-medium underline underline-offset-2">
              {t("kycPendingBanner.cta")}
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {!balance.data.initialDeposit.met && (
        // Condition d'ouverture de compte (500 $ PARTICULIER / 1000 $ BUSINESS, cf.
        // backend/src/users/user.constants.ts) — purement informatif, jamais un verrou :
        // contrairement au bandeau KYC ci-dessus, aucun bouton n'est bloqué ici (il faut
        // justement pouvoir déposer pour remplir cette condition). Reste affiché tant que
        // le cumul de dépôts réels n'a pas atteint le seuil, même après un premier dépôt
        // partiel.
        <Alert className="border-sky-500/40 bg-sky-500/5">
          <PiggyBank className="size-4 text-sky-600 dark:text-sky-400" />
          <AlertTitle>{t("initialDepositBanner.title")}</AlertTitle>
          <AlertDescription>
            {t("initialDepositBanner.description", {
              required: formatUsd(balance.data.initialDeposit.requiredUsd),
              deposited: formatUsd(balance.data.initialDeposit.depositedUsd),
            })}
          </AlertDescription>
        </Alert>
      )}

      <HomeBalanceOverview summary={balance.data} />
      <WalletActions
        summary={balance.data}
        userId={balance.selectedUserId}
        approvedCreditRequest={requestsState.active?.status === "APPROVED" ? requestsState.active : null}
        onSuccess={() => {
          requestsState.refetch();
          triggerRefresh();
        }}
      />

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
        <CardsSection />
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
