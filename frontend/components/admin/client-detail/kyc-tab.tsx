"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Fingerprint, IdCard, Loader2, MapPin, ShieldCheck } from "lucide-react";
import { AdminCard, AdminCardHeader, AdminField } from "@/components/admin/admin-ui";
import { DocumentStatusBadge, KycBadge } from "@/components/admin/status-badge";
import { ADMIN_BTN_PRIMARY, ADMIN_BTN_SECONDARY } from "@/lib/admin-theme";
import type { AdminClient } from "@/lib/admin-mock-data";
import { api, ApiError, type AmlRiskLevel, type KycReviewDecision } from "@/lib/api";
import { cn } from "@/lib/utils";

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  CNI: "Carte Nationale d'Identité",
  PASSEPORT: "Passeport biométrique",
  TITRE_SEJOUR: "Titre de séjour / Résidence",
};
const CHECK_METHOD_LABELS: Record<string, string> = {
  FACE_A_FACE: "Présentation physique (agence)",
  PVID: "Vidéo-identification certifiée",
  EIDAS: "Identification électronique eIDAS",
};
const PROOF_TYPE_LABELS: Record<string, string> = {
  FACTURE: "Facture électricité/gaz/eau",
  AVIS_IMPOSITION: "Avis d'imposition récent",
  QUITTANCE: "Quittance de loyer",
};
const FUNDS_ORIGIN_LABELS: Record<string, string> = {
  REVENUS_PROFESSIONNELS: "Revenus professionnels",
  EPARGNE: "Épargne personnelle",
  VENTE_BIENS: "Vente de biens",
  HERITAGE: "Héritage / Donation",
  DIVIDENDES: "Dividendes / Cession d'entreprise",
  AUTRE: "Autre",
};
const RELATIONSHIP_PURPOSE_LABELS: Record<string, string> = {
  COMPTE_COURANT: "Compte courant et moyens de paiement",
  PLACEMENT: "Placement, épargne et gestion de patrimoine",
  FINANCEMENT: "Financement / Crédit",
  OPERATIONS_INTERNATIONALES: "Opérations internationales régulières",
};
const RISK_LEVEL_LABELS: Record<AmlRiskLevel, string> = {
  FAIBLE: "Risque faible",
  STANDARD: "Risque standard",
  ELEVE: "Risque élevé",
};
const KYC_DOCUMENT_CATEGORY_LABELS: Record<string, string> = {
  IDENTITY_FRONT: "Pièce d'identité (recto)",
  IDENTITY_BACK: "Pièce d'identité (verso)",
  PROOF_OF_ADDRESS: "Justificatif de domicile",
};

type KycDocumentEntry = NonNullable<AdminClient["kycDossier"]>["documents"][number];

