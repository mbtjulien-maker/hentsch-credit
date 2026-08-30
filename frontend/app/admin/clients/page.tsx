"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Search, Users } from "lucide-react";
import { AdminCard, AdminEmptyState } from "@/components/admin/admin-ui";
import { AccountStatusBadge, KycBadge, RiskBadge } from "@/components/admin/status-badge";
import { ADMIN_FOCUS_RING, ADMIN_INPUT } from "@/lib/admin-theme";
import { api, ApiError, type AdminClientSummary } from "@/lib/api";
import { cn } from "@/lib/utils";

type RiskFilter = "LOW" | "MEDIUM" | "HIGH" | "ALL";

const RISK_FILTERS: { value: RiskFilter; label: string }[] = [
  { value: "ALL", label: "Tous les risques" },
  { value: "LOW", label: "Risque faible" },
  { value: "MEDIUM", label: "Risque modéré" },
  { value: "HIGH", label: "Risque élevé" },
];

// Liste des clients — base réelle (cf. backend/src/admin-clients), plus recherche et
// filtre risque en local. Le lien de chaque ligne pointe sur l'identifiant réel du User
// (UUID), pas sur le code d'affichage "CL-XXXXXX" (cf. app/admin/clients/[id]/page.tsx,
// qui sait résoudre les deux).
export default function AdminClientsPage() {
  const [clients, setClients] = useState<AdminClientSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("ALL");

  useEffect(() => {
    let ignore = false;
    api
      .listAdminClients()
      .then((data) => {
        if (!ignore) setClients(data);
      })
      .catch((err: unknown) => {
        if (!ignore) setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
      });
    return () => {
      ignore = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!clients) return [];
    return clients.filter((c) => {
      if (riskFilter !== "ALL" && c.riskLevel !== riskFilter) return false;
      if (query.trim() === "") return true;
      const haystack = `${c.firstName} ${c.lastName} ${c.id} ${c.creditRequest.id} ${c.email}`.toLowerCase();
      return haystack.includes(query.toLowerCase());
    });
  }, [clients, query, riskFilter]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-foreground">Clients</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {clients ? `${clients.length} clients en base.` : "Chargement…"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom, ID client, numéro de dossier, e-mail…"
            className={cn(ADMIN_INPUT, "pl-9")}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {RISK_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setRiskFilter(f.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[12.5px] font-medium transition-colors",
                riskFilter === f.value ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
                ADMIN_FOCUS_RING,
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <AdminCard>
          <div className="flex items-center gap-2 text-[13px] text-destructive">
            <AlertTriangle className="size-4 shrink-0" />
            {error}
          </div>
        </AdminCard>
      )}

      {!error && (
        <AdminCard padded={false} className="overflow-hidden">
          {clients && clients.length === 0 ? (
            <AdminEmptyState
              icon={<Users className="size-8 text-muted-foreground" />}
              title="Aucun client en base"
              description="Les comptes créés via une demande d'ouverture approuvée apparaîtront ici."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-foreground/[0.07] text-[10.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
                    <th className="px-5 py-2.5 font-medium text-[11px]">Client</th>
                    <th className="px-5 py-2.5 font-medium text-[11px]">Dossier</th>
                    <th className="px-5 py-2.5 font-medium text-[11px]">Statut du compte</th>
                    <th className="px-5 py-2.5 font-medium text-[11px]">KYC</th>
                    <th className="px-5 py-2.5 font-medium text-[11px]">Risque</th>
                    <th className="px-5 py-2.5 text-right font-medium text-[11px]">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.userId} className="border-b border-foreground/[0.05] transition-colors last:border-b-0 hover:bg-foreground/[0.02]">
                      <td className="px-5 py-2.5">
                        <Link href={`/admin/clients/${c.userId}`} className="flex items-center gap-3">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground/[0.06] text-xs font-semibold text-foreground">
                            {c.initials}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {c.firstName || c.lastName ? `${c.firstName} ${c.lastName}`.trim() : c.email}
                            </p>
                            <p className="font-mono text-[11px] text-muted-foreground">{c.id}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-5 py-2.5">
                        <p className="font-mono text-xs text-foreground">{c.creditRequest.id}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{c.creditRequest.purpose}</p>
                      </td>
                      <td className="px-5 py-2.5">
                        <AccountStatusBadge status={c.accountStatus} />
                      </td>
                      <td className="px-5 py-2.5">
                        <KycBadge status={c.kycStatus} />
                      </td>
                      <td className="px-5 py-2.5">
                        <RiskBadge level={c.riskLevel} />
                      </td>
                      <td className="px-5 py-2.5 text-right font-semibold tabular-nums text-foreground">{c.riskScore}</td>
                    </tr>
                  ))}
                  {clients && filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                        Aucun client ne correspond à cette recherche.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      )}
    </div>
  );
}
