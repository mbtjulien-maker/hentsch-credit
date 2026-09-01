"use client";

import { useEffect, useState } from "react";
import { CreditRequestTable } from "@/components/admin/credit-request-table";
import { api, ApiError, type AdminClientSummary } from "@/lib/api";

// Réel (cf. AdminClientsService.computeDossierCategory) — EN_COURS correspond à une
// CreditRequest APPROVED dont le crédit n'est pas encore émis (le client doit encore
// déposer le gage), jamais au parcours fictif à 8 étapes.
export default function CreditFilesInProgressPage() {
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

  const filtered = (clients ?? []).filter((c) => c.dossierCategory === "EN_COURS");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-foreground">Dossiers en cours</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">Demandes approuvées, en attente du dépôt du gage pour émission du crédit.</p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!error && !clients ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <CreditRequestTable clients={filtered} title="Dossiers en instruction" description={`${filtered.length} dossiers actifs`} />
      )}
    </div>
  );
}
