import { CreditRequestTable } from "@/components/admin/credit-request-table";
import { ADMIN_CLIENTS } from "@/lib/admin-mock-data";

export default function CreditRequestsQueuePage() {
  const clients = ADMIN_CLIENTS.filter((c) => c.dossierStatus.currentStepIndex <= 1);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-foreground">Demandes de crédit</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">Dossiers venant d&apos;être soumis, en attente de traitement initial.</p>
      </div>
      <CreditRequestTable clients={clients} title="File d'attente" description={`${clients.length} nouvelles demandes`} />
    </div>
  );
}
