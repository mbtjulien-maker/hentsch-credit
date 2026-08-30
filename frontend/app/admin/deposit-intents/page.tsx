"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, Inbox, Loader2, X } from "lucide-react";
import { AdminCard, AdminEmptyState } from "@/components/admin/admin-ui";
import { ADMIN_BTN_DANGER, ADMIN_BTN_PRIMARY, ADMIN_INPUT } from "@/lib/admin-theme";
import { api, ApiError, type PendingDepositIntent } from "@/lib/api";
import { CHAIN_LABELS, CURRENCY_LABELS, formatDate, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

// Validation manuelle des dépôts déclarés sur une adresse mutualisée (cf.
// ManagedDepositAddress / DepositIntentsModule) : plusieurs clients partagent la même
// adresse, donc aucun webhook ne peut attribuer automatiquement les fonds reçus au bon
// client — un conseiller rapproche chaque déclaration avec le virement réellement reçu,
// puis valide (crédite le solde) ou rejette.
export default function AdminDepositIntentsPage() {
  const [intents, setIntents] = useState<PendingDepositIntent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refTxById, setRefTxById] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});

  function load() {
    api
      .listPendingDepositIntents()
      .then(setIntents)
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
      });
  }

  useEffect(() => {
    load();
  }, []);

  async function handleConfirm(id: string) {
    setBusyId(id);
    setRowError((prev) => ({ ...prev, [id]: "" }));
    try {
      await api.confirmDepositIntent(id, refTxById[id]?.trim() || undefined);
      setIntents((prev) => prev?.filter((i) => i.id !== id) ?? null);
    } catch (err) {
      setRowError((prev) => ({
        ...prev,
        [id]: err instanceof ApiError ? err.message : "Une erreur est survenue.",
      }));
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string) {
    setBusyId(id);
    setRowError((prev) => ({ ...prev, [id]: "" }));
    try {
      await api.rejectDepositIntent(id);
      setIntents((prev) => prev?.filter((i) => i.id !== id) ?? null);
    } catch (err) {
      setRowError((prev) => ({
        ...prev,
        [id]: err instanceof ApiError ? err.message : "Une erreur est survenue.",
      }));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-foreground">Dépôts à valider</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {intents ? `${intents.length} déclaration${intents.length === 1 ? "" : "s"} en attente.` : "Chargement…"}{" "}
          Adresse de dépôt mutualisée entre tous les clients : vérifiez la réception réelle des fonds avant
          de valider.
        </p>
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
          {intents && intents.length === 0 ? (
            <AdminEmptyState
              icon={<Inbox className="size-8 text-muted-foreground" />}
              title="Aucun dépôt en attente"
              description="Les déclarations de dépôt sur adresse mutualisée apparaîtront ici."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-foreground/[0.07] text-[10.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
                    <th className="px-5 py-2.5 font-medium text-[11px]">Client</th>
                    <th className="px-5 py-2.5 font-medium text-[11px]">Actif / Réseau</th>
                    <th className="px-5 py-2.5 font-medium text-[11px]">Montant déclaré</th>
                    <th className="px-5 py-2.5 font-medium text-[11px]">Valeur estimée</th>
                    <th className="px-5 py-2.5 font-medium text-[11px]">Déclaré le</th>
                    <th className="px-5 py-2.5 font-medium text-[11px]">Référence tx (optionnel)</th>
                    <th className="px-5 py-2.5 text-right font-medium text-[11px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {intents?.map((intent) => (
                    <tr key={intent.id} className="border-b border-foreground/[0.05] last:border-b-0 hover:bg-foreground/[0.02]">
                      <td className="px-5 py-2.5">
                        <p className="font-medium text-foreground">{intent.user.email}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {intent.user.managedWallet?.reference ?? intent.user.id}
                        </p>
                      </td>
                      <td className="px-5 py-2.5 text-foreground">
                        {intent.currency ? CURRENCY_LABELS[intent.currency] : "—"} ·{" "}
                        {intent.chain ? CHAIN_LABELS[intent.chain] : "—"}
                      </td>
                      <td className="px-5 py-2.5 tabular-nums text-foreground">
                        {intent.tokenAmount ?? "—"} {intent.currency}
                      </td>
                      <td className="px-5 py-2.5 tabular-nums text-muted-foreground">{formatUsd(intent.amount)}</td>
                      <td className="px-5 py-2.5 whitespace-nowrap text-muted-foreground">{formatDate(intent.createdAt)}</td>
                      <td className="px-5 py-2.5">
                        <input
                          value={refTxById[intent.id] ?? ""}
                          onChange={(e) => setRefTxById((prev) => ({ ...prev, [intent.id]: e.target.value }))}
                          placeholder="0x…"
                          className={cn(ADMIN_INPUT, "w-40 font-mono text-xs")}
                        />
                      </td>
                      <td className="px-5 py-2.5">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={busyId === intent.id}
                            onClick={() => handleReject(intent.id)}
                            className={cn(ADMIN_BTN_DANGER, "px-2.5")}
                            aria-label="Rejeter"
                          >
                            {busyId === intent.id ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
                          </button>
                          <button
                            type="button"
                            disabled={busyId === intent.id}
                            onClick={() => handleConfirm(intent.id)}
                            className={cn(ADMIN_BTN_PRIMARY, "px-2.5")}
                            aria-label="Valider"
                          >
                            {busyId === intent.id ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                          </button>
                        </div>
                        {rowError[intent.id] && (
                          <p className="mt-1 max-w-48 text-right text-[11px] text-destructive">{rowError[intent.id]}</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      )}
    </div>
  );
}
