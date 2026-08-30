import Link from "next/link";
import { AdminCard, AdminCardHeader } from "@/components/admin/admin-ui";
import { AccountStatusBadge } from "@/components/admin/status-badge";
import { ADMIN_CLIENTS } from "@/lib/admin-mock-data";
import { formatEur } from "@/lib/admin-format";

// Vue "Comptes" — liste consolidée de tous les comptes bancaires clients (agrégation de
// AdminClient.bankAccounts, cf. lib/admin-mock-data.ts). Overview réelle et
// data-backed, sans la profondeur de la fiche 360 par client (cf. note de cadrage).
export default function AdminAccountsPage() {
  const rows = ADMIN_CLIENTS.flatMap((c) => c.bankAccounts.map((acc) => ({ client: c, acc })));
  const totalBalance = rows.reduce((sum, r) => sum + r.acc.balance, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-foreground">Comptes</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {rows.length} comptes bancaires · {formatEur(totalBalance)} d&apos;encours cumulé.
        </p>
      </div>

      <AdminCard padded={false}>
        <div className="px-5 pt-5">
          <AdminCardHeader title="Tous les comptes" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-foreground/[0.07] text-[10.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
                <th className="px-5 py-2.5 font-medium text-[11px]">Titulaire</th>
                <th className="px-5 py-2.5 font-medium text-[11px]">Type</th>
                <th className="px-5 py-2.5 font-medium text-[11px]">IBAN</th>
                <th className="px-5 py-2.5 font-medium text-[11px]">Devise</th>
                <th className="px-5 py-2.5 text-right font-medium text-[11px]">Solde</th>
                <th className="px-5 py-2.5 text-right font-medium text-[11px]">Disponible</th>
                <th className="px-5 py-2.5 font-medium text-[11px]">Statut</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ client, acc }) => (
                <tr key={acc.id} className="border-b border-foreground/[0.05] last:border-b-0 hover:bg-foreground/[0.02]">
                  <td className="px-5 py-2.5">
                    <Link href={`/admin/clients/${client.id}`} className="text-foreground hover:underline">
                      {client.firstName} {client.lastName}
                    </Link>
                  </td>
                  <td className="px-5 py-2.5 text-foreground">{acc.type}</td>
                  <td className="px-5 py-2.5 font-mono text-xs text-muted-foreground">{acc.ibanMasked}</td>
                  <td className="px-5 py-2.5 text-muted-foreground">{acc.currency}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums text-foreground">{formatEur(acc.balance)}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums text-foreground">{formatEur(acc.available)}</td>
                  <td className="px-5 py-2.5">
                    <AccountStatusBadge status={acc.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </div>
  );
}
