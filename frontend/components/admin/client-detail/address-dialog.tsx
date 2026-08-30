"use client";

import { useState } from "react";
import { AdminFormDialog, FormField, FormInput, FormSelect } from "@/components/admin/admin-form-dialog";
import { api, ApiError, type AdminAddressInput } from "@/lib/api";
import type { AdminAddress, AdminClient } from "@/lib/admin-mock-data";

const LABEL_OPTIONS: { display: AdminAddress["label"]; value: AdminAddressInput["label"] }[] = [
  { display: "Domicile", value: "DOMICILE" },
  { display: "Fiscale", value: "FISCALE" },
  { display: "Postale", value: "POSTALE" },
  { display: "Professionnelle", value: "PROFESSIONNELLE" },
];

function toInput(a: AdminAddress): AdminAddressInput {
  const opt = LABEL_OPTIONS.find((o) => o.display === a.label);
  return {
    label: opt?.value ?? "DOMICILE",
    street: a.street,
    city: a.city,
    postalCode: a.postalCode,
    country: a.country,
    residenceType: a.residenceType,
    since: a.since,
    verified: a.verified,
  };
}

type FieldValues = {
  street: string;
  city: string;
  postalCode: string;
  country: string;
  residenceType: string;
  since: string;
  verified: boolean;
};

function fieldsFor(client: AdminClient, label: AdminAddressInput["label"]): FieldValues {
  const opt = LABEL_OPTIONS.find((o) => o.value === label);
  const existing = client.addresses.find((a) => a.label === opt?.display);
  return {
    street: existing?.street ?? "",
    city: existing?.city ?? "",
    postalCode: existing?.postalCode ?? "",
    country: existing?.country ?? "",
    residenceType: existing?.residenceType && existing.residenceType !== "Non renseigné" ? existing.residenceType : "",
    since: existing?.since && existing.since !== "—" ? existing.since : "",
    verified: existing?.verified ?? false,
  };
}

// Champs d'une adresse — composant à part entière, remonté (key={label}) à chaque
// changement de type sélectionné dans le parent : l'état initial se recalcule alors
// naturellement à la création du composant plutôt que via un effet qui réinitialiserait
// impérativement des useState existants (évite tout effet avec setState synchrone).
function AddressFields({
  client,
  label,
  onChange,
}: {
  client: AdminClient;
  label: AdminAddressInput["label"];
  onChange: (values: FieldValues) => void;
}) {
  const [values, setValues] = useState<FieldValues>(() => fieldsFor(client, label));

  function update(patch: Partial<FieldValues>) {
    const next = { ...values, ...patch };
    setValues(next);
    onChange(next);
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <FormField label="Rue et numéro" className="col-span-2">
        <FormInput value={values.street} onChange={(e) => update({ street: e.target.value })} />
      </FormField>
      <FormField label="Ville">
        <FormInput value={values.city} onChange={(e) => update({ city: e.target.value })} />
      </FormField>
      <FormField label="Code postal">
        <FormInput value={values.postalCode} onChange={(e) => update({ postalCode: e.target.value })} />
      </FormField>
      <FormField label="Pays">
        <FormInput value={values.country} onChange={(e) => update({ country: e.target.value })} />
      </FormField>
      <FormField label="Type d'occupation">
        <FormInput value={values.residenceType} onChange={(e) => update({ residenceType: e.target.value })} placeholder="Propriétaire, locataire…" />
      </FormField>
      <FormField label="Depuis">
        <FormInput value={values.since} onChange={(e) => update({ since: e.target.value })} placeholder="2019" />
      </FormField>
      <FormField label="Statut">
        <label className="flex items-center gap-2 text-[13px] text-foreground">
          <input type="checkbox" checked={values.verified} onChange={(e) => update({ verified: e.target.checked })} className="size-3.5 accent-primary" />
          Adresse vérifiée
        </label>
      </FormField>
    </div>
  );
}

// Édite une adresse à la fois (choix du type en haut) — l'appel PUT remplace tout le jeu
// d'adresses côté API (cf. Address, @@unique([userId, label])), donc on réenvoie aussi
// les autres adresses existantes inchangées pour ne pas les perdre.
export function AddressEditDialog({
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
  const [label, setLabel] = useState<AdminAddressInput["label"]>("DOMICILE");
  const [values, setValues] = useState<FieldValues>(() => fieldsFor(client, "DOMICILE"));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleLabelChange(next: AdminAddressInput["label"]) {
    setLabel(next);
    setValues(fieldsFor(client, next));
  }

  async function handleSubmit() {
    if (!client.userId) return;
    if (values.street.trim() === "" || values.city.trim() === "" || values.postalCode.trim() === "" || values.country.trim() === "") {
      setError("Rue, ville, code postal et pays sont requis.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const opt = LABEL_OPTIONS.find((o) => o.value === label);
      const others = client.addresses.filter((a) => a.label !== opt?.display).map(toInput);
      const updated = await api.updateAdminClientAddresses(client.userId, [
        {
          label,
          street: values.street.trim(),
          city: values.city.trim(),
          postalCode: values.postalCode.trim(),
          country: values.country.trim(),
          residenceType: values.residenceType.trim() || undefined,
          since: values.since.trim() || undefined,
          verified: values.verified,
        },
        ...others,
      ]);
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
      title="Modifier une adresse"
      description="Une seule adresse par type : l'enregistrement remplace celle déjà en place pour ce type."
      onClose={onClose}
      onSubmit={handleSubmit}
      submitting={submitting}
      error={error}
    >
      <FormField label="Type d'adresse">
        <FormSelect value={label} onChange={(e) => handleLabelChange(e.target.value as AdminAddressInput["label"])}>
          {LABEL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.display}
            </option>
          ))}
        </FormSelect>
      </FormField>

      <AddressFields key={label} client={client} label={label} onChange={setValues} />
    </AdminFormDialog>
  );
}
