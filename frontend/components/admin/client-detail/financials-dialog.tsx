"use client";

import { useState } from "react";
import { AdminFormDialog, FormField, FormInput } from "@/components/admin/admin-form-dialog";
import { AdminSectionLabel } from "@/components/admin/admin-ui";
import { api, ApiError } from "@/lib/api";
import type { AdminClient } from "@/lib/admin-mock-data";

// Un bloc = un groupe de champs numériques (revenus/charges/patrimoine/passifs), tous
// gérés par le même state générique plutôt que 22 useState séparés.
function useMoneyBlock<T extends Record<string, number>>(initial: T) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(initial).map(([k, v]) => [k, v ? String(v) : ""])),
  );
  function set(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }
  function toPayload(): Record<string, number> {
    return Object.fromEntries(
      Object.entries(values)
        .filter(([, v]) => v.trim() !== "")
        .map(([k, v]) => [k, Number(v)]),
    );
  }
  return { values, set, toPayload };
}

function MoneyRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <FormField label={label}>
      <FormInput type="number" min={0} value={value} onChange={(e) => onChange(e.target.value)} placeholder="0" />
    </FormField>
  );
}

export function FinancialsEditDialog({
  client,
  open,
  onClose,
  onSaved,
}: {
  client: AdminClient;
  open: boolean;
  onClose: () => void;
  onSaved: (client: AdminClient) => void;
}) {
  const income = useMoneyBlock(client.financials.income);
  const expenses = useMoneyBlock(client.financials.expenses);
  const assets = useMoneyBlock(client.financials.assets);
  const liabilities = useMoneyBlock(client.financials.liabilities);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!client.userId) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await api.updateAdminClientFinancials(client.userId, {
        income: income.toPayload(),
        expenses: expenses.toPayload(),
        assets: assets.toPayload(),
        liabilities: liabilities.toPayload(),
      });
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminFormDialog
      open={open}
      title="Modifier la situation financière"
      description="Montants mensuels sauf mention contraire, en euros."
      onClose={onClose}
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
      submitLabel="Enregistrer la déclaration"
    >
      <div>
        <AdminSectionLabel className="mb-2">Revenus</AdminSectionLabel>
        <div className="grid grid-cols-2 gap-3">
          <MoneyRow label="Salaire" value={income.values.salary ?? ""} onChange={(v) => income.set("salary", v)} />
          <MoneyRow label="Revenus complémentaires" value={income.values.additional ?? ""} onChange={(v) => income.set("additional", v)} />
          <MoneyRow label="Revenus professionnels" value={income.values.professional ?? ""} onChange={(v) => income.set("professional", v)} />
          <MoneyRow label="Autres revenus" value={income.values.other ?? ""} onChange={(v) => income.set("other", v)} />
        </div>
      </div>

      <div>
        <AdminSectionLabel className="mb-2">Charges</AdminSectionLabel>
        <div className="grid grid-cols-2 gap-3">
          <MoneyRow label="Loyer" value={expenses.values.rent ?? ""} onChange={(v) => expenses.set("rent", v)} />
          <MoneyRow label="Crédit immobilier" value={expenses.values.mortgage ?? ""} onChange={(v) => expenses.set("mortgage", v)} />
          <MoneyRow label="Crédit auto" value={expenses.values.autoLoan ?? ""} onChange={(v) => expenses.set("autoLoan", v)} />
          <MoneyRow label="Autres crédits" value={expenses.values.otherLoans ?? ""} onChange={(v) => expenses.set("otherLoans", v)} />
          <MoneyRow label="Pension" value={expenses.values.pension ?? ""} onChange={(v) => expenses.set("pension", v)} />
          <MoneyRow label="Charges récurrentes" value={expenses.values.recurring ?? ""} onChange={(v) => expenses.set("recurring", v)} />
          <MoneyRow label="Autres charges" value={expenses.values.other ?? ""} onChange={(v) => expenses.set("other", v)} />
        </div>
      </div>

      <div>
        <AdminSectionLabel className="mb-2">Patrimoine</AdminSectionLabel>
        <div className="grid grid-cols-2 gap-3">
          <MoneyRow label="Comptes bancaires" value={assets.values.bankAccounts ?? ""} onChange={(v) => assets.set("bankAccounts", v)} />
          <MoneyRow label="Épargne" value={assets.values.savings ?? ""} onChange={(v) => assets.set("savings", v)} />
          <MoneyRow label="Immobilier" value={assets.values.realEstate ?? ""} onChange={(v) => assets.set("realEstate", v)} />
          <MoneyRow label="Véhicules" value={assets.values.vehicles ?? ""} onChange={(v) => assets.set("vehicles", v)} />
          <MoneyRow label="Investissements" value={assets.values.investments ?? ""} onChange={(v) => assets.set("investments", v)} />
          <MoneyRow label="Autres actifs" value={assets.values.other ?? ""} onChange={(v) => assets.set("other", v)} />
        </div>
      </div>

      <div>
        <AdminSectionLabel className="mb-2">Passifs</AdminSectionLabel>
        <div className="grid grid-cols-2 gap-3">
          <MoneyRow label="Crédit immobilier" value={liabilities.values.mortgage ?? ""} onChange={(v) => liabilities.set("mortgage", v)} />
          <MoneyRow label="Crédit auto" value={liabilities.values.autoLoan ?? ""} onChange={(v) => liabilities.set("autoLoan", v)} />
          <MoneyRow label="Crédit personnel" value={liabilities.values.personalLoan ?? ""} onChange={(v) => liabilities.set("personalLoan", v)} />
          <MoneyRow label="Dettes" value={liabilities.values.debts ?? ""} onChange={(v) => liabilities.set("debts", v)} />
          <MoneyRow label="Autres engagements" value={liabilities.values.other ?? ""} onChange={(v) => liabilities.set("other", v)} />
        </div>
      </div>
    </AdminFormDialog>
  );
}
