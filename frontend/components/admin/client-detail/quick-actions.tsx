"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  FileQuestion,
  FileSearch,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ADMIN_CARD, ADMIN_DIVIDER, ADMIN_FOCUS_RING } from "@/lib/admin-theme";
import { cn } from "@/lib/utils";
import type { AdminClient } from "@/lib/admin-mock-data";

type ActionKey = "APPROVE" | "REJECT" | "HOLD" | "REQUEST_DOC" | "CONTACT" | "VERIFY";

const NON_CRITICAL: { key: ActionKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "CONTACT", label: "Contacter le client", icon: MessageCircle },
  { key: "REQUEST_DOC", label: "Demander un document", icon: FileQuestion },
  { key: "VERIFY", label: "Vérifier le dossier", icon: FileSearch },
];

// Colonne d'actions rapides — section 20 du brief, persistante quel que soit l'onglet
// actif. Les actions critiques (approuver / refuser / mettre en attente) passent
// systématiquement par une confirmation (ConfirmDialog) : "chaque décision majeure doit
// être justifiable et traçable" (cf. §15/§26). État purement local à la démonstration —
// aucune API réelle n'est appelée, cf. lib/admin-mock-data.ts.
export function QuickActionsPanel({ client }: { client: AdminClient }) {
  const [pendingAction, setPendingAction] = useState<ActionKey | null>(null);
  const [confirming, setConfirming] = useState<"APPROVE" | "REJECT" | "HOLD" | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  function runAction(key: ActionKey, message: string) {
    setPendingAction(key);
    setFeedback(null);
    setTimeout(() => {
      setPendingAction(null);
      setFeedback(message);
    }, 650);
  }

  function handleCriticalConfirm() {
    if (confirming === "APPROVE") runAction("APPROVE", "Dossier approuvé. Le client et l'analyste ont été notifiés.");
    if (confirming === "REJECT") runAction("REJECT", "Dossier refusé. Une notification a été envoyée au client.");
    if (confirming === "HOLD") runAction("HOLD", "Dossier mis en pause en attente de compléments.");
    setConfirming(null);
  }

  return (
    <>
      <div className={cn(ADMIN_CARD, "flex flex-col gap-4 p-4")}>
        <div>
          <h3 className="text-[13px] font-semibold tracking-[-0.01em] text-foreground">Actions rapides</h3>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{client.creditRequest.id}</p>
        </div>

        <div className="flex flex-col gap-0.5">
          {NON_CRITICAL.map((a) => (
            <button
              key={a.key}
              type="button"
              disabled={pendingAction === a.key}
              onClick={() =>
                runAction(
                  a.key,
                  a.key === "CONTACT"
                    ? "Une demande de contact a été enregistrée pour ce client."
                    : a.key === "REQUEST_DOC"
                      ? "Une demande de document complémentaire a été envoyée au client."
                      : "Vérification du dossier lancée, statut mis à jour sous peu.",
                )
              }
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-foreground/[0.04] disabled:pointer-events-none disabled:opacity-60",
                ADMIN_FOCUS_RING,
              )}
            >
              {pendingAction === a.key ? (
                <Loader2 className="size-[15px] shrink-0 animate-spin text-primary" />
              ) : (
                <a.icon className="size-[15px] shrink-0 text-muted-foreground" />
              )}
              {a.label}
            </button>
          ))}
        </div>

        <hr className={cn("border-t", ADMIN_DIVIDER)} />

        <div className="flex flex-col gap-1.5">
          <span className="text-[10.5px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">Décision</span>
          <button
            type="button"
            onClick={() => setConfirming("APPROVE")}
            className={cn(
              "flex items-center gap-2.5 rounded-md border border-chart-3/25 px-2.5 py-2 text-left text-[13px] font-medium text-chart-3 transition-colors hover:bg-chart-3/10",
              ADMIN_FOCUS_RING,
            )}
          >
            <CheckCircle2 className="size-[15px] shrink-0" />
            Approuver
          </button>
          <button
            type="button"
            onClick={() => setConfirming("HOLD")}
            className={cn(
              "flex items-center gap-2.5 rounded-md border border-warning/25 px-2.5 py-2 text-left text-[13px] font-medium text-warning transition-colors hover:bg-warning/10",
              ADMIN_FOCUS_RING,
            )}
          >
            <Clock className="size-[15px] shrink-0" />
            Mettre en attente
          </button>
          <button
            type="button"
            onClick={() => setConfirming("REJECT")}
            className={cn(
              "flex items-center gap-2.5 rounded-md border border-destructive/25 px-2.5 py-2 text-left text-[13px] font-medium text-destructive transition-colors hover:bg-destructive/10",
              ADMIN_FOCUS_RING,
            )}
          >
            <XCircle className="size-[15px] shrink-0" />
            Refuser
          </button>
        </div>

        <button
          type="button"
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground",
            ADMIN_FOCUS_RING,
          )}
        >
          <MoreHorizontal className="size-3.5" />
          Plus d&apos;actions
        </button>

        {feedback && (
          <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/[0.06] px-2.5 py-2 text-[12px] text-primary">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirming === "APPROVE"}
        title="Approuver ce dossier de crédit ?"
        description={`${client.creditRequest.amountRequested.toLocaleString("fr-FR")} € seront débloqués pour ${client.firstName} ${client.lastName}. Cette action est tracée dans le journal d'audit.`}
        confirmLabel="Approuver le dossier"
        onConfirm={handleCriticalConfirm}
        onCancel={() => setConfirming(null)}
      />
      <ConfirmDialog
        open={confirming === "REJECT"}
        title="Refuser ce dossier de crédit ?"
        description="Le client sera notifié du refus. Cette décision reste consultable dans l'historique du dossier."
        confirmLabel="Refuser le dossier"
        danger
        onConfirm={handleCriticalConfirm}
        onCancel={() => setConfirming(null)}
      />
      <ConfirmDialog
        open={confirming === "HOLD"}
        title="Mettre ce dossier en attente ?"
        description="Le traitement du dossier sera suspendu jusqu'à nouvelle action d'un analyste."
        confirmLabel="Mettre en attente"
        onConfirm={handleCriticalConfirm}
        onCancel={() => setConfirming(null)}
      />
    </>
  );
}
