import { CreditRequestTable } from "@/components/admin/credit-request-table";
import { ADMIN_CLIENTS } from "@/lib/admin-mock-data";

export default function CreditFilesInProgressPage() {
  const clients = ADMIN_CLIENTS.filter((c) => c.dossierStatus.currentStepIndex >= 2 && c.dossierStatus.currentStepIndex <= 4);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-foreground">Dossiers en cours</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">Vérification, analyse et décision en cours de traitement.</p>
      </div>
      <CreditRequestTable clients={clients} title="Dossiers en instruction" description={`${clients.length} dossiers actifs`} />
    </div>
  );
}
