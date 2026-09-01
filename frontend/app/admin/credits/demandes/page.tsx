"use client";

import { useEffect, useState } from "react";
import { CreditRequestTable } from "@/components/admin/credit-request-table";
import { api, ApiError, type AdminClientSummary } from "@/lib/api";

// Réel depuis cette page (cf. AdminClientsService.presentSummary/computeDossierCategory)
// — remplace le filtre sur ADMIN_CLIENTS (données de démonstration) : DEMANDE correspond
// à une CreditRequest réelle au statut PENDING, jamais au parcours fictif à 8 étapes.
export default function CreditRequestsQueuePage() {
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

  const filtered = (clients ?? []).filter((c) => c.dossierCategory === "DEMANDE");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-foreground">Demandes de crédit</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">Dossiers venant d&apos;être soumis, en attente de traitement initial.</p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!error && !clients ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <CreditRequestTable clients={filtered} title="File d'attente" description={`${filtered.length} nouvelles demandes`} />
      )}
    </div>
  );
}
