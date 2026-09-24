"use client";

import { useState } from "react";
import { ArrowDownToLine, ArrowLeftRight, Coins, CreditCard, Loader2, Lock, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { useInvestment } from "@/components/dashboard/investment/investment-context";
import { CardTopupDialog, DepositDialog } from "@/components/dashboard/wallet-actions";
import { formatUsd, getActiveCurrency, toDisplay } from "@/lib/format";
import { cn } from "@/lib/utils";

const QUICK_FRACTIONS = [0.25, 0.5, 0.75, 1] as const;
type Direction = "in" | "out";

function LockedButton({ icon: Icon, label, note }: { icon: React.ComponentType<{ className?: string }>; label: string; note: string }) {
  return (
    <Button variant="outline" size="sm" disabled title={note}>
      <Lock className="size-3.5" />
      <Icon className="size-4" />
      {label}
    </Button>
  );
}

// Virement interne — instantané, sans frais, dans les deux sens. Le sens "vers le
// wallet" alimente les placements depuis le solde principal ; "depuis le wallet" rapatrie
// du cash non investi (jamais du capital placé : un placement se retire depuis Mes
// placements).
function InternalTransfer() {
  const t = useTranslations("Dashboard.investmentSpace.funding.transfer");
  const tWallet = useTranslations("Dashboard.investment.wallet");
  const inv = useInvestment();
  const [direction, setDirection] = useState<Direction>("in");
  const [amount, setAmount] = useState("");

  // Soldes du registre (USD) exprimés dans la monnaie d'affichage : le client saisit dans la
  // monnaie de son compte, la conversion vers le registre se fait à l'envoi.
  const sourceUsd = direction === "in" ? inv.mainBalance : inv.walletBalance;
  const source = sourceUsd != null ? toDisplay(sourceUsd) : null;
  const parsed = Number(amount);
  const exceeds = source != null && parsed > source;
  const valid = parsed > 0 && !exceeds;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    await inv.transfer(direction, amount);
    setAmount("");
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="size-4 text-primary" />
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </div>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div role="group" aria-label={t("title")} className="inline-flex w-fit rounded-lg bg-muted p-[3px] text-sm font-medium">
            {(["in", "out"] as const).map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={direction === d}
                onClick={() => {
                  setDirection(d);
                  setAmount("");
                }}
                className={cn(
                  "rounded-md px-3 py-1 whitespace-nowrap transition-colors",
                  direction === d ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {d === "in" ? tWallet("directionIn") : tWallet("directionOut")}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <Input
              inputMode="decimal"
              placeholder={tWallet("amountPlaceholder", { currency: getActiveCurrency() })}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-label={tWallet("amountPlaceholder", { currency: getActiveCurrency() })}
              aria-invalid={exceeds}
            />
            {source != null && (
              <div className="flex flex-wrap items-center gap-1.5">
                {QUICK_FRACTIONS.map((f) => (
                  <Button
                    key={f}
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => setAmount((Math.floor(source * f * 100) / 100).toFixed(2))}
                  >
                    {f === 1 ? tWallet("quickMax") : `${f * 100}%`}
                  </Button>
                ))}
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                  {t("available", { amount: formatUsd(source) })}
                </span>
              </div>
            )}
            {exceeds && <p className="text-xs text-destructive">{tWallet("insufficientBalance")}</p>}
          </div>

          <Button type="submit" disabled={!valid || inv.busyWallet} className="self-start">
            {inv.busyWallet && <Loader2 className="size-4 animate-spin" />}
            {tWallet("transfer")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// Approvisionner — les trois façons d'alimenter le wallet investissement, côte à côte :
// virement interne, dépôt en crypto-actifs, carte bancaire. Les deux dépôts directs
// créditent le wallet investissement (jamais le solde principal), cf. §6 CLAUDE.md
// entrée #51 ; le dépôt crypto reste validé manuellement par la banque à réception
// réelle des fonds, comme partout ailleurs dans le produit.
export function InvestmentFunding() {
  const t = useTranslations("Dashboard.investmentSpace.funding");
  const tWalletActions = useTranslations("Dashboard.walletActions");
  const { selectedUser } = useDashboard();
  const inv = useInvestment();
  const verified = selectedUser?.kycStatus === "VERIFIED";

  return (
    <div className="flex flex-col gap-6">
      {inv.error && (
        <Alert variant="destructive">
          <AlertDescription>{inv.error}</AlertDescription>
        </Alert>
      )}

      <section aria-label={t("balancesAria")} className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="py-1">
            <p className="text-xs font-medium text-muted-foreground">{t("mainBalance")}</p>
            <p className="mt-2 font-heading text-3xl leading-none font-semibold">
              {inv.mainBalance != null ? formatUsd(inv.mainBalance) : "—"}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{t("mainBalanceHint")}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="py-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{t("walletBalance")}</p>
              <Wallet className="size-4 text-primary" />
            </div>
            <p className="mt-2 font-heading text-3xl leading-none font-semibold text-primary">
              {inv.walletBalance != null ? formatUsd(inv.walletBalance) : "—"}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{t("walletBalanceHint")}</p>
          </CardContent>
        </Card>
      </section>

      <InternalTransfer />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Coins className="size-4 text-primary" />
              <CardTitle className="text-base">{t("crypto.title")}</CardTitle>
            </div>
            <CardDescription>{t("crypto.description")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {verified ? (
              <DepositDialog userId={inv.userId} onSuccess={inv.refresh} target="INVESTMENT" />
            ) : (
              <LockedButton icon={ArrowDownToLine} label={tWalletActions("deposit.trigger")} note={tWalletActions("kycLockedNote")} />
            )}
            <p className="text-xs text-muted-foreground">{t("crypto.delay")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="size-4 text-primary" />
              <CardTitle className="text-base">{t("card.title")}</CardTitle>
            </div>
            <CardDescription>{t("card.description")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {verified ? (
              <CardTopupDialog target="INVESTMENT" />
            ) : (
              <LockedButton icon={CreditCard} label={tWalletActions("buyByCard.trigger")} note={tWalletActions("kycLockedNote")} />
            )}
            <p className="text-xs text-muted-foreground">{t("card.delay")}</p>
          </CardContent>
        </Card>
      </div>

      {!verified && <p className="text-xs text-muted-foreground">{tWalletActions("kycLockedNote")}</p>}
    </div>
  );
}
