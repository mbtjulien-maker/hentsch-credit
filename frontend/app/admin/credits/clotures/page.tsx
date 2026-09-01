"use client";

import { useEffect, useState } from "react";
import { CreditRequestTable } from "@/components/admin/credit-request-table";
import { api, ApiError, type AdminClientSummary } from "@/lib/api";

// Réel (cf. AdminClientsService.computeDossierCategory) — CLOTURE regroupe les demandes
// REJECTED et les CreditRequest FULFILLED dont la position est CLOSED ou LIQUIDATED
// (remboursée intégralement ou liquidée), jamais le parcours fictif à 8 étapes.
export default function ClosedCreditsPage() {
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

  const filtered = (clients ?? []).filter((c) => c.dossierCategory === "CLOTURE");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-foreground">Crédits clôturés</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">Dossiers refusés ou soldés, conservés pour l&apos;historique et l&apos;audit.</p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!error && !clients ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <CreditRequestTable clients={filtered} title="Dossiers clôturés" description={`${filtered.length} dossiers`} />
      )}
    </div>
  );
}
