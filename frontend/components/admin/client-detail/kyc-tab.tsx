import { AlertTriangle, CheckCircle2, Fingerprint, IdCard, MapPin, ShieldCheck } from "lucide-react";
import { AdminCard, AdminCardHeader } from "@/components/admin/admin-ui";
import { DocumentStatusBadge, KycBadge } from "@/components/admin/status-badge";
import type { AdminClient } from "@/lib/admin-mock-data";
import { cn } from "@/lib/utils";

// Onglet "KYC / Conformité" — section 12 du brief. Volontairement synthétique : ne
// remonte que les statuts de vérification et alertes de conformité, jamais de données
// biométriques ou de documents bruts (déjà accessibles, avec traçabilité, depuis l'onglet
// Documents) — cf. principe "ne jamais exposer de données sensibles inutilement".
export function KycTab({ client }: { client: AdminClient }) {
  const checks = [
    { label: "Identité", status: client.kyc.identity, icon: IdCard },
    { label: "Adresse", status: client.kyc.address, icon: MapPin },
    { label: "Document d'identité", status: client.kyc.idDocument, icon: IdCard },
    { label: "Vérification biométrique", status: client.kyc.biometric, icon: Fingerprint },
  ];

  return (
    <div className="flex flex-col gap-4">
      <AdminCard>
        <AdminCardHeader
          title="Statut de conformité KYC"
          description={client.kyc.verifiedAt ? `Vérifié le ${client.kyc.verifiedAt}` : "Vérification non finalisée"}
          action={<KycBadge status={client.kyc.status} />}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {checks.map((check) => (
            <div key={check.label} className="rounded-xl border border-foreground/[0.07] p-4">
              <check.icon className="size-4 text-muted-foreground" />
              <p className="mt-2 text-xs font-medium text-foreground">{check.label}</p>
              <div className="mt-2">
                <DocumentStatusBadge status={check.status} />
              </div>
            </div>
          ))}
        </div>
      </AdminCard>

      <AdminCard>
        <AdminCardHeader title="Alertes de conformité" />
        {client.kyc.alerts.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-chart-3" />
            Aucune alerte active sur ce dossier.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {client.kyc.alerts.map((alert, i) => (
              <div key={i} className={cn("flex items-start gap-2 rounded-lg border border-warning/25 bg-warning/10 px-3 py-2.5 text-sm text-warning")}>
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                {alert}
              </div>
            ))}
          </div>
        )}
      </AdminCard>

      <AdminCard>
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            L&apos;accès aux pièces justificatives détaillées est réservé aux rôles habilités et journalisé (cf. onglet Historique).
          </p>
        </div>
      </AdminCard>
    </div>
  );
}
