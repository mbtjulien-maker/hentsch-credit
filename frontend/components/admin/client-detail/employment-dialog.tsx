"use client";

import { useState } from "react";
import { AdminFormDialog, FormField, FormInput } from "@/components/admin/admin-form-dialog";
import { api, ApiError } from "@/lib/api";
import type { AdminClient } from "@/lib/admin-mock-data";

function orEmpty(value: string | undefined, placeholder: string): string {
  return value && value !== placeholder ? value : "";
}

export function EmploymentEditDialog({
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
  const { employment } = client;
  const [isIndependent, setIsIndependent] = useState(employment.isIndependent);
  const [status, setStatus] = useState(orEmpty(employment.status, "Non renseigné"));
  const [employer, setEmployer] = useState(employment.employer ?? "");
  const [sector, setSector] = useState(employment.sector ?? "");
  const [role, setRole] = useState(employment.role ?? "");
  const [seniority, setSeniority] = useState(orEmpty(employment.seniority, "Non renseignée"));
  const [contractType, setContractType] = useState(employment.contractType ?? "");
  const [annualIncome, setAnnualIncome] = useState(String(employment.annualIncome || ""));
  const [monthlyIncome, setMonthlyIncome] = useState(String(employment.monthlyIncome || ""));
  const [activity, setActivity] = useState(employment.activity ?? "");
  const [turnover, setTurnover] = useState(String(employment.turnover ?? ""));
  const [netResult, setNetResult] = useState(String(employment.netResult ?? ""));
  const [verified, setVerified] = useState(employment.verified);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!client.userId) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await api.updateAdminClientEmployment(client.userId, {
        isIndependent,
        status: status.trim() || undefined,
        employer: isIndependent ? undefined : employer.trim() || undefined,
        sector: isIndependent ? undefined : sector.trim() || undefined,
        role: isIndependent ? undefined : role.trim() || undefined,
        seniority: seniority.trim() || undefined,
        contractType: isIndependent ? undefined : contractType.trim() || undefined,
        annualIncome: annualIncome.trim() === "" ? undefined : Number(annualIncome),
        monthlyIncome: monthlyIncome.trim() === "" ? undefined : Number(monthlyIncome),
        activity: isIndependent ? activity.trim() || undefined : undefined,
        turnover: isIndependent && turnover.trim() !== "" ? Number(turnover) : undefined,
        netResult: isIndependent && netResult.trim() !== "" ? Number(netResult) : undefined,
        verified,
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
      title="Modifier la situation professionnelle"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
    >
      <FormField label="Statut">
        <label className="flex items-center gap-2 text-[13px] text-foreground">
          <input type="checkbox" checked={isIndependent} onChange={(e) => setIsIndependent(e.target.checked)} className="size-3.5 accent-primary" />
          Travailleur indépendant
        </label>
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Statut professionnel">
          <FormInput value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Salarié, indépendant…" />
        </FormField>
        <FormField label="Ancienneté">
          <FormInput value={seniority} onChange={(e) => setSeniority(e.target.value)} placeholder="7 ans" />
        </FormField>

        {isIndependent ? (
          <>
            <FormField label="Activité" className="col-span-2">
              <FormInput value={activity} onChange={(e) => setActivity(e.target.value)} />
            </FormField>
            <FormField label="Chiffre d'affaires annuel (€)">
              <FormInput type="number" min={0} value={turnover} onChange={(e) => setTurnover(e.target.value)} />
            </FormField>
            <FormField label="Résultat net annuel (€)">
              <FormInput type="number" value={netResult} onChange={(e) => setNetResult(e.target.value)} />
            </FormField>
          </>
        ) : (
          <>
            <FormField label="Employeur">
              <FormInput value={employer} onChange={(e) => setEmployer(e.target.value)} />
            </FormField>
            <FormField label="Secteur">
              <FormInput value={sector} onChange={(e) => setSector(e.target.value)} />
            </FormField>
            <FormField label="Fonction">
              <FormInput value={role} onChange={(e) => setRole(e.target.value)} />
            </FormField>
            <FormField label="Type de contrat">
              <FormInput value={contractType} onChange={(e) => setContractType(e.target.value)} placeholder="CDI, CDD…" />
            </FormField>
          </>
        )}

        <FormField label="Revenu annuel (€)">
          <FormInput type="number" min={0} value={annualIncome} onChange={(e) => setAnnualIncome(e.target.value)} />
        </FormField>
        <FormField label="Revenu mensuel (€)">
          <FormInput type="number" min={0} value={monthlyIncome} onChange={(e) => setMonthlyIncome(e.target.value)} />
        </FormField>

        <FormField label="Vérification" className="col-span-2">
          <label className="flex items-center gap-2 text-[13px] text-foreground">
            <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} className="size-3.5 accent-primary" />
            Situation professionnelle vérifiée
          </label>
        </FormField>
      </div>
    </AdminFormDialog>
  );
}
