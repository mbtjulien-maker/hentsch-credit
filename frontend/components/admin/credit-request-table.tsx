import Link from "next/link";
import { AdminCard, AdminCardHeader, AdminEmptyState } from "@/components/admin/admin-ui";
import { ContractStatusBadge, DecisionBadge } from "@/components/admin/status-badge";
import type { AdminClient } from "@/lib/admin-mock-data";
import { formatEur } from "@/lib/admin-format";
import { Inbox } from "lucide-react";

// Table réutilisée par les quatre sous-pages "Crédits" (demandes / dossiers en cours /
// actifs / clôturés) — chacune ne filtre qu'un sous-ensemble de ADMIN_CLIENTS, la
// présentation reste identique pour rester cohérente et prévisible pour l'utilisateur.
export function CreditRequestTable({
  clients,
  title,
  description,
}: {
  clients: AdminClient[];
  title: string;
  description?: string;
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
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-b border-foreground/[0.05] last:border-b-0 hover:bg-foreground/[0.02]">
                  <td className="px-5 py-2.5">
                    <Link href={`/admin/clients/${c.id}`} className="text-foreground hover:underline">
                      {c.firstName} {c.lastName}
                    </Link>
                  </td>
                  <td className="px-5 py-2.5 font-mono text-xs text-muted-foreground">{c.creditRequest.id}</td>
                  <td className="px-5 py-2.5 text-foreground">{c.creditRequest.product}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums text-foreground">{formatEur(c.creditRequest.amountRequested)}</td>
                  <td className="px-5 py-2.5 text-muted-foreground">{c.dossierStatus.steps[c.dossierStatus.currentStepIndex].label}</td>
                  <td className="px-5 py-2.5">
                    <ContractStatusBadge status={c.contract.status} />
                  </td>
                  <td className="px-5 py-2.5">
                    <DecisionBadge status={c.creditRequest.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminCard>
  );
}
