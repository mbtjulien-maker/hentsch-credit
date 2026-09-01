"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { TransactionHistory } from "@/components/dashboard/transaction-history";
import { useSectionData } from "@/components/dashboard/use-section-data";
import { api } from "@/lib/api";

export default function HistoriquePage() {
  const t = useTranslations("Dashboard.historyPage");
  const { data: transactions, loading, error } = useSectionData((userId) =>
    api.listTransactions(userId),
  );

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertTitle>{t("loadError")}</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (loading || !transactions) {
    return <Skeleton className="h-72 w-full" />;
  }

  return <TransactionHistory transactions={transactions} />;
}
