"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { KycDossierSection } from "@/components/dashboard/kyc-dossier-section";

export default function KycPage() {
  const { selectedUser } = useDashboard();

  if (!selectedUser) {
    return <Skeleton className="h-96 w-full" />;
  }

  return <KycDossierSection userId={selectedUser.id} />;
}
