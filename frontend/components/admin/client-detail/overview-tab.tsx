import { CheckCircle2, Circle } from "lucide-react";
import { AdminCard, AdminCardHeader, AdminField, AdminMetric } from "@/components/admin/admin-ui";
import { DecisionBadge } from "@/components/admin/status-badge";
import type { AdminClient } from "@/lib/admin-mock-data";
import { formatPercentPlain } from "@/lib/admin-format";
import { formatUsd } from "@/lib/format";
import { TONE_SOLID } from "@/lib/admin-theme";
import { cn } from "@/lib/utils";

// Onglet "Vue d'ensemble" — synthèse des éléments les plus consultés d'un dossier :
// demande de crédit (§10), avancement du dossier (§14), score de risque en un coup
// d'œil (§13), comptes bancaires (§9). Sert de point d'entrée avant d'aller au détail
// dans les autres onglets.
export function OverviewTab({ client }: { client: AdminClient }) {
  return (
    <div className="flex flex-col gap-5">
      <AdminCard>
        <AdminCardHeader
          title="Demande de crédit"
          description={client.creditRequest.product}
          action={<DecisionBadge status={client.creditRequest.status} />}
        />
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <AdminMetric label="Montant demandé" value={formatUsd(client.creditRequest.amountRequested)} accent="text-primary" />
          <AdminMetric label="Durée" value={`${client.creditRequest.durationMonths} mois`} />
          <AdminMetric label="Mensualité estimée" value={formatUsd(client.creditRequest.estimatedMonthlyPayment)} />
          <AdminMetric label="Taux proposé" value={formatPercentPlain(client.creditRequest.proposedRate)} />
        </div>
        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t border-foreground/[0.06] pt-4">
          <AdminField label="Objet" value={client.creditRequest.purpose} />
          <AdminField label="Date de la demande" value={client.creditRequest.requestDate} />
        </div>
      </AdminCard>

      <AdminCard>
        <AdminCardHeader title="Avancement du dossier" description="Étape actuelle du parcours de traitement." />
        <ol className="flex flex-col gap-0">
          {client.dossierStatus.steps.map((step, i) => {
            const done = i <= client.dossierStatus.currentStepIndex;
            const current = i === client.dossierStatus.currentStepIndex;
            const isLast = i === client.dossierStatus.steps.length - 1;
            return (
              <li key={step.key} className="flex gap-3">
                <div className="flex flex-col items-center">
                  {done ? (
                    <CheckCircle2 className={cn("size-4", current ? "text-primary" : "text-chart-3")} />
                  ) : (
                    <Circle className="size-4 text-foreground/15" />
                  )}
                  {!isLast && <div className={cn("w-px flex-1", done ? "bg-chart-3/30" : "bg-foreground/[0.08]")} style={{ minHeight: 20 }} />}
                </div>
                <div className="pb-4">
                  <p className={cn("text-[13px]", current ? "font-semibold text-foreground" : done ? "text-foreground" : "text-muted-foreground")}>
                    {step.label}
                    {current && (
                      <span className="ml-2 rounded-md bg-primary/10 px-1.5 py-[1px] text-[10px] font-semibold tracking-[0.03em] text-primary">
                        EN COURS
                      </span>
                    )}
                  </p>
                  {step.date && <p className="mt-0.5 text-[11.5px] text-muted-foreground">{step.date}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      </AdminCard>

      <div className="grid gap-5 sm:grid-cols-2">
        <AdminCard>
          <AdminCardHeader title="Score de risque interne" />
          <div className="flex items-end gap-1.5">
            <span className="text-[28px] leading-none font-semibold tracking-[-0.01em] tabular-nums text-foreground">
              {client.riskScoring.score}
            </span>
            <span className="pb-0.5 text-[13px] text-muted-foreground">/ 850</span>
          </div>
          <div className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-foreground/[0.06]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(client.riskScoring.score / 850) * 100}%`,
                backgroundColor: TONE_SOLID[client.riskLevel === "LOW" ? "green" : client.riskLevel === "MEDIUM" ? "orange" : "red"],
              }}
            />
          </div>
        </AdminCard>

        <AdminCard>
          <AdminCardHeader title="Comptes bancaires" />
          <div className="flex flex-col divide-y divide-foreground/[0.05]">
            {client.bankAccounts.map((acc) => (
              <div key={acc.id} className="flex items-center justify-between py-2 text-[13px] first:pt-0 last:pb-0">
                <div>
                  <p className="text-foreground">{acc.type}</p>
                  <p className="text-[11.5px] text-muted-foreground">{acc.ibanMasked}</p>
                </div>
                <p className="tabular-nums text-foreground">{formatUsd(acc.balance)}</p>
              </div>
            ))}
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
