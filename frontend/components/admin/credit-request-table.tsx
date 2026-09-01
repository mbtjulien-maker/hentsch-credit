import Link from "next/link";
import { AdminCard, AdminCardHeader, AdminEmptyState } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { ContractStatusBadge, DecisionBadge } from "@/components/admin/status-badge";
import type { AdminContract, DecisionStatus } from "@/lib/admin-mock-data";
import { formatUsd } from "@/lib/format";
import { Check, Inbox, X } from "lucide-react";

// Champs communs à AdminClient (fiche détaillée, cf. lib/admin-mock-data.ts) et
// AdminClientSummary (liste, cf. lib/api.ts) — les deux types satisfont structurellement
// cette forme, donc les 4 pages /admin/credits/* peuvent passer indifféremment des
// clients de démonstration ou de vraies fiches sans conversion.
interface CreditDossierRow {
  id: string;
  userId?: string;
  firstName: string;
  lastName: string;
  creditRequest: {
    id: string;
    requestId?: string | null;
    product: string;
    amountRequested: number;
    status: DecisionStatus;
  };
  dossierStatus: { currentStepIndex: number; steps: { label: string }[] };
  contract: AdminContract;
}

// Table réutilisée par les quatre sous-pages "Crédits" (demandes / dossiers en cours /
// actifs / clôturés) — chacune ne filtre qu'un sous-ensemble des clients (réels, cf.
// api.listAdminClients()), la présentation reste identique pour rester cohérente et
// prévisible pour l'utilisateur.
//
// `onDecision` n'a de sens que pour la file "demandes" (dossierCategory DEMANDE, cf.
// /admin/credits/demandes/page.tsx) : c'est la seule catégorie où creditRequest.status
// vaut encore PENDING, donc la seule où approuver/rejeter est une action valide côté API
// (POST /credit-requests/:id/approve|reject). Les trois autres pages (dossiers en cours,
// actifs, clôturés) omettent la prop et gardent la table en lecture seule — auparavant la
// seule action réelle sur une demande vivait exclusivement dans
// /dashboard/demandes-credit, ce qui rendait le back-office "vue seule" incapable d'agir
// sur ce qu'il affiche (cf. constat "deux surfaces admin qui ne convergent pas").
export function CreditRequestTable({
  clients,
  title,
  description,
  onDecision,
  actingOn,
}: {
  clients: CreditDossierRow[];
  title: string;
  description?: string;
  onDecision?: (id: string, action: "approve" | "reject") => void;
  actingOn?: string | null;
}) {
  return (
    <AdminCard padded={false}>
      <div className="px-5 pt-5">
        <AdminCardHeader title={title} description={description} />
      </div>
      {clients.length === 0 ? (
        <AdminEmptyState icon={<Inbox className="size-8 text-muted-foreground" />} title="Aucun dossier dans cette catégorie" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-foreground/[0.07] text-[10.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
                <th className="px-5 py-2.5 font-medium text-[11px]">Client</th>
                <th className="px-5 py-2.5 font-medium text-[11px]">Dossier</th>
                <th className="px-5 py-2.5 font-medium text-[11px]">Produit</th>
                <th className="px-5 py-2.5 text-right font-medium text-[11px]">Montant</th>
                <th className="px-5 py-2.5 font-medium text-[11px]">Étape</th>
                <th className="px-5 py-2.5 font-medium text-[11px]">Contrat</th>
                <th className="px-5 py-2.5 font-medium text-[11px]">Statut</th>
                {onDecision && <th className="px-5 py-2.5 font-medium text-[11px]">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-b border-foreground/[0.05] last:border-b-0 hover:bg-foreground/[0.02]">
                  <td className="px-5 py-2.5">
                    <Link href={`/admin/clients/${c.userId ?? c.id}`} className="text-foreground hover:underline">
                      {c.firstName} {c.lastName}
                    </Link>
                  </td>
                  <td className="px-5 py-2.5 font-mono text-xs text-muted-foreground">{c.creditRequest.id}</td>
                  <td className="px-5 py-2.5 text-foreground">{c.creditRequest.product}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums text-foreground">{formatUsd(c.creditRequest.amountRequested)}</td>
                  <td className="px-5 py-2.5 text-muted-foreground">{c.dossierStatus.steps[c.dossierStatus.currentStepIndex].label}</td>
                  <td className="px-5 py-2.5">
                    <ContractStatusBadge status={c.contract.status} />
                  </td>
                  <td className="px-5 py-2.5">
                    <DecisionBadge status={c.creditRequest.status} />
                  </td>
                  {onDecision && (
                    <td className="px-5 py-2.5">
                      {c.creditRequest.requestId ? (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={actingOn === c.creditRequest.requestId}
                            onClick={() => onDecision(c.creditRequest.requestId!, "reject")}
                          >
                            <X className="size-3.5" />
                            Rejeter
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={actingOn === c.creditRequest.requestId}
                            onClick={() => onDecision(c.creditRequest.requestId!, "approve")}
                          >
                            <Check className="size-3.5" />
                            Valider
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminCard>
  );
}
