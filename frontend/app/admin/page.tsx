import Link from "next/link";
import { ArrowUpRight, TrendingDown, TrendingUp, Users } from "lucide-react";
import { AdminCard, AdminCardHeader, AdminMetric } from "@/components/admin/admin-ui";
import { DecisionBadge, RiskBadge } from "@/components/admin/status-badge";
import { ADMIN_CLIENTS, AUDIT_LOG, DASHBOARD_KPIS, PIPELINE_COUNTS } from "@/lib/admin-mock-data";
import { formatEurCompact } from "@/lib/admin-format";

// Dashboard back-office — vue d'ensemble : volumétrie de clients/dossiers, pipeline de
// traitement des demandes de crédit, portefeuille encours, activité récente. Chiffres
// issus du fixture mock (cf. lib/admin-mock-data.ts) : usage de démonstration uniquement.
export default function AdminDashboardPage() {
  const maxPipeline = Math.max(...PIPELINE_COUNTS.map((p) => p.count));
  const recentClients = ADMIN_CLIENTS.slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-foreground">Dashboard</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">Vue d&apos;ensemble de l&apos;activité back-office.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <AdminCard>
          <AdminMetric
            label="Clients"
            value={DASHBOARD_KPIS.totalClients.toLocaleString("fr-FR")}
            sub={
              <span className="inline-flex items-center gap-1 text-chart-3">
                <TrendingUp className="size-3" /> +4,2% ce mois-ci
              </span>
            }
          />
        </AdminCard>
        <AdminCard>
          <AdminMetric
            label="Dossiers de crédit actifs"
            value={DASHBOARD_KPIS.activeCreditFiles}
            sub={`${DASHBOARD_KPIS.pendingAnalysis} en analyse`}
          />
        </AdminCard>
        <AdminCard>
          <AdminMetric
            label="Encours total"
            value={formatEurCompact(DASHBOARD_KPIS.totalOutstanding)}
            sub="Crédits actifs, capital restant dû"
            accent="text-primary"
          />
        </AdminCard>
        <AdminCard>
          <AdminMetric
            label="Taux de défaut"
            value={`${DASHBOARD_KPIS.defaultRate}%`}
            sub={
              <span className="inline-flex items-center gap-1 text-chart-3">
                <TrendingDown className="size-3" /> -0,3 pt vs trimestre précédent
              </span>
            }
          />
        </AdminCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <AdminCard className="lg:col-span-2">
          <AdminCardHeader
            title="Pipeline des dossiers de crédit"
            description="Répartition des dossiers actifs par étape du parcours."
          />
          <div className="flex flex-col gap-3">
            {PIPELINE_COUNTS.map((step) => (
              <div key={step.label} className="flex items-center gap-3">
                <span className="w-36 shrink-0 text-xs text-muted-foreground">{step.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-foreground/[0.06]">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(step.count / maxPipeline) * 100}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-xs tabular-nums text-foreground">{step.count}</span>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard>
          <AdminCardHeader title="Délai moyen de traitement" />
          <div className="flex items-baseline gap-2">
            <span className="text-[28px] leading-none font-semibold tracking-[-0.01em] tabular-nums text-foreground">{DASHBOARD_KPIS.avgProcessingDays}</span>
            <span className="text-sm text-muted-foreground">jours, de la soumission à la décision</span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {DASHBOARD_KPIS.approvedThisMonth} dossiers approuvés ce mois-ci.
          </p>
        </AdminCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <AdminCard className="lg:col-span-2" padded={false}>
          <div className="flex items-start justify-between px-5 pt-5">
            <AdminCardHeader title="Clients récents" description="Derniers dossiers ouverts ou mis à jour." />
            <Link href="/admin/clients" className="flex shrink-0 items-center gap-1 text-[12px] font-medium text-primary hover:underline">
              Voir tous les clients <ArrowUpRight className="size-3" />
            </Link>
          </div>
          <div className="flex flex-col">
            {recentClients.map((c) => (
              <Link
                key={c.id}
                href={`/admin/clients/${c.id}`}
                className="flex items-center justify-between gap-3 border-t border-foreground/[0.06] px-5 py-2.5 transition-colors hover:bg-foreground/[0.02]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-foreground/[0.06] text-xs font-semibold text-foreground">
                    {c.initials}
                  </div>
                  <div>
                    <p className="text-sm text-foreground">
                      {c.firstName} {c.lastName}
                    </p>
                    <p className="font-mono text-[11px] text-muted-foreground">{c.id}</p>
                  </div>
                </div>
                <div className="hidden items-center gap-3 sm:flex">
                  <RiskBadge level={c.riskLevel} />
                  <DecisionBadge status={c.creditRequest.status} />
                </div>
              </Link>
            ))}
          </div>
        </AdminCard>

        <AdminCard padded={false}>
          <div className="px-5 pt-5">
            <AdminCardHeader title="Journal d'audit" description="Activité récente sur les dossiers." />
          </div>
          <div className="flex flex-col">
            {AUDIT_LOG.slice(0, 6).map((entry, i) => (
              <div key={i} className="flex items-start gap-3 border-t border-foreground/[0.06] px-5 py-2.5">
                <Users className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-xs text-foreground">{entry.action}</p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {entry.user} · {entry.target}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                    {entry.date} · {entry.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
