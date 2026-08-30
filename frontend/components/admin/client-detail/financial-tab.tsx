"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { AdminCard, AdminCardHeader, AdminDivider, AdminField } from "@/components/admin/admin-ui";
import { AccountStatusBadge } from "@/components/admin/status-badge";
import { ADMIN_BTN_SECONDARY } from "@/lib/admin-theme";
import { FinancialsEditDialog } from "@/components/admin/client-detail/financials-dialog";
import type { AdminClient } from "@/lib/admin-mock-data";
import { formatEur } from "@/lib/admin-format";

function Row({ label, value }: { label: string; value: number }) {
  if (value === 0) return null;
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums text-foreground">{formatEur(value)}</span>
    </div>
  );
}

// Onglet "Financier" — section 8 (revenus / charges / patrimoine / passifs) et section 9
// (comptes bancaires en détail) du brief. Les indicateurs pertinents (taux d'endettement,
// capacité d'épargne) sont calculés à l'affichage, jamais stockés séparément — évite toute
// divergence avec les montants sources.
export function FinancialTab({
  client,
  onClientUpdated,
}: {
  client: AdminClient;
  onClientUpdated?: (client: AdminClient) => void;
}) {
  const { income, expenses, assets, liabilities } = client.financials;
  const totalIncome = income.salary + income.additional + income.professional + income.other;
  const totalExpenses =
    expenses.rent + expenses.mortgage + expenses.autoLoan + expenses.otherLoans + expenses.pension + expenses.recurring + expenses.other;
  const totalAssets = assets.bankAccounts + assets.savings + assets.realEstate + assets.vehicles + assets.investments + assets.other;
  const totalLiabilities = liabilities.mortgage + liabilities.autoLoan + liabilities.personalLoan + liabilities.debts + liabilities.other;
  const debtRatio = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;
  const netWorth = totalAssets - totalLiabilities;
  const canEdit = !!client.userId && !!onClientUpdated;
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {canEdit && (
        <div className="flex items-center justify-between">
          <p className="text-[12px] text-muted-foreground">Déclaration financière du client.</p>
          <button type="button" onClick={() => setEditing(true)} className={ADMIN_BTN_SECONDARY}>
            <Pencil className="size-3.5 text-primary" />
            Modifier la déclaration
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <AdminCard>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Revenus mensuels</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-chart-3">{formatEur(totalIncome)}</p>
        </AdminCard>
        <AdminCard>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Charges mensuelles</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-destructive">{formatEur(totalExpenses)}</p>
        </AdminCard>
        <AdminCard>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Taux d&apos;endettement</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{debtRatio.toFixed(1)}%</p>
        </AdminCard>
        <AdminCard>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Patrimoine net</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-primary">{formatEur(netWorth)}</p>
        </AdminCard>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <AdminCard>
          <AdminCardHeader title="Revenus" />
          <Row label="Salaire" value={income.salary} />
          <Row label="Revenus complémentaires" value={income.additional} />
          <Row label="Revenus professionnels" value={income.professional} />
          <Row label="Autres revenus" value={income.other} />
          <AdminDivider className="my-2" />
          <Row label="Total mensuel" value={totalIncome} />
        </AdminCard>

        <AdminCard>
          <AdminCardHeader title="Charges" />
          <Row label="Loyer" value={expenses.rent} />
          <Row label="Crédit immobilier" value={expenses.mortgage} />
          <Row label="Crédit auto" value={expenses.autoLoan} />
          <Row label="Autres crédits" value={expenses.otherLoans} />
          <Row label="Pension" value={expenses.pension} />
          <Row label="Charges récurrentes" value={expenses.recurring} />
          <Row label="Autres charges" value={expenses.other} />
          <AdminDivider className="my-2" />
          <Row label="Total mensuel" value={totalExpenses} />
        </AdminCard>

        <AdminCard>
          <AdminCardHeader title="Patrimoine" />
          <Row label="Comptes bancaires" value={assets.bankAccounts} />
          <Row label="Épargne" value={assets.savings} />
          <Row label="Immobilier" value={assets.realEstate} />
          <Row label="Véhicules" value={assets.vehicles} />
          <Row label="Investissements" value={assets.investments} />
          <Row label="Autres actifs" value={assets.other} />
          <AdminDivider className="my-2" />
          <Row label="Total" value={totalAssets} />
        </AdminCard>

        <AdminCard>
          <AdminCardHeader title="Passifs" />
          <Row label="Crédit immobilier" value={liabilities.mortgage} />
          <Row label="Crédit auto" value={liabilities.autoLoan} />
          <Row label="Crédit personnel" value={liabilities.personalLoan} />
          <Row label="Dettes" value={liabilities.debts} />
          <Row label="Autres engagements" value={liabilities.other} />
          <AdminDivider className="my-2" />
          <Row label="Total" value={totalLiabilities} />
        </AdminCard>
      </div>

      <AdminCard>
        <AdminCardHeader title="Comptes bancaires" description="Accès historique, transactions, relevés, bénéficiaires et paramètres." />
        <div className="flex flex-col gap-3">
          {client.bankAccounts.map((acc) => (
            <div key={acc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-foreground/[0.07] p-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {acc.type} <span className="text-muted-foreground">{acc.ibanMasked}</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{acc.currency}</p>
              </div>
              <div className="flex items-center gap-6">
                <AdminField label="Solde" value={formatEur(acc.balance)} mono />
                <AdminField label="Disponible" value={formatEur(acc.available)} mono />
                <AccountStatusBadge status={acc.status} />
              </div>
            </div>
          ))}
        </div>
      </AdminCard>

      {canEdit && onClientUpdated && (
        <FinancialsEditDialog client={client} open={editing} onClose={() => setEditing(false)} onSaved={onClientUpdated} />
      )}
    </div>
  );
}
