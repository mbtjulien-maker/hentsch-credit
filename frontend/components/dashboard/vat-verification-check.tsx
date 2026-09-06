"use client";

import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { api, ApiError, type VatCountryCode } from "@/lib/api";

type CheckState = "idle" | "checking" | "valid" | "invalid" | "error";

// Bouton "Vérifier" pour le champ "Numéro d'immatriculation" des comptes Business — appel
// réel à VIES (Commission européenne, cf. §6 CLAUDE.md, retour client : "possible de
// vérifier le SIRET directement ? europe"). Purement informatif : n'écrit jamais aucun
// champ "verified" en base (contrairement à la certification KYC, réservée au
// conseiller) — seul un résultat affiché au client, comme la validation structurelle
// d'IBAN. Réutilisé à l'identique par kyc-dossier-section.tsx et profile-section.tsx
// plutôt que dupliqué deux fois.
export function VatVerificationCheck({ value }: { value: string }) {
  const t = useTranslations("Dashboard.kycDossier.vatCheck");
  const [state, setState] = useState<CheckState>("idle");
  const [name, setName] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleCheck() {
    // Nettoyage volontairement permissif (espaces/points/tirets de saisie retirés) —
    // VIES lui-même reste l'autorité qui tranche la validité réelle du numéro, ce
    // parsing ne fait que séparer le préfixe pays des chiffres.
    const cleaned = value.replace(/[\s.-]/g, "").toUpperCase();
    const countryCode = cleaned.slice(0, 2);
    const vatNumber = cleaned.slice(2);
    if (!/^[A-Z]{2}$/.test(countryCode) || vatNumber.length < 2) {
      setState("error");
      setErrorMessage(t("formatError"));
      return;
    }
    setState("checking");
    setErrorMessage(null);
    try {
      const result = await api.checkVatNumber(countryCode as VatCountryCode, vatNumber);
      setName(result.name);
      setAddress(result.address);
      setState(result.valid ? "valid" : "invalid");
    } catch (err) {
      setState("error");
      setErrorMessage(err instanceof ApiError ? err.message : t("unavailable"));
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        disabled={state === "checking" || value.trim() === ""}
        onClick={() => void handleCheck()}
      >
        {state === "checking" ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <ShieldCheck className="size-3.5" />
        )}
        {t("action")}
      </Button>
      {state === "valid" && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          {name ? t("validResult", { name, address: address ?? t("noAddress") }) : t("validNoDetails")}
        </p>
      )}
      {state === "invalid" && <p className="text-xs text-destructive">{t("invalidResult")}</p>}
      {state === "error" && errorMessage && (
        <p className="text-xs text-amber-600 dark:text-amber-400">{errorMessage}</p>
      )}
    </div>
  );
}
