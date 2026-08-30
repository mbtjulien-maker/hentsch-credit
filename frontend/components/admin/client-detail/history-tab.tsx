import { AdminCard, AdminCardHeader, AdminEmptyState } from "@/components/admin/admin-ui";
import type { AdminClient } from "@/lib/admin-mock-data";
import { History } from "lucide-react";

// Onglet "Historique" — section 17 du brief : journal d'activité chronologique du
// dossier (connexions, modifications, documents, décisions, paiements…), en table pour
// rester dense et scannable (colonnes DATE/HEURE/UTILISATEUR/ACTION/RÉSULTAT).
export function HistoryTab({ client }: { client: AdminClient }) {
  if (client.history.length === 0) {
    return (
      <AdminCard>
        <AdminEmptyState icon={<History className="size-8 text-muted-foreground" />} title="Aucun événement enregistré" />
      </AdminCard>
    );
  }

  return (
    <AdminCard padded={false}>
      <div className="px-5 pt-5">
        <AdminCardHeader title="Journal d'activité" description="Historique complet des actions liées à ce dossier." />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-foreground/[0.07] text-[10.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
              <th className="px-5 py-2.5 font-medium text-[11px]">Date</th>
              <th className="px-5 py-2.5 font-medium text-[11px]">Heure</th>
              <th className="px-5 py-2.5 font-medium text-[11px]">Utilisateur</th>
              <th className="px-5 py-2.5 font-medium text-[11px]">Action</th>
              <th className="px-5 py-2.5 font-medium text-[11px]">Résultat</th>
            </tr>
          </thead>
          <tbody>
            {client.history.map((entry, i) => (
              <tr key={i} className="border-b border-foreground/[0.05] last:border-b-0">
                <td className="px-5 py-2.5 whitespace-nowrap text-muted-foreground">{entry.date}</td>
                <td className="px-5 py-2.5 whitespace-nowrap tabular-nums text-muted-foreground">{entry.time}</td>
                <td className="px-5 py-2.5 whitespace-nowrap text-foreground">{entry.user}</td>
                <td className="px-5 py-2.5 text-foreground">{entry.action}</td>
                <td className="px-5 py-2.5 text-muted-foreground">{entry.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminCard>
  );
}
