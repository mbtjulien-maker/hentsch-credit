import Link from "next/link";
import { AdminCard, AdminCardHeader, AdminMetric } from "@/components/admin/admin-ui";
import { ADMIN_CLIENTS } from "@/lib/admin-mock-data";

// Vue "Support" — consolidation des indicateurs de support client par dossier
// (AdminClient.support). Sert de tableau de pilotage pour l'équipe support ; le détail
// des échanges reste dans l'onglet Notes & Support de chaque fiche client.
export default function AdminSupportPage() {
  const totalOpen = ADMIN_CLIENTS.reduce((sum, c) => sum + c.support.openTickets, 0);
  const totalResolved = ADMIN_CLIENTS.reduce((sum, c) => sum + c.support.resolvedTickets, 0);
  const withOpenTickets = ADMIN_CLIENTS.filter((c) => c.support.openTickets > 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-foreground">Support</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">Tickets et demandes clients en cours.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <AdminCard>
          <AdminMetric label="Tickets ouverts" value={totalOpen} accent="text-warning" />
        </AdminCard>
        <AdminCard>
          <AdminMetric label="Tickets résolus" value={totalResolved} accent="text-chart-3" />
        </AdminCard>
      </div>

      <AdminCard padded={false}>
        <div className="px-5 pt-5">
          <AdminCardHeader title="Clients avec demande en cours" description={`${withOpenTickets.length} clients`} />
        </div>
        {withOpenTickets.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">Aucune demande de support ouverte actuellement.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-foreground/[0.07] text-[10.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
                  <th className="px-5 py-2.5 font-medium text-[11px]">Client</th>
                  <th className="px-5 py-2.5 font-medium text-[11px]">Dernier contact</th>
                  <th className="px-5 py-2.5 text-right font-medium text-[11px]">Tickets ouverts</th>
                </tr>
              </thead>
              <tbody>
                {withOpenTickets.map((c) => (
                  <tr key={c.id} className="border-b border-foreground/[0.05] last:border-b-0 hover:bg-foreground/[0.02]">
                    <td className="px-5 py-2.5">
                      <Link href={`/admin/clients/${c.id}`} className="text-foreground hover:underline">
                        {c.firstName} {c.lastName}
                      </Link>
                    </td>
                    <td className="px-5 py-2.5 text-muted-foreground">{c.support.lastContact}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-warning">{c.support.openTickets}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </div>
  );
}
