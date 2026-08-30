"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { AdminCard, AdminCardHeader } from "@/components/admin/admin-ui";
import { ADMIN_BTN_DANGER, ADMIN_BTN_GHOST, ADMIN_BTN_PRIMARY, ADMIN_INPUT } from "@/lib/admin-theme";
import { api, ApiError, type TwoFactorSetup } from "@/lib/api";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { cn } from "@/lib/utils";

// Section 2FA des paramètres admin — contrairement au reste de cette page (lecture
// seule, cf. AdminSettingsPage), celle-ci est entièrement fonctionnelle : elle appelle
// réellement POST /auth/2fa/setup|enable|disable (réservés aux comptes ADMIN côté
// backend, cf. AuthController). État local plutôt que contexte partagé : le statut 2FA
// n'est consommé nulle part ailleurs dans l'admin pour l'instant.
export function TwoFactorSettings() {
  const { selectedUser } = useDashboard();
  const [enabled, setEnabled] = useState(selectedUser?.twoFactorEnabled ?? false);
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disabling, setDisabling] = useState(false);

  async function startSetup() {
    setBusy(true);
    setError(null);
    try {
      const result = await api.setupTwoFactor();
      setSetup(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnable(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.enableTwoFactor(code);
      setEnabled(true);
      setSetup(null);
      setCode("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDisable(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.disableTwoFactor(code);
      setEnabled(false);
      setDisabling(false);
      setCode("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminCard>
      <AdminCardHeader
        title="Authentification à deux facteurs (2FA)"
        description="Un code à usage unique, en plus du mot de passe, à chaque connexion : réellement fonctionnel, pas une simulation."
        action={
          enabled ? (
            <span className="flex items-center gap-1.5 rounded-full bg-chart-3/10 px-2.5 py-1 text-xs font-medium text-chart-3">
              <ShieldCheck className="size-3.5" />
              Activée
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full bg-foreground/[0.05] px-2.5 py-1 text-xs font-medium text-muted-foreground">
              <ShieldOff className="size-3.5" />
              Désactivée
            </span>
          )
        }
      />

      {error && <p className="mb-3 text-xs text-destructive">{error}</p>}

      {!enabled && !setup && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            Recommandée pour tout compte back-office : scannez un QR code avec votre application
            d&apos;authentification (Google Authenticator, 1Password...), puis confirmez avec un
            premier code.
          </p>
          <button type="button" onClick={startSetup} disabled={busy} className={cn(ADMIN_BTN_PRIMARY, "shrink-0")}>
            {busy && <Loader2 className="size-3.5 animate-spin" />}
            Activer
          </button>
        </div>
      )}

      {!enabled && setup && (
        <form onSubmit={confirmEnable} className="flex flex-col items-start gap-4 sm:flex-row">
          <div className="rounded-lg bg-white p-2">
            {/* Fond blanc fixe : un QR code doit rester scannable quel que soit le thème,
                cf. le même choix pour les graphes de dépendances de l'audit. */}
            <Image
              src={setup.qrCodeDataUrl}
              alt="QR code d'activation 2FA"
              width={160}
              height={160}
              unoptimized
            />
          </div>
          <div className="flex flex-1 flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              Ou entrez cette clé manuellement :{" "}
              <code className="rounded bg-foreground/[0.06] px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                {setup.secret}
              </code>
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className={cn(ADMIN_INPUT, "w-32 text-center tracking-[0.3em]")}
              />
              <button
                type="submit"
                disabled={busy || code.length !== 6}
                className={ADMIN_BTN_PRIMARY}
              >
                {busy && <Loader2 className="size-3.5 animate-spin" />}
                Confirmer
              </button>
              <button
                type="button"
                onClick={() => {
                  setSetup(null);
                  setCode("");
                  setError(null);
                }}
                className={ADMIN_BTN_GHOST}
              >
                Annuler
              </button>
            </div>
          </div>
        </form>
      )}

      {enabled && !disabling && (
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            Un code sera désormais demandé à chaque connexion, en plus du mot de passe.
          </p>
          <button type="button" onClick={() => setDisabling(true)} className={cn(ADMIN_BTN_GHOST, "shrink-0")}>
            Désactiver
          </button>
        </div>
      )}

      {enabled && disabling && (
        <form onSubmit={confirmDisable} className="flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className={cn(ADMIN_INPUT, "w-32 text-center tracking-[0.3em]")}
          />
          <button type="submit" disabled={busy || code.length !== 6} className={ADMIN_BTN_DANGER}>
            {busy && <Loader2 className="size-3.5 animate-spin" />}
            Confirmer la désactivation
          </button>
          <button
            type="button"
            onClick={() => {
              setDisabling(false);
              setCode("");
              setError(null);
            }}
            className={ADMIN_BTN_GHOST}
          >
            Annuler
          </button>
        </form>
      )}
    </AdminCard>
  );
}
