import Link from "next/link";
import { AdminCard, AdminCardHeader, AdminMetric } from "@/components/admin/admin-ui";
import { RiskBadge } from "@/components/admin/status-badge";
import { ADMIN_CLIENTS } from "@/lib/admin-mock-data";
import { TONE_SOLID } from "@/lib/admin-theme";

// Vue "Risque & Scoring" globale — classement de tous les clients par score interne,
// pour repérer rapidement les dossiers à surveiller. Le détail par composant (capacité de
// remboursement, stabilité…) reste dans l'onglet dédié de la fiche client.
export default function AdminRiskPage() {
  const sorted = [...ADMIN_CLIENTS].sort((a, b) => a.riskScore - b.riskScore);
  const avgScore = Math.round(ADMIN_CLIENTS.reduce((sum, c) => sum + c.riskScore, 0) / ADMIN_CLIENTS.length);
  const highRisk = ADMIN_CLIENTS.filter((c) => c.riskLevel === "HIGH").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-foreground">Risque & Scoring</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">Classement des clients par score de risque interne.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <AdminCard>
          <AdminMetric label="Score moyen" value={`${avgScore}/850`} />
        </AdminCard>
        <AdminCard>
          <AdminMetric label="Clients à risque élevé" value={highRisk} accent="text-destructive" />
        </AdminCard>
      </div>

      <AdminCard padded={false}>
        <div className="px-5 pt-5">
          <AdminCardHeader title="Clients par niveau de risque" description="Du plus au moins prioritaire à surveiller." />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-foreground/[0.07] text-[10.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
                <th className="px-5 py-2.5 font-medium text-[11px]">Client</th>
                <th className="px-5 py-2.5 font-medium text-[11px]">Score</th>
                <th className="px-5 py-2.5 font-medium text-[11px]">Niveau</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => (
                <tr key={c.id} className="border-b border-foreground/[0.05] last:border-b-0 hover:bg-foreground/[0.02]">
                  <td className="px-5 py-2.5">
                    <Link href={`/admin/clients/${c.id}`} className="text-foreground hover:underline">
                      {c.firstName} {c.lastName}
                    </Link>
                  </td>
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="w-10 tabular-nums text-foreground">{c.riskScore}</span>
                      <div className="h-1.5 w-32 overflow-hidden rounded-full bg-foreground/[0.06]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(c.riskScore / 850) * 100}%`,
                            backgroundColor: TONE_SOLID[c.riskLevel === "LOW" ? "green" : c.riskLevel === "MEDIUM" ? "orange" : "red"],
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-2.5">
                    <RiskBadge level={c.riskLevel} />
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
