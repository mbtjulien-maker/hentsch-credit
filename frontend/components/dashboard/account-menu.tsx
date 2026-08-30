"use client";

import { LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import type { KycStatus } from "@/lib/api";
import { KYC_STATUS_LABELS } from "@/lib/format";

function kycVariant(status: KycStatus): "default" | "secondary" | "destructive" {
  if (status === "VERIFIED") return "default";
  if (status === "PENDING") return "secondary";
  return "destructive";
}

// Remplace l'ancien UserSwitcher (bascule libre entre comptes) — le compte affiché ici
// est celui de la session réelle (cf. DashboardProvider/AuthController.me), plus une
// simple sélection. Seule action possible : se déconnecter.
export function AccountMenu() {
  const { selectedUser, logout } = useDashboard();
  if (!selectedUser) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-sm font-medium text-foreground sm:inline">
        {selectedUser.email}
      </span>
      <Badge variant={kycVariant(selectedUser.kycStatus)}>
        {KYC_STATUS_LABELS[selectedUser.kycStatus]}
      </Badge>
      {selectedUser.role === "ADMIN" && <Badge variant="outline">Admin</Badge>}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => void logout()}
        aria-label="Se déconnecter"
      >
        <LogOut className="size-4" />
      </Button>
    </div>
  );
}
