"use client";

import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  Copy,
  CreditCard,
  Loader2,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AssetList, ChainList, useAssetSelection } from "@/components/dashboard/asset-picker";
import {
  api,
  ApiError,
  type AcceptedCurrency,
  type BalanceSummary,
  type Chain,
  type ManagedDepositAddress,
} from "@/lib/api";
import { CHAIN_LABELS, CURRENCY_LABELS, formatUsd } from "@/lib/format";

export function WalletActions({
  summary,
  userId,
  onSuccess,
}: {
  summary: BalanceSummary;
  userId: string;
  onSuccess: () => void;
}) {
  return (
    <div className="flex gap-2">
      <DepositDialog userId={userId} onSuccess={onSuccess} />
      <CardTopupDialog />
      <WithdrawDialog summary={summary} onSuccess={onSuccess} />
    </div>
  );
}

function CardTopupDialog() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedAmount = Number(amount);
  const isValid = amount.trim() !== "" && parsedAmount > 0;

  function reset() {
    setAmount("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setError(null);
    try {
      const { checkoutUrl } = await api.createCardTopup(parsedAmount.toFixed(2));
      // Redirection pleine page vers le checkout Mollie hébergé (ou, en mode sandbox
      // sans clé API configurée, vers la page de paiement simulée interne) — même
      // comportement que le vrai flux Mollie, qui redirige toujours hors de l'app.
      window.location.href = checkoutUrl;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <CreditCard className="size-4" />
            Acheter par carte
          </Button>
        }
      />
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Recharger par carte bancaire</DialogTitle>
            <DialogDescription>
              Paiement sécurisé géré par Mollie. Le solde disponible est crédité dès
              confirmation du paiement.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="topup-amount">Montant (USD)</Label>
              <Input
                id="topup-amount"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!isValid || loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              Continuer vers le paiement
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Deux flux distincts selon l'actif choisi (déterminé côté serveur, pas ici) :
// - "pool" : une adresse mutualisée gérée par la banque (ManagedDepositAddress), la même
//   pour tous les clients — n'apparaît qu'à cette étape, jamais affichée par défaut.
//   Le dépôt doit être déclaré (montant indicatif) pour apparaître dans l'historique ;
//   un admin le valide manuellement à réception réelle des fonds.
// - "legacy" : une adresse individuelle générée à la demande (WalletService), créditée
//   automatiquement dès confirmation on-chain (webhook blockchain existant).
type DepositStep = "select" | "pool" | "legacy";

function DepositDialog({ userId, onSuccess }: { userId: string; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<DepositStep>("select");
  const { currency, chain, setCurrency, setChain } = useAssetSelection();
  const [managedAddress, setManagedAddress] = useState<ManagedDepositAddress | null>(null);
  const [legacyAddress, setLegacyAddress] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenAmount, setTokenAmount] = useState("");
  const [declared, setDeclared] = useState(false);

  function reset() {
    setStep("select");
    setManagedAddress(null);
    setLegacyAddress(null);
    setCopied(false);
    setError(null);
    setTokenAmount("");
    setDeclared(false);
  }

  // Détermine le flux : consulte d'abord l'adresse mutualisée (404 = actif non géré via
  // ce flux) avant de retomber sur la génération classique — évite de dupliquer, côté
  // frontend, la liste des actifs concernés.
  async function handleContinue() {
    setLoading(true);
    setError(null);
    try {
      const managed = await api.getManagedDepositAddress(
        currency as AcceptedCurrency,
        chain as Chain,
      );
      setManagedAddress(managed);
      setStep("pool");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        try {
          const wallet = await api.createDepositAddress(chain as Chain, currency as AcceptedCurrency);
          setLegacyAddress(wallet.address);
          setStep("legacy");
        } catch (innerErr) {
          setError(innerErr instanceof ApiError ? innerErr.message : "Une erreur est survenue.");
        }
      } else {
        setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDeclare() {
    if (!tokenAmount || Number(tokenAmount) <= 0) return;
    setLoading(true);
    setError(null);
    try {
      await api.declareDeposit(userId, chain as Chain, currency as AcceptedCurrency, tokenAmount);
      setDeclared(true);
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(value: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <ArrowDownToLine className="size-4" />
            Déposer
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Déposer des fonds</DialogTitle>
          <DialogDescription>
            {step === "select" &&
              "Choisissez l'actif et le réseau, puis consultez l'adresse de dépôt correspondante."}
            {step === "pool" &&
              "Adresse de dépôt de la banque pour cet actif : déclarez votre dépôt une fois l'envoi effectué."}
            {step === "legacy" &&
              "Adresse de dépôt individuelle générée pour votre compte, créditée automatiquement dès confirmation on-chain."}
          </DialogDescription>
        </DialogHeader>

        {step === "select" && (
          <div className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label>Actif</Label>
              <AssetList value={currency} onChange={setCurrency} />
            </div>
            <div className="grid gap-2">
              <Label>Réseau</Label>
              <ChainList currency={currency} value={chain} onChange={setChain} />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="button" onClick={handleContinue} disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              Continuer
            </Button>
          </div>
        )}

        {step === "pool" && managedAddress && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Adresse de dépôt ({CURRENCY_LABELS[currency]} sur {CHAIN_LABELS[chain]})</Label>
              <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
                <code className="flex-1 truncate text-xs">{managedAddress.address}</code>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => handleCopy(managedAddress.address)}
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Adresse de gestion des actifs de la banque, commune à tous les clients. N&apos;y
                envoyez que du {CURRENCY_LABELS[currency]} sur {CHAIN_LABELS[chain]}.
              </p>
            </div>

            {declared ? (
              <Alert>
                <AlertDescription>
                  Dépôt déclaré, visible dans votre historique, en attente de validation après
                  réception des fonds.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="flex flex-col gap-2">
                <Label htmlFor="deposit-token-amount">
                  Montant envoyé ({CURRENCY_LABELS[currency]})
                </Label>
                <Input
                  id="deposit-token-amount"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={tokenAmount}
                  onChange={(e) => setTokenAmount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Une fois l&apos;envoi effectué, déclarez-le ci-dessous pour qu&apos;il apparaisse
                  dans votre historique : un conseiller le valide dès réception.
                </p>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!declared && (
              <Button
                type="button"
                onClick={handleDeclare}
                disabled={loading || !tokenAmount || Number(tokenAmount) <= 0}
              >
                {loading && <Loader2 className="size-4 animate-spin" />}
                J&apos;ai envoyé les fonds
              </Button>
            )}
          </div>
        )}

        {step === "legacy" && legacyAddress && (
          <div className="flex flex-col gap-2">
            <Label>Votre adresse de dépôt</Label>
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
              <code className="flex-1 truncate text-xs">{legacyAddress}</code>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => handleCopy(legacyAddress)}
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              N&apos;envoyez que du {CURRENCY_LABELS[currency]} sur {CHAIN_LABELS[chain]} à cette
              adresse. Le solde est crédité après confirmation on-chain.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function WithdrawDialog({
  summary,
  onSuccess,
}: {
  summary: BalanceSummary;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { currency, chain, setCurrency, setChain } = useAssetSelection();
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableBalance = Number(summary.balance.availableBalance);
  const parsedAmount = Number(amount);
  const isValid =
    amount.trim() !== "" &&
    parsedAmount > 0 &&
    parsedAmount <= availableBalance &&
    destination.trim().length >= 6;

  function reset() {
    setAmount("");
    setDestination("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setError(null);
    try {
      await api.requestWithdrawal(
        parsedAmount.toFixed(6),
        chain as Chain,
        currency as AcceptedCurrency,
        destination.trim(),
      );
      setOpen(false);
      reset();
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <ArrowUpFromLine className="size-4" />
            Retirer
          </Button>
        }
      />
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Retirer des fonds</DialogTitle>
            <DialogDescription>
              Solde disponible : {formatUsd(availableBalance)}. Le gage verrouillé n&apos;est
              retirable qu&apos;après remboursement intégral du crédit.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="grid gap-2">
              <Label>Actif</Label>
              <AssetList value={currency} onChange={setCurrency} />
            </div>
            <div className="grid gap-2">
              <Label>Réseau</Label>
              <ChainList currency={currency} value={chain} onChange={setChain} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="withdraw-amount">Montant</Label>
              <Input
                id="withdraw-amount"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="withdraw-destination">Adresse destinataire</Label>
              <Input
                id="withdraw-destination"
                placeholder="0x…"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!isValid || loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              Confirmer le retrait
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
