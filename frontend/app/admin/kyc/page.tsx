import Link from "next/link";
import { AdminCard, AdminCardHeader, AdminMetric } from "@/components/admin/admin-ui";
import { KycBadge } from "@/components/admin/status-badge";
import { AlertTriangle } from "lucide-react";
import { ADMIN_CLIENTS } from "@/lib/admin-mock-data";

// Vue "KYC / Conformité" globale — file de vérification transverse, tous clients
// confondus. La fiche client (onglet KYC) reste la vue de référence pour le détail d'un
// dossier ; cette page sert de vue de pilotage pour l'équipe conformité.
export default function AdminKycPage() {
  const verified = ADMIN_CLIENTS.filter((c) => c.kycStatus === "VERIFIED").length;
  const pending = ADMIN_CLIENTS.filter((c) => c.kycStatus === "PENDING" || c.kycStatus === "INCOMPLETE").length;
  const rejected = ADMIN_CLIENTS.filter((c) => c.kycStatus === "REJECTED").length;
  const withAlerts = ADMIN_CLIENTS.filter((c) => c.kyc.alerts.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-foreground">KYC / Conformité</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">Pilotage de la vérification d&apos;identité sur l&apos;ensemble de la base clients.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <AdminCard>
          <AdminMetric label="Clients" value={ADMIN_CLIENTS.length} />
        </AdminCard>
        <AdminCard>
          <AdminMetric label="Vérifiés" value={verified} accent="text-chart-3" />
        </AdminCard>
        <AdminCard>
          <AdminMetric label="En attente" value={pending} accent="text-warning" />
        </AdminCard>
        <AdminCard>
          <AdminMetric label="Refusés" value={rejected} accent="text-destructive" />
        </AdminCard>
      </div>

      {withAlerts.length > 0 && (
        <AdminCard className="border-destructive/25">
          <AdminCardHeader title="Alertes de conformité actives" />
          <div className="flex flex-col gap-2">
            {withAlerts.map((c) => (
              <Link
                key={c.id}
                href={`/admin/clients/${c.id}`}
                className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/[0.06] px-3 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/[0.1]"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  <strong>
                    {c.firstName} {c.lastName}
                  </strong>{" "}
                  : {c.kyc.alerts[0]}
                </span>
              </Link>
            ))}
          </div>
        </AdminCard>
      )}

      <AdminCard padded={false}>
        <div className="px-5 pt-5">
          <AdminCardHeader title="File de vérification" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-foreground/[0.07] text-[10.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
                <th className="px-5 py-2.5 font-medium text-[11px]">Client</th>
                <th className="px-5 py-2.5 font-medium text-[11px]">Vérifié le</th>
                <th className="px-5 py-2.5 font-medium text-[11px]">Statut</th>
              </tr>
            </thead>
            <tbody>
              {ADMIN_CLIENTS.map((c) => (
                <tr key={c.id} className="border-b border-foreground/[0.05] last:border-b-0 hover:bg-foreground/[0.02]">
                  <td className="px-5 py-2.5">
                    <Link href={`/admin/clients/${c.id}`} className="text-foreground hover:underline">
                      {c.firstName} {c.lastName}
                    </Link>
                  </td>
                  <td className="px-5 py-2.5 text-muted-foreground">{c.kyc.verifiedAt ?? "—"}</td>
                  <td className="px-5 py-2.5">
                    <KycBadge status={c.kycStatus} />
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
