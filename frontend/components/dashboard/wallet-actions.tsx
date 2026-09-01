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
import { useTranslations } from "next-intl";
import { toast } from "sonner";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssetList, ChainList, useAssetSelection } from "@/components/dashboard/asset-picker";
import {
  api,
  ApiError,
  type AcceptedCurrency,
  type AccountCurrency,
  type BalanceSummary,
  type Chain,
  type ManagedDepositAddress,
  type WithdrawalRequest,
} from "@/lib/api";
import { CHAIN_LABELS, formatUsd } from "@/lib/format";
import { useCurrencyLabel } from "@/lib/use-currency-label";
import { isSepaEligibleIban, isValidBic, isValidIban } from "@/lib/iban";

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
  const t = useTranslations("Dashboard.walletActions");
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
      setError(err instanceof ApiError ? err.message : t("genericError"));
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
            {t("buyByCard.trigger")}
          </Button>
        }
      />
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("buyByCard.dialogTitle")}</DialogTitle>
            <DialogDescription>{t("buyByCard.dialogDescription")}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="topup-amount">{t("buyByCard.amountLabel")}</Label>
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
              {t("buyByCard.submit")}
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
  const t = useTranslations("Dashboard.walletActions");
  const currencyLabel = useCurrencyLabel();
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
          setError(innerErr instanceof ApiError ? innerErr.message : t("genericError"));
        }
      } else {
        setError(err instanceof ApiError ? err.message : t("genericError"));
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
      setError(err instanceof ApiError ? err.message : t("genericError"));
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
            {t("deposit.trigger")}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deposit.dialogTitle")}</DialogTitle>
          <DialogDescription>
            {step === "select" && t("deposit.descriptionSelect")}
            {step === "pool" && t("deposit.descriptionPool")}
            {step === "legacy" && t("deposit.descriptionLegacy")}
          </DialogDescription>
        </DialogHeader>

        {step === "select" && (
          <div className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label>{t("deposit.assetLabel")}</Label>
              <AssetList value={currency} onChange={setCurrency} />
            </div>
            <div className="grid gap-2">
              <Label>{t("deposit.networkLabel")}</Label>
              <ChainList currency={currency} value={chain} onChange={setChain} />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="button" onClick={handleContinue} disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              {t("deposit.continue")}
            </Button>
          </div>
        )}

        {step === "pool" && managedAddress && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>
                {t("deposit.addressLabel", {
                  currency: currencyLabel(currency),
                  chain: CHAIN_LABELS[chain],
                })}
              </Label>
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
                {t("deposit.poolAddressNote", {
                  currency: currencyLabel(currency),
                  chain: CHAIN_LABELS[chain],
                })}
              </p>
            </div>

            {declared ? (
              <Alert>
                <AlertDescription>{t("deposit.declaredAlert")}</AlertDescription>
              </Alert>
            ) : (
              <div className="flex flex-col gap-2">
                <Label htmlFor="deposit-token-amount">
                  {t("deposit.sentAmountLabel", { currency: currencyLabel(currency) })}
                </Label>
                <Input
                  id="deposit-token-amount"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={tokenAmount}
                  onChange={(e) => setTokenAmount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{t("deposit.sentAmountNote")}</p>
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
                {t("deposit.declareButton")}
              </Button>
            )}
          </div>
        )}

        {step === "legacy" && legacyAddress && (
          <div className="flex flex-col gap-2">
            <Label>{t("deposit.legacyAddressLabel")}</Label>
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
              {t("deposit.legacyNote", {
                currency: currencyLabel(currency),
                chain: CHAIN_LABELS[chain],
              })}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

type WithdrawMethodTab = "CRYPTO" | "SEPA" | "SWIFT";

function WithdrawDialog({
  summary,
  onSuccess,
}: {
  summary: BalanceSummary;
  onSuccess: () => void;
}) {
  const t = useTranslations("Dashboard.walletActions");
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<WithdrawMethodTab>("CRYPTO");

  // --- CRYPTO ---
  const { currency, chain, setCurrency, setChain } = useAssetSelection();
  const [destination, setDestination] = useState("");

  // --- SEPA / SWIFT ---
  const [bankCurrency, setBankCurrency] = useState<AccountCurrency>("EUR");
  const [accountHolder, setAccountHolder] = useState("");
  const [iban, setIban] = useState("");
  const [bic, setBic] = useState("");

  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableBalance = Number(summary.balance.availableBalance);
  const parsedAmount = Number(amount);
  const amountValid =
    amount.trim() !== "" && parsedAmount > 0 && parsedAmount <= availableBalance;

  const ibanTrimmed = iban.trim();
  const bicTrimmed = bic.trim();
  const ibanValid = isValidIban(ibanTrimmed);
  const sepaEligible = isSepaEligibleIban(ibanTrimmed);
  const bicValid = bicTrimmed === "" || isValidBic(bicTrimmed);

  const isValid =
    amountValid &&
    (method === "CRYPTO"
      ? destination.trim().length >= 6
      : accountHolder.trim().length >= 2 &&
        ibanValid &&
        bicValid &&
        (method === "SWIFT" ? isValidBic(bicTrimmed) : true) &&
        (method === "SEPA" ? sepaEligible && bankCurrency === "EUR" : true));

  function reset() {
    setMethod("CRYPTO");
    setAmount("");
    setDestination("");
    setBankCurrency("EUR");
    setAccountHolder("");
    setIban("");
    setBic("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setError(null);
    try {
      const payload: WithdrawalRequest =
        method === "CRYPTO"
          ? {
              method: "CRYPTO",
              amount: parsedAmount.toFixed(6),
              chain: chain as Chain,
              currency: currency as AcceptedCurrency,
              destinationAddress: destination.trim(),
            }
          : {
              method,
              amount: parsedAmount.toFixed(6),
              withdrawalCurrency: bankCurrency,
              bankAccountHolder: accountHolder.trim(),
              destinationIban: ibanTrimmed,
              bankBic: bicTrimmed || undefined,
            };
      await api.requestWithdrawal(payload);
      setOpen(false);
      reset();
      onSuccess();
      // Fermeture silencieuse sinon — seul signal de succès jusqu'ici, facile à manquer.
      // Toast plutôt qu'une bannière persistante : la demande n'a pas d'état à suivre
      // ensuite dans ce dialogue (contrairement au dépôt déclaré, cf. DepositDialog).
      toast.success(t("withdraw.successToast"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("genericError"));
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
            {t("withdraw.trigger")}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("withdraw.dialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("withdraw.dialogDescription", { balance: formatUsd(availableBalance) })}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <Tabs value={method} onValueChange={(v) => v && setMethod(v as WithdrawMethodTab)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="CRYPTO">{t("withdraw.methodCrypto")}</TabsTrigger>
                <TabsTrigger value="SEPA">{t("withdraw.methodSepa")}</TabsTrigger>
                <TabsTrigger value="SWIFT">{t("withdraw.methodSwift")}</TabsTrigger>
              </TabsList>

              <TabsContent value="CRYPTO" className="grid gap-4 pt-4">
                <div className="grid gap-2">
                  <Label>{t("deposit.assetLabel")}</Label>
                  <AssetList value={currency} onChange={setCurrency} />
                </div>
                <div className="grid gap-2">
                  <Label>{t("deposit.networkLabel")}</Label>
                  <ChainList currency={currency} value={chain} onChange={setChain} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="withdraw-destination">{t("withdraw.destinationLabel")}</Label>
                  <Input
                    id="withdraw-destination"
                    placeholder="0x…"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
              </TabsContent>

              <TabsContent value="SEPA" className="grid gap-4 pt-4">
                <p className="text-xs text-muted-foreground">{t("withdraw.sepaEurOnlyNote")}</p>
                <div className="grid gap-2">
                  <Label htmlFor="withdraw-holder-sepa">{t("withdraw.accountHolderLabel")}</Label>
                  <Input
                    id="withdraw-holder-sepa"
                    placeholder="Jean Dupont"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="withdraw-iban-sepa">{t("withdraw.ibanLabel")}</Label>
                  <Input
                    id="withdraw-iban-sepa"
                    placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    className="font-mono text-xs"
                  />
                  {ibanTrimmed !== "" && !ibanValid && (
                    <p className="text-xs text-destructive">{t("withdraw.ibanInvalid")}</p>
                  )}
                  {ibanTrimmed !== "" && ibanValid && !sepaEligible && (
                    <p className="text-xs text-destructive">{t("withdraw.ibanNotSepa")}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="withdraw-bic-sepa">{t("withdraw.bicLabel")}</Label>
                  <Input
                    id="withdraw-bic-sepa"
                    placeholder="BNPAFRPP"
                    value={bic}
                    onChange={(e) => setBic(e.target.value)}
                    className="font-mono text-xs uppercase"
                  />
                  <p className="text-xs text-muted-foreground">{t("withdraw.bicOptionalNote")}</p>
                  {bicTrimmed !== "" && !bicValid && (
                    <p className="text-xs text-destructive">{t("withdraw.bicInvalid")}</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="SWIFT" className="grid gap-4 pt-4">
                <div className="grid gap-2">
                  <Label>{t("withdraw.currencyLabel")}</Label>
                  <div className="flex gap-1.5">
                    {(["USD", "EUR"] as const).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setBankCurrency(c)}
                        className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                          bankCurrency === c
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="withdraw-holder-swift">{t("withdraw.accountHolderLabel")}</Label>
                  <Input
                    id="withdraw-holder-swift"
                    placeholder="Jean Dupont"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="withdraw-iban-swift">{t("withdraw.ibanLabel")}</Label>
                  <Input
                    id="withdraw-iban-swift"
                    placeholder="IBAN ou numéro de compte"
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    className="font-mono text-xs"
                  />
                  {ibanTrimmed !== "" && !ibanValid && (
                    <p className="text-xs text-destructive">{t("withdraw.ibanInvalid")}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="withdraw-bic-swift">{t("withdraw.bicLabel")}</Label>
                  <Input
                    id="withdraw-bic-swift"
                    placeholder="BNPAFRPP"
                    value={bic}
                    onChange={(e) => setBic(e.target.value)}
                    className="font-mono text-xs uppercase"
                  />
                  <p className="text-xs text-muted-foreground">{t("withdraw.bicRequiredNote")}</p>
                  {bicTrimmed !== "" && !bicValid && (
                    <p className="text-xs text-destructive">{t("withdraw.bicInvalid")}</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="grid gap-2">
              <Label htmlFor="withdraw-amount">
                {t("withdraw.amountLabel")}
                {method !== "CRYPTO" ? ` (${bankCurrency})` : ""}
              </Label>
              <Input
                id="withdraw-amount"
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
              {t("withdraw.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
