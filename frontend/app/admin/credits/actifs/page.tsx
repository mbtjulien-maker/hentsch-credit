"use client";

import { useEffect, useState } from "react";
import { CreditRequestTable } from "@/components/admin/credit-request-table";
import { AdminCard, AdminMetric } from "@/components/admin/admin-ui";
import { api, ApiError, type AdminClientSummary } from "@/lib/api";
import { formatUsd } from "@/lib/format";

// Réel (cf. AdminClientsService.computeDossierCategory) — ACTIF correspond à une
// CreditRequest FULFILLED dont la CreditPosition est encore ACTIVE (crédit émis, en
// cours de remboursement), jamais au parcours fictif à 8 étapes.
export default function ActiveCreditsPage() {
  const [clients, setClients] = useState<AdminClientSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const filtered = (clients ?? []).filter((c) => c.dossierCategory === "ACTIF");
  const totalOutstanding = filtered.reduce((sum, c) => sum + c.creditRequest.amountRequested, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-foreground">Crédits actifs</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">Crédits approuvés et décaissés, en cours de remboursement.</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <AdminCard>
          <AdminMetric label="Crédits actifs" value={filtered.length} />
        </AdminCard>
        <AdminCard>
          <AdminMetric label="Encours cumulé" value={formatUsd(totalOutstanding)} accent="text-primary" />
        </AdminCard>
      </div>

      {!error && !clients ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <CreditRequestTable clients={filtered} title="Portefeuille actif" description={`${filtered.length} crédits en cours`} />
      )}
    </div>
  );
}
