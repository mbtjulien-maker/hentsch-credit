"use client";

import { useState } from "react";
import { AdminFormDialog, FormField, FormInput, FormSelect } from "@/components/admin/admin-form-dialog";
import { api, ApiError, type UpdateClientProfileInput } from "@/lib/api";
import type { AdminClient } from "@/lib/admin-mock-data";

const CLIENT_TYPE_OPTIONS: { value: UpdateClientProfileInput["clientType"]; label: string }[] = [
  { value: "PARTICULIER", label: "Particulier" },
  { value: "INDEPENDANT", label: "Indépendant" },
  { value: "ENTREPRISE", label: "Entreprise" },
];

// dd/mm/yyyy (format d'affichage, cf. fmtDate côté backend) -> yyyy-mm-dd (valeur
// attendue par <input type="date">) ; "Non renseigné" ou vide -> champ vide.
function toDateInputValue(display: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(display);
  if (!match) return "";
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

export function PersonalInfoEditDialog({
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
  const [firstName, setFirstName] = useState(client.firstName);
  const [lastName, setLastName] = useState(client.lastName);
  const [dateOfBirth, setDateOfBirth] = useState(toDateInputValue(client.personalInfo.dateOfBirth));
  const [placeOfBirth, setPlaceOfBirth] = useState(
    client.personalInfo.placeOfBirth === "Non renseigné" ? "" : client.personalInfo.placeOfBirth,
  );
  const [nationality, setNationality] = useState(
    client.personalInfo.nationality === "Non renseignée" ? "" : client.personalInfo.nationality,
  );
  const [maritalStatus, setMaritalStatus] = useState(
    client.personalInfo.maritalStatus === "Non renseignée" ? "" : client.personalInfo.maritalStatus,
  );
  const [dependents, setDependents] = useState(String(client.personalInfo.dependents ?? 0));
  const [phone, setPhone] = useState(client.personalInfo.phone === "Non renseigné" ? "" : client.personalInfo.phone);
  const [clientType, setClientType] = useState<UpdateClientProfileInput["clientType"]>(
    client.clientType === "Indépendant" ? "INDEPENDANT" : client.clientType === "Entreprise" ? "ENTREPRISE" : "PARTICULIER",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!client.userId) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await api.updateAdminClientProfile(client.userId, {
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        dateOfBirth: dateOfBirth || undefined,
        placeOfBirth: placeOfBirth.trim() || undefined,
        nationality: nationality.trim() || undefined,
        maritalStatus: maritalStatus.trim() || undefined,
        dependents: dependents.trim() === "" ? undefined : Number(dependents),
        phone: phone.trim() || undefined,
        clientType,
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
      title="Modifier les informations personnelles"
      description={client.creditRequest.id}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
    >
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Prénom">
          <FormInput value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </FormField>
        <FormField label="Nom">
          <FormInput value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </FormField>
        <FormField label="Date de naissance">
          <FormInput type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
        </FormField>
        <FormField label="Lieu de naissance">
          <FormInput value={placeOfBirth} onChange={(e) => setPlaceOfBirth(e.target.value)} />
        </FormField>
        <FormField label="Nationalité">
          <FormInput value={nationality} onChange={(e) => setNationality(e.target.value)} />
        </FormField>
        <FormField label="Situation familiale">
          <FormInput value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)} placeholder="Célibataire, marié(e)…" />
        </FormField>
        <FormField label="Personnes à charge">
          <FormInput type="number" min={0} max={20} value={dependents} onChange={(e) => setDependents(e.target.value)} />
        </FormField>
        <FormField label="Téléphone">
          <FormInput value={phone} onChange={(e) => setPhone(e.target.value)} />
        </FormField>
        <FormField label="Type de client" className="col-span-2">
          <FormSelect value={clientType} onChange={(e) => setClientType(e.target.value as UpdateClientProfileInput["clientType"])}>
            {CLIENT_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </FormSelect>
        </FormField>
      </div>
    </AdminFormDialog>
  );
}