// Un fichier réellement téléversé par le client (cf. §6 entrée #36 CLAUDE.md) — distinct
// des métadonnées déclaratives affichées juste au-dessus (dossier.identityDocument) :
// ici, un vrai lien de téléchargement vers le contenu binaire stocké côté serveur, avec
// la même action de certification que le reste du dossier (verified/verifiedAt).
function KycDocumentRow({
  userId,
  category,
  document,
  onClientUpdated,
}: {
  userId: string;
  category: string;
  document: KycDocumentEntry | undefined;
  onClientUpdated: (client: AdminClient) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleVerified() {
    if (!document) return;
    setBusy(true);
    setError(null);
    try {
      await api.setAdminKycDocumentVerified(userId, document.id, !document.verified);
      const updated = await api.getAdminClientDetail(userId);
      onClientUpdated(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-foreground/[0.07] p-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs font-medium text-foreground">{KYC_DOCUMENT_CATEGORY_LABELS[category] ?? category}</span>
        {document ? (
          <a
            href={api.getAdminKycDocumentDownloadUrl(userId, document.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-xs font-medium text-primary underline underline-offset-2"
          >
            {document.fileName} · {(document.fileSize / 1024).toFixed(0)} Ko · {document.uploadedAt ?? "—"}
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">Aucun fichier téléversé</span>
        )}
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
      {document && (
        <div className="flex shrink-0 items-center gap-2">
          <span className={cn("text-xs font-medium", document.verified ? "text-chart-3" : "text-muted-foreground")}>
            {document.verified ? "Vérifié" : "Non vérifié"}
          </span>
          <button type="button" onClick={() => void toggleVerified()} disabled={busy} className={ADMIN_BTN_SECONDARY}>
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : document.verified ? "Invalider" : "Valider"}
          </button>
        </div>
      )}
    </div>
  );
}

// "Avis de conformité : Validé / Refusé" (cf. dossier KYC papier §6, "Cadre réservé à la
// banque") — jusqu'à §6 entrée #33 CLAUDE.md, aucune action de ce type n'existait dans
// tout le produit : User.kycStatus ne pouvait changer qu'au seed de démo. Trois niveaux
// de risque sélectionnables avant validation, purement éditorial (cf. RISK_LEVEL en
// §2H) — jamais recalculé automatiquement.
function KycDecisionPanel({
  client,
  onClientUpdated,
}: {
  client: AdminClient;
  onClientUpdated: (client: AdminClient) => void;
}) {
  const [riskLevel, setRiskLevel] = useState<AmlRiskLevel | null>(
    client.kycDossier?.aml.riskLevel ?? null,
  );
  const [submitting, setSubmitting] = useState<KycReviewDecision | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: KycReviewDecision) {
    if (!client.userId) return;
    setSubmitting(decision);
    setError(null);
    try {
      const updated = await api.decideClientKyc(client.userId, {
        decision,
        riskLevel: riskLevel ?? undefined,
      });
      onClientUpdated(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(null);
    }
  }

  const decision = client.kycDossier?.aml.reviewDecision ?? null;

  return (
    <AdminCard>
      <AdminCardHeader
        title="Avis de conformité"
        description={
          decision
            ? `Dernière décision : ${decision === "VALIDE" ? "Validé" : "Refusé"} par ${client.kycDossier?.aml.reviewedBy ?? "—"} le ${client.kycDossier?.aml.reviewedAt ?? "—"}`
            : "Aucune décision de conformité enregistrée sur ce dossier."
        }
      />
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(RISK_LEVEL_LABELS) as AmlRiskLevel[]).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setRiskLevel(level)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                riskLevel === level ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {RISK_LEVEL_LABELS[level]}
            </button>
          ))}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={() => decide("VALIDE")} disabled={!!submitting} className={ADMIN_BTN_PRIMARY}>
            {submitting === "VALIDE" ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
            Valider le KYC
          </button>
          <button
            type="button"
            onClick={() => decide("REFUSE")}
            disabled={!!submitting}
            className={cn(ADMIN_BTN_SECONDARY, "border-destructive/30 text-destructive hover:bg-destructive/10")}
          >
            {submitting === "REFUSE" ? <Loader2 className="size-3.5 animate-spin" /> : <AlertTriangle className="size-3.5" />}
            Refuser le dossier
          </button>
        </div>
      </div>
    </AdminCard>
  );
}

// Onglet "KYC / Conformité" — section 12 du brief. Statuts de vérification synthétiques
// (identité/adresse/document/biométrie) inchangés ; le dossier déclaratif complet (pièce
// d'identité, profil LCB-FT — cf. §6 entrée #33 CLAUDE.md) s'affiche désormais en dessous
// quand la fiche est adossée à un vrai compte, avec l'action de décision qui manquait
// jusqu'ici (cf. KycDecisionPanel).
export function KycTab({
  client,
  onClientUpdated,
}: {
  client: AdminClient;
  onClientUpdated?: (client: AdminClient) => void;
}) {
  const checks = [
    { label: "Identité", status: client.kyc.identity, icon: IdCard },
    { label: "Adresse", status: client.kyc.address, icon: MapPin },
    { label: "Document d'identité", status: client.kyc.idDocument, icon: IdCard },
    { label: "Vérification biométrique", status: client.kyc.biometric, icon: Fingerprint },
  ];
  const canDecide = !!client.userId && !!onClientUpdated;
  const dossier = client.kycDossier;

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

      {canDecide && <KycDecisionPanel client={client} onClientUpdated={onClientUpdated} />}

      {dossier && canDecide && (
        <AdminCard>
          <AdminCardHeader title="Fichiers téléversés" description="Contenu réel — JPEG, PNG ou PDF, stocké côté serveur." />
          <div className="flex flex-col gap-2">
            {(["IDENTITY_FRONT", "IDENTITY_BACK", "PROOF_OF_ADDRESS"] as const).map((category) => (
              <KycDocumentRow
                key={category}
                userId={client.userId!}
                category={category}
                document={dossier.documents.find((d) => d.category === category)}
                onClientUpdated={onClientUpdated!}
              />
            ))}
          </div>
        </AdminCard>
      )}

      {dossier && (
        <>
          <AdminCard>
            <AdminCardHeader
              title="Pièce d'identité déclarée"
              action={
                <span className={cn("text-xs font-medium", dossier.identityDocument.verified ? "text-chart-3" : "text-muted-foreground")}>
                  {dossier.identityDocument.verified ? "Vérifiée" : "Non vérifiée"}
                </span>
              }
            />
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <AdminField
                label="Type de pièce"
                value={dossier.identityDocument.documentType ? DOCUMENT_TYPE_LABELS[dossier.identityDocument.documentType] : "—"}
              />
              <AdminField label="Numéro" value={dossier.identityDocument.documentNumber ?? "—"} mono />
              <AdminField label="Autorité de délivrance" value={dossier.identityDocument.issuingAuthority ?? "—"} />
              <AdminField label="Lieu de délivrance" value={dossier.identityDocument.issuePlace ?? "—"} />
              <AdminField label="Délivrée le" value={dossier.identityDocument.issueDate ?? "—"} />
              <AdminField label="Expire le" value={dossier.identityDocument.expiryDate ?? "—"} />
              <AdminField
                label="Modalité de contrôle"
                value={dossier.identityDocument.identityCheckMethod ? CHECK_METHOD_LABELS[dossier.identityDocument.identityCheckMethod] : "—"}
              />
              <AdminField
                label="Justificatif de domicile"
                value={dossier.identityDocument.proofOfAddressType ? PROOF_TYPE_LABELS[dossier.identityDocument.proofOfAddressType] : "—"}
              />
              <AdminField label="Émetteur du justificatif" value={dossier.identityDocument.proofOfAddressIssuer ?? "—"} />
              <AdminField label="Date du document" value={dossier.identityDocument.proofOfAddressDate ?? "—"} />
            </div>
          </AdminCard>

          <AdminCard>
            <AdminCardHeader title="Profil de conformité LCB-FT" />
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <AdminField
                label="Personne Politiquement Exposée"
                value={dossier.aml.isPoliticallyExposed === null ? "—" : dossier.aml.isPoliticallyExposed ? "Oui" : "Non"}
              />
              <AdminField
                label="Origine des fonds"
                value={dossier.aml.fundsOrigin.length > 0 ? dossier.aml.fundsOrigin.map((v) => FUNDS_ORIGIN_LABELS[v] ?? v).join(", ") : "—"}
              />
              <AdminField
                label="Objet de la relation d'affaires"
                value={dossier.aml.relationshipPurpose.length > 0 ? dossier.aml.relationshipPurpose.map((v) => RELATIONSHIP_PURPOSE_LABELS[v] ?? v).join(", ") : "—"}
              />
              <AdminField label="Attesté (« Lu et approuvé ») le" value={dossier.aml.attestedAt ?? "Non soumis"} />
              <AdminField label="Fait à" value={dossier.aml.attestationCity ?? "—"} />
            </div>
          </AdminCard>
        </>
      )}

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
