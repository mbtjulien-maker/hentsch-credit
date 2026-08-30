import { CreditRequestTable } from "@/components/admin/credit-request-table";
import { ADMIN_CLIENTS } from "@/lib/admin-mock-data";

export default function ClosedCreditsPage() {
  const clients = ADMIN_CLIENTS.filter((c) => c.creditRequest.status === "REJECTED");
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-foreground">Crédits clôturés</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">Dossiers refusés ou soldés, conservés pour l&apos;historique et l&apos;audit.</p>
      </div>
      <CreditRequestTable clients={clients} title="Dossiers clôturés" description={`${clients.length} dossiers`} />
    </div>
  );
}
