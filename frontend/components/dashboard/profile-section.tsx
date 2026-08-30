"use client";

import { useEffect, useState } from "react";
import { Briefcase, MapPin, Wallet as WalletIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CHAIN_LABELS, CURRENCY_LABELS, KYC_STATUS_LABELS, formatAccountCurrency } from "@/lib/format";
import {
  api,
  ApiError,
  type ClientManagedWalletView,
  type ClientProfileView,
  type KycStatus,
  type UserSummary,
  type WalletRecord,
} from "@/lib/api";

function kycVariant(status: KycStatus): "default" | "secondary" | "destructive" {
  if (status === "VERIFIED") return "default";
  if (status === "PENDING") return "secondary";
  return "destructive";
}

const memberSinceFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const ADDRESS_LABELS: Record<ClientProfileView["addresses"][number]["label"], string> = {
  DOMICILE: "Domicile",
  FISCALE: "Fiscale",
  POSTALE: "Postale",
  PROFESSIONNELLE: "Professionnelle",
};

// Sous-section "Identité & coordonnées" — chargée séparément du reste du profil (via
// /users/:userId/profile, cf. lib/api.ts) : c'est le même noyau essentiel que la fiche
// client back-office (ClientProfile/Address/Employment), mais en lecture seule côté
// client, réservé aux champs demandés (nom, prénom, téléphone, adresse, emploi, revenu
// annuel). Tant que rien n'a été complété (par le client ou un admin), chaque champ
// affiche honnêtement "Non renseigné" plutôt qu'une valeur inventée.
function IdentitySection({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<ClientProfileView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    api
      .getUserProfile(userId)
      .then((data) => {
        if (!ignore) setProfile(data);
      })
      .catch((err: unknown) => {
        if (!ignore) setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
      });
    return () => {
      ignore = true;
    };
  }, [userId]);

  if (error) {
    return <p className="text-xs text-destructive">{error}</p>;
  }

  if (!profile) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  const fullName = profile.firstName || profile.lastName ? `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() : null;
  const domicile = profile.addresses.find((a) => a.label === "DOMICILE") ?? profile.addresses[0];
  const { employment } = profile;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Nom complet</span>
        <span className="font-medium">{fullName ?? "Non renseigné"}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Téléphone</span>
        <span className="font-medium">{profile.phone ?? "Non renseigné"}</span>
      </div>

      <div className="border-t pt-3">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <MapPin className="size-3.5" />
          Adresse
        </div>
        {domicile ? (
          <div className="text-sm">
            <p>{domicile.street}</p>
            <p>
              {domicile.postalCode} {domicile.city}, {domicile.country}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{ADDRESS_LABELS[domicile.label]}</p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Aucune adresse renseignée pour l&apos;instant.</p>
        )}
      </div>

      <div className="border-t pt-3">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Briefcase className="size-3.5" />
          Situation professionnelle
        </div>
        {employment ? (
          <div className="flex flex-col gap-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{employment.isIndependent ? "Activité" : "Employeur"}</span>
              <span className="font-medium">
                {employment.isIndependent ? (employment.activity ?? "Non renseignée") : (employment.employer ?? "Non renseigné")}
              </span>
            </div>
            {!employment.isIndependent && employment.role && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Fonction</span>
                <span className="font-medium">{employment.role}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Revenu annuel</span>
              <span className="font-medium tabular-nums">
                {employment.annualIncome ? formatAccountCurrency(employment.annualIncome, "EUR") : "Non renseigné"}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Aucune situation professionnelle renseignée pour l&apos;instant.</p>
        )}
      </div>
    </div>
  );
}

// Référence interne de suivi (cf. ClientManagedWallet côté backend) — PAS une adresse
// blockchain : les dépôts sur les actifs mutualisés (USDT/USDC/XAUT/dEURO) transitent
// par l'adresse commune affichée dans le dialogue "Déposer" (cf. wallet-actions.tsx).
// Provisionnée à la volée au premier chargement de cet écran si elle n'existait pas.
function ManagedWalletRow({ userId }: { userId: string }) {
  const [wallet, setWallet] = useState<ClientManagedWalletView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    api
      .getManagedWallet(userId)
      .then((data) => {
        if (!ignore) setWallet(data);
      })
      .catch((err: unknown) => {
        if (!ignore) setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
      });
    return () => {
      ignore = true;
    };
  }, [userId]);

  if (error) return null;

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">Wallet personnel</span>
      {wallet ? (
        <code className="font-mono text-xs font-medium">{wallet.reference}</code>
      ) : (
        <Skeleton className="h-4 w-24" />
      )}
    </div>
  );
}

export function ProfileSection({ user, wallets }: { user: UserSummary; wallets: WalletRecord[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profil</CardTitle>
        <CardDescription>Informations du compte</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Email</span>
          <span className="font-medium">{user.email}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Statut KYC</span>
          <Badge variant={kycVariant(user.kycStatus)}>{KYC_STATUS_LABELS[user.kycStatus]}</Badge>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Client depuis</span>
          <span className="font-medium">{memberSinceFormatter.format(new Date(user.createdAt))}</span>
        </div>

        <div className="border-t pt-3">
          <IdentitySection userId={user.id} />
        </div>

        <div className="border-t pt-3">
          <ManagedWalletRow userId={user.id} />
          <p className="mt-1 text-xs text-muted-foreground">
            Identifiant interne utilisé par la banque pour le suivi de vos dépôts sur les actifs
            mutualisés (USDT, USDC, XAUT, dEURO).
          </p>
        </div>

        <div className="border-t pt-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <WalletIcon className="size-3.5" />
            Adresses de dépôt (crypto)
          </div>
          {wallets.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aucune adresse générée pour l&apos;instant.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {wallets.map((w) => (
                <div key={w.id} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {CURRENCY_LABELS[w.currency]} · {CHAIN_LABELS[w.chain]}
                  </span>
                  <code className="truncate font-mono">{w.address.slice(0, 6)}…{w.address.slice(-4)}</code>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
