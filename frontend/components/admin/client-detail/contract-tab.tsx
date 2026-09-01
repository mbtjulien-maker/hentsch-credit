"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Download, Eye, FileSignature, Send, ShieldCheck } from "lucide-react";
import { AdminCard, AdminCardHeader, AdminEmptyState, AdminField } from "@/components/admin/admin-ui";
import { ContractStatusBadge } from "@/components/admin/status-badge";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ContractPreviewDialog } from "@/components/admin/client-detail/contract-preview-dialog";
import { ADMIN_BTN_PRIMARY, ADMIN_BTN_SECONDARY, ADMIN_DIVIDER, ADMIN_FOCUS_RING } from "@/lib/admin-theme";
import type { AdminClient } from "@/lib/admin-mock-data";
import { formatPercentPlain } from "@/lib/admin-format";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

const STAGES: { key: "generatedAt" | "sentAt" | "signedAt" | "countersignedAt"; label: string }[] = [
  { key: "generatedAt", label: "Contrat généré" },
  { key: "sentAt", label: "Envoyé au client" },
  { key: "signedAt", label: "Signé par le client" },
  { key: "countersignedAt", label: "Contresigné par la banque" },
];

// Onglet "Contrat" — détail de l'étape "Contrat" du parcours dossier (cf. section 14 du
// brief, entre Décision et Décaissement). L'état du contrat est dérivé de l'étape
// courante du dossier (cf. buildContract dans lib/admin-mock-data.ts) : cet onglet ne
// fait qu'en détailler le contenu (modalités, cycle de vie, document), il ne le stocke
// pas séparément. Les actions (envoyer, marquer signé) restent, comme le reste de cette
// zone de démonstration, locales à la session — aucune API réelle derrière (cf.
// QuickActionsPanel, même principe).
export function ContractTab({ client }: { client: AdminClient }) {
  const { contract, creditRequest } = client;
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState<"SIGN" | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewAutoPrint, setPreviewAutoPrint] = useState(false);

  function runAction(message: string) {
    setPending(true);
    setFeedback(null);
    setTimeout(() => {
      setPending(false);
      setFeedback(message);
    }, 650);
  }

  if (contract.status === "NOT_GENERATED") {
    return (
      <AdminCard>
        <AdminEmptyState
          icon={<FileSignature className="size-8 text-muted-foreground" />}
          title="Aucun contrat pour l'instant"
          description={`Le contrat sera généré automatiquement une fois le dossier ${creditRequest.id} arrivé à l'étape "Contrat" du parcours (actuellement : ${client.dossierStatus.steps[client.dossierStatus.currentStepIndex].label}).`}
        />
      </AdminCard>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <AdminCard>
        <AdminCardHeader
          title="Modalités du contrat"
          description={contract.reference}
          action={
            <div className="flex items-center gap-2">
              <ContractStatusBadge status={contract.status} />
              <button type="button" className={ADMIN_BTN_SECONDARY} onClick={() => { setPreviewAutoPrint(false); setPreviewOpen(true); }}>
                <Eye className="size-3.5 text-primary" />
                Aperçu du contrat
              </button>
            </div>
          }
        />
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <AdminField label="Montant financé" value={formatUsd(creditRequest.amountRequested)} mono />
          <AdminField label="Durée" value={`${creditRequest.durationMonths} mois`} />
          <AdminField label="Mensualité" value={formatUsd(creditRequest.estimatedMonthlyPayment)} mono />
          <AdminField label="Taux nominal annuel" value={formatPercentPlain(contract.nominalRate)} />
          <AdminField label="TAEG" value={formatPercentPlain(contract.apr)} />
          <AdminField label="Coût total du crédit" value={formatUsd(contract.totalInterest)} mono />
          <AdminField label="Montant total dû" value={formatUsd(contract.totalRepayable)} mono />
        </div>
      </AdminCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <AdminCard>
          <AdminCardHeader title="Cycle de vie" />
          <ol className="flex flex-col gap-0">
            {STAGES.map((stage, i) => {
              const date = contract[stage.key];
              const done = date !== null;
              const isLast = i === STAGES.length - 1;
              return (
                <li key={stage.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    {done ? <CheckCircle2 className="size-4 text-chart-3" /> : <Circle className="size-4 text-foreground/15" />}
                    {!isLast && <div className={cn("w-px flex-1", done ? "bg-chart-3/30" : "bg-foreground/[0.08]")} style={{ minHeight: 20 }} />}
                  </div>
                  <div className="pb-4">
                    <p className={cn("text-[13px]", done ? "text-foreground" : "text-muted-foreground")}>{stage.label}</p>
                    {date && <p className="mt-0.5 text-[11.5px] text-muted-foreground">{date}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </AdminCard>

        <AdminCard>
          <AdminCardHeader title="Document" />
          <div className="flex items-center justify-between rounded-lg border border-foreground/[0.06] p-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-foreground/[0.04] text-muted-foreground">
                <FileSignature className="size-[15px]" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] text-foreground">{contract.documentName}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">PDF · {contract.documentSize}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                aria-label="Voir"
                onClick={() => { setPreviewAutoPrint(false); setPreviewOpen(true); }}
                className={cn("flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground", ADMIN_FOCUS_RING)}
              >
                <Eye className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label="Télécharger en PDF"
                onClick={() => {
                  setPreviewAutoPrint(true);
                  setPreviewOpen(true);
                }}
                className={cn("flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground", ADMIN_FOCUS_RING)}
              >
                <Download className="size-3.5" />
              </button>
            </div>
          </div>

          <hr className={cn("my-4 border-t", ADMIN_DIVIDER)} />

          <div className="flex flex-wrap gap-2">
            {contract.status === "SENT" && (
              <>
                <button type="button" disabled={pending} className={ADMIN_BTN_SECONDARY} onClick={() => runAction("Contrat renvoyé au client par e-mail.")}>
                  <Send className="size-3.5 text-primary" />
                  Renvoyer au client
                </button>
                <button type="button" disabled={pending} className={ADMIN_BTN_PRIMARY} onClick={() => setConfirming("SIGN")}>
                  <CheckCircle2 className="size-3.5" />
                  Marquer comme signé
                </button>
              </>
            )}
            {contract.status === "COUNTERSIGNED" && (
              <p className="flex items-center gap-1.5 text-[12.5px] text-chart-3">
                <ShieldCheck className="size-3.5" />
                Contrat signé et contresigné, décaissement autorisé.
              </p>
            )}
          </div>

          {feedback && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-primary/20 bg-primary/[0.06] px-2.5 py-2 text-[12px] text-primary">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}
        </AdminCard>
      </div>

      <ConfirmDialog
        open={confirming === "SIGN"}
        title="Marquer ce contrat comme signé ?"
        description="Confirme la réception de la signature du client. Cette action est tracée dans l'historique du dossier."
        confirmLabel="Confirmer la signature"
        onConfirm={() => {
          setConfirming(null);
          runAction("Contrat marqué comme signé par le client. En attente de contresignature.");
        }}
        onCancel={() => setConfirming(null)}
      />

      {previewOpen && (
        <ContractPreviewDialog
          client={client}
          autoPrint={previewAutoPrint}
          onClose={() => {
            setPreviewOpen(false);
            setPreviewAutoPrint(false);
          }}
        />
      )}
    </div>
  );
}
