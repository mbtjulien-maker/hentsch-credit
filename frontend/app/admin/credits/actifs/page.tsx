import { CreditRequestTable } from "@/components/admin/credit-request-table";
import { AdminCard, AdminMetric } from "@/components/admin/admin-ui";
import { ADMIN_CLIENTS } from "@/lib/admin-mock-data";
import { formatEur } from "@/lib/admin-format";

export default function ActiveCreditsPage() {
  const clients = ADMIN_CLIENTS.filter((c) => c.creditRequest.status === "APPROVED");
  const totalOutstanding = clients.reduce((sum, c) => sum + c.creditRequest.amountRequested, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-foreground">Crédits actifs</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">Crédits approuvés et décaissés, en cours de remboursement.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <AdminCard>
          <AdminMetric label="Crédits actifs" value={clients.length} />
        </AdminCard>
        <AdminCard>
          <AdminMetric label="Encours cumulé" value={formatEur(totalOutstanding)} accent="text-primary" />
        </AdminCard>
      </div>

      <CreditRequestTable clients={clients} title="Portefeuille actif" description={`${clients.length} crédits en cours`} />
    </div>
  );
}
