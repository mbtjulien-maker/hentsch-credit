"use client";

import { BadgeCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import type { KycStatus } from "@/lib/api";

function kycVariant(status: KycStatus): "secondary" | "destructive" {
  return status === "REJECTED" ? "destructive" : "secondary";
}

// Nom complet auto-déclaré (ClientProfile, cf. §6 CLAUDE.md entrée #24) — retombe sur
// l'email tant que le client n'a pas encore renseigné son profil, jamais un nom inventé
// à sa place.
function displayName(user: { email: string; firstName?: string | null; lastName?: string | null }): string {
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return full || user.email;
}

// Remplace l'ancien UserSwitcher (bascule libre entre comptes) — le compte affiché ici
// est celui de la session réelle (cf. DashboardProvider/AuthController.me), plus une
// simple sélection. La déconnexion vit désormais en bas de la sidebar avec les autres
// sections (retour client), plus ici.
export function AccountMenu() {
  const t = useTranslations("Dashboard.labels");
  const tMenu = useTranslations("Dashboard.accountMenu");
  const { selectedUser } = useDashboard();
  if (!selectedUser) return null;

  const isVerified = selectedUser.kycStatus === "VERIFIED";

  return (
    <div className="flex items-center gap-2">
      <span className="hidden items-center gap-2 text-lg font-semibold tracking-tight text-foreground sm:flex">
        {displayName(selectedUser)}
        {isVerified && (
          // Badge de vérification bleu façon réseaux sociaux (Meta/X) — remplace la
          // mention texte "KYC vérifié" à côté du nom, une fois l'identité confirmée
          // par un conseiller (cf. AdminClientsController.kyc-decision).
          <BadgeCheck
            className="size-5 shrink-0 fill-sky-500 text-white dark:fill-sky-400"
            aria-label={tMenu("verifiedBadge")}
          />
        )}
      </span>
      {!isVerified && (
        <Badge variant={kycVariant(selectedUser.kycStatus)}>
          {t(`kycStatus.${selectedUser.kycStatus}`)}
        </Badge>
      )}
      {selectedUser.accountType === "BUSINESS" && (
        <Badge variant="outline">{tMenu("business")}</Badge>
      )}
      {selectedUser.role === "ADMIN" && <Badge variant="outline">{tMenu("admin")}</Badge>}
    </div>
  );
}
