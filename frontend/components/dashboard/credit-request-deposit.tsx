"use client";

import { useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { AssetList, ChainList, useAssetSelection } from "@/components/dashboard/asset-picker";
import { api, ApiError, type AcceptedCurrency, type Chain, type CreditRequest } from "@/lib/api";
import { DEPOSIT_CURRENCY_GROUPS, formatUsd } from "@/lib/format";
import { GLASS_CARD_CLASS } from "@/lib/utils";

// Génération de l'adresse de dépôt dédiée à une demande de crédit approuvée — vit dans
// Solde (pas dans Crédit) : toutes les adresses de dépôt, qu'elles servent une recharge
// générale ou une demande de crédit spécifique, sont gérées au même endroit (cf.
// wallet-actions.tsx DepositDialog). Le formulaire "Crédit" ne fait plus que renvoyer ici
// une fois la demande approuvée (cf. credit-form.tsx ApprovedRequestStatus).
export function ApprovedCreditRequestDeposit({
  request,
  onSuccess,
}: {
  request: CreditRequest;
  onSuccess: () => Promise<void> | void;
}) {
  const t = useTranslations("Dashboard.creditRequestDeposit");
  const { currency, chain, setCurrency, setChain } = useAssetSelection();
  const [address, setAddress] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const wallet = await api.generateRequestDepositAddress(
        request.id,
        chain as Chain,
        currency as AcceptedCurrency,
      );
      setAddress(wallet.address);
      await onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("genericError"));
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <Card className={GLASS_CARD_CLASS + " border-primary/30"}>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {t("description", { amount: formatUsd(request.collateralAmount), currency: request.currency })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {address ? (
          <div className="flex flex-col gap-2">
            <Label>{t("yourDepositAddress")}</Label>
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
              <code className="flex-1 truncate text-xs">{address}</code>
              <Button type="button" size="icon-sm" variant="ghost" onClick={handleCopy}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("addressNote", { currency, chain, amount: formatUsd(request.collateralAmount) })}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="grid gap-2">
              <Label>{t("assetLabel")}</Label>
              <AssetList value={currency} onChange={setCurrency} groups={DEPOSIT_CURRENCY_GROUPS} />
            </div>
            <div className="grid gap-2">
              <Label>{t("networkLabel")}</Label>
              <ChainList currency={currency} value={chain} onChange={setChain} />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="button" onClick={handleGenerate} disabled={loading} className="self-start">
              {loading && <Loader2 className="size-4 animate-spin" />}
              {t("generateButton")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
