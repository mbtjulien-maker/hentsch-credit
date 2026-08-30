"use client";

import { useState } from "react";
import { MapPin, Pencil, ShieldCheck } from "lucide-react";
import { AdminCard, AdminCardHeader, AdminField } from "@/components/admin/admin-ui";
import { ADMIN_BTN_SECONDARY } from "@/lib/admin-theme";
import { PersonalInfoEditDialog } from "@/components/admin/client-detail/personal-info-dialog";
import { AddressEditDialog } from "@/components/admin/client-detail/address-dialog";
import { EmploymentEditDialog } from "@/components/admin/client-detail/employment-dialog";
import type { AdminClient } from "@/lib/admin-mock-data";
import { formatEur } from "@/lib/admin-format";

function EditButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className={ADMIN_BTN_SECONDARY}>
      <Pencil className="size-3.5 text-primary" />
      {label}
    </button>
  );
}

// Onglet "Personnel" — sections 5 (informations personnelles), 6 (adresses), 7 (situation
// professionnelle) du brief. La structure de la situation professionnelle diffère
// explicitement pour un client indépendant (activité/CA/résultat) vs salarié
// (employeur/fonction/ancienneté). Les actions "Modifier" n'apparaissent que pour une
// fiche adossée à un vrai compte (client.userId, cf. lib/api.ts) — une fiche de
// démonstration n'a aucune API à écrire.
export function PersonalTab({
  client,
  onClientUpdated,
}: {
  client: AdminClient;
  onClientUpdated?: (client: AdminClient) => void;
}) {
  const { personalInfo, employment } = client;
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [editingEmployment, setEditingEmployment] = useState(false);
  const canEdit = !!client.userId && !!onClientUpdated;

  return (
    <div className="flex flex-col gap-4">
      <AdminCard>
        <AdminCardHeader
          title="Informations personnelles"
          action={canEdit ? <EditButton onClick={() => setEditingProfile(true)} label="Modifier" /> : undefined}
        />
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <AdminField label="Nom" value={client.lastName || "—"} />
          <AdminField label="Prénom" value={client.firstName || "—"} />
          <AdminField label="Date de naissance" value={personalInfo.dateOfBirth} />
          <AdminField label="Lieu de naissance" value={personalInfo.placeOfBirth} />
          <AdminField label="Nationalité" value={personalInfo.nationality} />
          <AdminField label="Situation familiale" value={personalInfo.maritalStatus} />
          <AdminField label="Personnes à charge" value={personalInfo.dependents} />
          <AdminField label="Téléphone" value={personalInfo.phone} />
          <AdminField label="E-mail" value={personalInfo.email} />
        </div>
      </AdminCard>

      <AdminCard>
        <AdminCardHeader
          title="Adresses"
          action={canEdit ? <EditButton onClick={() => setEditingAddress(true)} label="Modifier" /> : undefined}
        />
        {client.addresses.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">Aucune adresse renseignée.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {client.addresses.map((addr) => (
              <div key={addr.label} className="rounded-xl border border-foreground/[0.07] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <MapPin className="size-3.5" />
                    {addr.label}
                  </span>
                  {addr.verified ? (
                    <span className="flex items-center gap-1 text-[11px] text-chart-3">
                      <ShieldCheck className="size-3.5" /> Vérifiée
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">Non vérifiée</span>
                  )}
                </div>
                <p className="text-sm text-foreground">{addr.street}</p>
                <p className="text-sm text-foreground">
                  {addr.postalCode} {addr.city}, {addr.country}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {addr.residenceType} · depuis {addr.since}
                  {addr.verifiedAt && ` · vérifiée le ${addr.verifiedAt}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </AdminCard>

      <AdminCard>
        <AdminCardHeader
          title="Situation professionnelle"
          action={
            <div className="flex items-center gap-2">
              {employment.verified ? (
                <span className="flex items-center gap-1 text-[11px] text-chart-3">
                  <ShieldCheck className="size-3.5" /> Vérifiée
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground">Non vérifiée</span>
              )}
              {canEdit && <EditButton onClick={() => setEditingEmployment(true)} label="Modifier" />}
            </div>
          }
        />
        {employment.isIndependent ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <AdminField label="Statut" value="Indépendant" />
            <AdminField label="Activité" value={employment.activity} />
            <AdminField label="Ancienneté" value={employment.seniority} />
            <AdminField label="Chiffre d'affaires annuel" value={formatEur(employment.turnover ?? 0)} mono />
            <AdminField label="Résultat net annuel" value={formatEur(employment.netResult ?? 0)} mono />
            <AdminField label="Revenus professionnels (mensuel)" value={formatEur(employment.monthlyIncome)} mono />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <AdminField label="Statut" value={employment.status} />
            <AdminField label="Employeur" value={employment.employer} />
            <AdminField label="Secteur" value={employment.sector} />
            <AdminField label="Fonction" value={employment.role} />
            <AdminField label="Ancienneté" value={employment.seniority} />
            <AdminField label="Type de contrat" value={employment.contractType} />
            <AdminField label="Revenu annuel" value={formatEur(employment.annualIncome)} mono />
            <AdminField label="Revenu mensuel" value={formatEur(employment.monthlyIncome)} mono />
          </div>
        )}
      </AdminCard>

      {canEdit && onClientUpdated && (
        <>
          <PersonalInfoEditDialog
            client={client}
            open={editingProfile}
            onClose={() => setEditingProfile(false)}
            onSaved={onClientUpdated}
          />
          <AddressEditDialog
            client={client}
            open={editingAddress}
            onClose={() => setEditingAddress(false)}
            onSaved={onClientUpdated}
          />
          <EmploymentEditDialog
            client={client}
            open={editingEmployment}
            onClose={() => setEditingEmployment(false)}
            onSaved={onClientUpdated}
          />
        </>
      )}
    </div>
  );
}
