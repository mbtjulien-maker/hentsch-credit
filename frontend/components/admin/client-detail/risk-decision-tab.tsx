import { ShieldCheck } from "lucide-react";
import { AdminCard, AdminCardHeader, AdminField } from "@/components/admin/admin-ui";
import { DecisionBadge, RiskBadge } from "@/components/admin/status-badge";
import type { AdminClient } from "@/lib/admin-mock-data";
import { formatEur } from "@/lib/admin-format";
import { cn } from "@/lib/utils";

function ScoreBar({ label, value }: { label: string; value: number }) {
  const tone = value >= 75 ? "var(--chart-3)" : value >= 50 ? "var(--primary)" : "var(--warning)";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums text-foreground">{value}/100</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-foreground/[0.06]">
        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: tone }} />
      </div>
    </div>
  );
}

// Onglet "Risque & Décision" — sections 13 (scoring détaillé), 15 (décision de crédit),
// 16 (garanties) du brief. Le score n'est jamais présenté comme un verdict arbitraire :
// chaque composant (capacité de remboursement, stabilité des revenus…) reste visible et
// justifie le score global — cf. brief §13, "élément d'analyse, pas décision arbitraire".
export function RiskDecisionTab({ client }: { client: AdminClient }) {
  const { riskScoring, creditDecision, guarantees } = client;

  return (
    <div className="flex flex-col gap-4">
      <AdminCard>
        <AdminCardHeader
          title="Score interne"
          description="Analyse composite : capacité de remboursement, stabilité, historique et complétude du dossier."
          action={<RiskBadge level={riskScoring.level} />}
        />
        <div className="mb-5 flex items-end gap-2">
          <span className="text-4xl font-semibold tabular-nums text-foreground">{riskScoring.score}</span>
          <span className="pb-1 text-sm text-muted-foreground">/ 850</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <ScoreBar label="Capacité de remboursement" value={riskScoring.repaymentCapacity} />
          <ScoreBar label="Stabilité des revenus" value={riskScoring.incomeStability} />
          <ScoreBar label="Niveau d'endettement (inversé)" value={100 - riskScoring.debtRatio} />
          <ScoreBar label="Historique de paiement" value={riskScoring.paymentHistory} />
          <ScoreBar label="Stabilité professionnelle" value={riskScoring.professionalStability} />
          <ScoreBar label="Complétude du dossier" value={riskScoring.fileCompleteness} />
        </div>
      </AdminCard>

      <AdminCard className="border-primary/20">
        <AdminCardHeader title="Décision de crédit" action={<DecisionBadge status={creditDecision.status} />} />
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <AdminField label="Analyste responsable" value={creditDecision.analyst} />
          <AdminField label="Date d'affectation" value={creditDecision.assignedAt} />
          <AdminField label="Statut" value={<DecisionBadge status={creditDecision.status} />} />
        </div>
        <div className="mt-4 flex flex-col gap-3 border-t border-foreground/[0.06] pt-4">
          <AdminField label="Résumé de l'analyse" value={creditDecision.summary} />
          <AdminField label="Recommandation" value={creditDecision.recommendation} />
        </div>
      </AdminCard>

      <AdminCard>
        <AdminCardHeader title="Garanties" />
        {guarantees.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="size-4" />
            Aucune garantie requise pour ce produit de crédit.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {guarantees.map((g, i) => (
              <div key={i} className="rounded-xl border border-foreground/[0.07] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">
                    {g.type} : {g.description}
                  </p>
                  <span className={cn("text-[11px]", g.verified ? "text-chart-3" : "text-muted-foreground")}>
                    {g.verified ? "Vérifiée" : "Non vérifiée"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                  <AdminField label="Propriétaire" value={g.owner} />
                  <AdminField label="Valeur déclarée" value={formatEur(g.declaredValue)} mono />
                  <AdminField label="Valeur retenue" value={formatEur(g.retainedValue)} mono />
                  <AdminField label="Évaluée le" value={g.evaluatedAt} />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Documents : {g.documents.join(", ")}</p>
              </div>
            ))}
          </div>
        )}
      </AdminCard>
    </div>
  );
}
