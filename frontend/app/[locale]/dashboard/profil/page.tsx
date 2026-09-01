"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { ProfileSection } from "@/components/dashboard/profile-section";
import { useSectionData } from "@/components/dashboard/use-section-data";
import { api } from "@/lib/api";

export default function ProfilPage() {
  const t = useTranslations("Dashboard.profilePage");
  const { selectedUser } = useDashboard();
  const { data: wallets, loading, error } = useSectionData((userId) => api.listWallets(userId));

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertTitle>{t("loadError")}</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (loading || !wallets || !selectedUser) {
    return <Skeleton className="h-64 w-full" />;
  }

  return <ProfileSection user={selectedUser} wallets={wallets} />;
}
