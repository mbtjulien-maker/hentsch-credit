import { cn } from "@/lib/utils";
import { TONE_CLASSES, TONE_DOT_CLASSES, type AdminTone } from "@/lib/admin-theme";
import {
  CONTRACT_STATUS_LABELS,
  type AccountStatusAdmin,
  type ContractStatus,
  type DecisionStatus,
  type DocumentStatus,
  type KycStatusAdmin,
  type RiskLevel,
} from "@/lib/admin-mock-data";

// Pastille de statut — vocabulaire de couleur unique dans toute la zone admin (cf. brief
// §2) : vert = positif, orange = attention, rouge = risque/critique uniquement, or =
// élément premium/neutre valorisé, gris = neutre. Un point coloré + libellé, jamais
// seulement la couleur (accessibilité).
export function StatusPill({
  tone,
  label,
  className,
}: {
  tone: AdminTone;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-[3px] text-[11.5px] font-medium whitespace-nowrap",
        TONE_CLASSES[tone],
        className,
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT_CLASSES[tone])} />
      {label}
    </span>
  );
}

const RISK_TONE: Record<RiskLevel, AdminTone> = { LOW: "green", MEDIUM: "orange", HIGH: "red" };
const RISK_LABEL: Record<RiskLevel, string> = {
  LOW: "Risque faible",
  MEDIUM: "Risque modéré",
  HIGH: "Risque élevé",
};
export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  return <StatusPill tone={RISK_TONE[level]} label={RISK_LABEL[level]} className={className} />;
}

const ACCOUNT_TONE: Record<AccountStatusAdmin, AdminTone> = {
  ACTIVE: "green",
  SUSPENDED: "orange",
  CLOSED: "neutral",
  PENDING: "neutral",
};
const ACCOUNT_LABEL: Record<AccountStatusAdmin, string> = {
  ACTIVE: "Actif",
  SUSPENDED: "Suspendu",
  CLOSED: "Clôturé",
  PENDING: "En attente",
};
export function AccountStatusBadge({ status, className }: { status: AccountStatusAdmin; className?: string }) {
  return <StatusPill tone={ACCOUNT_TONE[status]} label={ACCOUNT_LABEL[status]} className={className} />;
}

const KYC_TONE: Record<KycStatusAdmin, AdminTone> = {
  VERIFIED: "green",
  PENDING: "orange",
  REJECTED: "red",
  INCOMPLETE: "orange",
};
const KYC_LABEL: Record<KycStatusAdmin, string> = {
  VERIFIED: "KYC vérifié",
  PENDING: "KYC en attente",
  REJECTED: "KYC refusé",
  INCOMPLETE: "KYC incomplet",
};
export function KycBadge({ status, className }: { status: KycStatusAdmin; className?: string }) {
  return <StatusPill tone={KYC_TONE[status]} label={KYC_LABEL[status]} className={className} />;
}

const DOC_TONE: Record<DocumentStatus, AdminTone> = {
  VERIFIED: "green",
  TO_VERIFY: "orange",
  REJECTED: "red",
  PENDING: "neutral",
};
const DOC_LABEL: Record<DocumentStatus, string> = {
  VERIFIED: "Vérifié",
  TO_VERIFY: "À vérifier",
  REJECTED: "Refusé",
  PENDING: "En attente",
};
export function DocumentStatusBadge({ status, className }: { status: DocumentStatus; className?: string }) {
  return <StatusPill tone={DOC_TONE[status]} label={DOC_LABEL[status]} className={className} />;
}

const DECISION_TONE: Record<DecisionStatus, AdminTone> = {
  PENDING: "neutral",
  APPROVED: "green",
  REJECTED: "red",
  ON_HOLD: "orange",
  ANALYSIS: "gold",
  INFO_REQUESTED: "orange",
};
const DECISION_LABEL: Record<DecisionStatus, string> = {
  PENDING: "En attente",
  APPROVED: "Approuvé",
  REJECTED: "Refusé",
  ON_HOLD: "En pause",
  ANALYSIS: "En analyse",
  INFO_REQUESTED: "Document demandé",
};
export function DecisionBadge({ status, className }: { status: DecisionStatus; className?: string }) {
  return <StatusPill tone={DECISION_TONE[status]} label={DECISION_LABEL[status]} className={className} />;
}

const CONTRACT_TONE: Record<ContractStatus, AdminTone> = {
  NOT_GENERATED: "neutral",
  SENT: "orange",
  COUNTERSIGNED: "green",
};
export function ContractStatusBadge({ status, className }: { status: ContractStatus; className?: string }) {
  return <StatusPill tone={CONTRACT_TONE[status]} label={CONTRACT_STATUS_LABELS[status]} className={className} />;
}
