import Link from "next/link";
import { AdminCard, AdminCardHeader } from "@/components/admin/admin-ui";
import { ADMIN_CLIENTS } from "@/lib/admin-mock-data";

function parseFrDate(date: string, time: string): number {
  const [d, m, y] = date.split("/").map(Number);
  const [h, min] = time.split(":").map(Number);
  return new Date(y, (m ?? 1) - 1, d, h ?? 0, min ?? 0).getTime();
}

// Vue "Transactions" — agrégation, tous clients confondus, des événements d'activité de
// chaque dossier (AdminClient.history, cf. lib/admin-mock-data.ts) triés du plus récent
// au plus ancien. Une vraie table de transactions financières (dépôts, paiements carte,
// remboursements) existe déjà côté client authentifié (cf. /dashboard/historique) ; cette
// vue back-office reflète l'activité au niveau dossier plutôt que le grand livre.
export default function AdminTransactionsPage() {
  const rows = ADMIN_CLIENTS.flatMap((c) => c.history.map((entry) => ({ client: c, entry }))).sort(
    (a, b) => parseFrDate(b.entry.date, b.entry.time) - parseFrDate(a.entry.date, a.entry.time),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-foreground">Transactions</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">Activité récente sur l&apos;ensemble des dossiers clients.</p>
      </div>

      <AdminCard padded={false}>
        <div className="px-5 pt-5">
          <AdminCardHeader title="Journal d'activité consolidé" description={`${rows.length} événements`} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-foreground/[0.07] text-[10.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
                <th className="px-5 py-2.5 font-medium text-[11px]">Date</th>
                <th className="px-5 py-2.5 font-medium text-[11px]">Client</th>
                <th className="px-5 py-2.5 font-medium text-[11px]">Action</th>
                <th className="px-5 py-2.5 font-medium text-[11px]">Résultat</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ client, entry }, i) => (
                <tr key={i} className="border-b border-foreground/[0.05] last:border-b-0 hover:bg-foreground/[0.02]">
                  <td className="px-5 py-2.5 whitespace-nowrap text-muted-foreground">
                    {entry.date} <span className="tabular-nums">{entry.time}</span>
                  </td>
                  <td className="px-5 py-2.5">
                    <Link href={`/admin/clients/${client.id}`} className="text-foreground hover:underline">
                      {client.firstName} {client.lastName}
                    </Link>
                  </td>
                  <td className="px-5 py-2.5 text-foreground">{entry.action}</td>
                  <td className="px-5 py-2.5 text-muted-foreground">{entry.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </div>
  );
}
