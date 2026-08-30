import { Info } from "lucide-react";
import { AdminCard, AdminCardHeader, AdminDivider, AdminField } from "@/components/admin/admin-ui";

const ROLES = [
  { role: "ADMIN", description: "Accès complet au back-office : dossiers, décisions, paramètres." },
  { role: "CLIENT", description: "Accès à son propre espace uniquement (solde, crédit, cartes)." },
];

// Vue "Paramètres" — aperçu des règles métier et des rôles d'accès en vigueur (cf.
// CLAUDE.md §2 pour les formules de crédit). Volontairement en lecture seule : la
// modification réelle de ces paramètres n'est pas branchée à une API dans cette
// démonstration, mieux vaut l'afficher honnêtement que simuler une sauvegarde inopérante.
export default function AdminSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-foreground">Paramètres</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">Règles métier et accès en vigueur sur la plateforme.</p>
      </div>

      <AdminCard>
        <AdminCardHeader title="Grille de crédit" description="Règles appliquées lors du verrouillage d'un nouveau gage." />
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <AdminField label="Ratio de crédit" value="350% du gage verrouillé" />
          <AdminField
            label="Gages acceptés"
            value="DAI, USDT, USDC, dEURO, XAUT, KAG, ETH, SHIB, XPT, XPD, XCU, WTI"
          />
          <AdminField label="Réseau supporté" value="Ethereum uniquement" />
        </div>
        <AdminDivider className="my-4" />
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          Un changement de taux ne s&apos;applique qu&apos;aux nouveaux verrouillages : une position déjà
          verrouillée conserve le crédit qui lui a été accordé au moment de sa création.
        </p>
      </AdminCard>

      <AdminCard>
        <AdminCardHeader
          title="Adresses de dépôt"
          description="Deux mécanismes coexistent selon l'actif, cf. /admin/deposit-intents."
        />
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <AdminField
            label="Adresse mutualisée (validation manuelle)"
            value="USDT, USDC, dEURO, XAUT, KAG, ETH, SHIB, XPT, XPD, XCU, WTI · Ethereum"
          />
          <AdminField
            label="Adresse individuelle (créditée automatiquement)"
            value="DAI · Ethereum"
          />
        </div>
        <AdminDivider className="my-4" />
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          Les actifs en adresse mutualisée partagent une adresse unique entre tous les clients : le
          rapprochement ne peut pas être automatique, chaque dépôt déclaré est validé manuellement
          (cf. « Dépôts à valider »).
        </p>
      </AdminCard>

      <AdminCard>
        <AdminCardHeader title="Rôles & accès" />
        <div className="flex flex-col gap-2">
          {ROLES.map((r) => (
            <div key={r.role} className="flex items-center justify-between rounded-lg border border-foreground/[0.07] px-4 py-3">
              <span className="rounded-full bg-foreground/[0.06] px-2.5 py-1 text-xs font-medium text-foreground">{r.role}</span>
              <span className="text-xs text-muted-foreground">{r.description}</span>
            </div>
          ))}
        </div>
      </AdminCard>

      <AdminCard>
        <AdminCardHeader title="Conformité & KYC" description="Garde-fous appliqués avant toute opération sensible." />
        <ul className="flex flex-col gap-2 text-sm text-foreground">
          <li>• Génération de wallet, dépôt et octroi de crédit bloqués tant que le KYC n&apos;est pas VERIFIED.</li>
          <li>• Validation manuelle du dossier requise avant toute création de compte (demandes d&apos;ouverture).</li>
        </ul>
      </AdminCard>
    </div>
  );
}
