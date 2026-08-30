import { AccountStatusBadge, KycBadge, RiskBadge } from "@/components/admin/status-badge";
import type { AdminClient } from "@/lib/admin-mock-data";
import { ADMIN_CARD_RAISED } from "@/lib/admin-theme";
import { cn } from "@/lib/utils";

// En-tête d'identité — section 4 du brief, "le cœur de l'interface". Reste visible en
// scrollant (sticky sous la topbar, 56px de haut) : identité, ID client, numéro de
// dossier, statuts clés toujours à portée d'œil quel que soit l'onglet actif. Avatar en
// aplat plein (pas de dégradé) : la couleur porte l'information de marque, pas d'effet.
export function IdentityHeader({ client }: { client: AdminClient }) {
  return (
    <div className={cn(ADMIN_CARD_RAISED, "sticky top-14 z-10 px-5 py-4")}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-[15px] font-semibold text-primary-foreground">
            {client.initials}
          </div>
          <div>
            <h1 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
              {client.firstName.toUpperCase()} {client.lastName.toUpperCase()}
            </h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-muted-foreground">
              <span className="font-mono text-muted-foreground">{client.id}</span>
              <span aria-hidden className="text-foreground/15">
                /
              </span>
              <span className="font-mono text-muted-foreground">{client.creditRequest.id}</span>
              <span aria-hidden className="text-foreground/15">
                ·
              </span>
              <span>{client.clientType}</span>
              <span aria-hidden className="text-foreground/15">
                ·
              </span>
              <span>Client depuis {client.registeredAt}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <AccountStatusBadge status={client.accountStatus} />
          <KycBadge status={client.kycStatus} />
          <RiskBadge level={client.riskLevel} />
        </div>
      </div>
    </div>
  );
}
