"use client";

import { useState } from "react";
import { ArrowLeftRight, Loader2, Wallet, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatUsd } from "@/lib/format";

const QUICK_FRACTIONS = [0.25, 0.5, 0.75, 1] as const;

// Wallet investissement (cf. §2H CLAUDE.md entrée #31) — solde SÉPARÉ du solde principal
// (celui qui sert au crédit), qui alimente les 6 paniers perpétuels et les 6 plans à
// échéance fixe. La SEULE façon d'y faire entrer ou sortir des fonds est ce virement
// interne : les dépôts on-chain/bancaires réels continuent tous de créditer le solde
// principal, via les mêmes adresses de dépôt et actifs acceptés qu'avant — jamais
// directement ce wallet.
type Direction = "in" | "out";

export function InvestmentWalletCard({
  mainBalance,
  walletBalance,
  busy,
  onTransfer,
}: {
  mainBalance: number | null;
  walletBalance: number | null;
  busy: boolean;
  onTransfer: (direction: Direction, amount: string) => Promise<void>;
}) {
  const t = useTranslations("Dashboard.investment.wallet");
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<Direction>("in");
  const [amount, setAmount] = useState("");

  const sourceBalance = direction === "in" ? mainBalance : walletBalance;
  const parsedAmount = Number(amount);
  const exceedsSource = sourceBalance != null && parsedAmount > sourceBalance;
  const isValidAmount = parsedAmount > 0 && !exceedsSource;

  async function handleTransfer() {
    await onTransfer(direction, amount);
    setAmount("");
    setOpen(false);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Wallet className="size-4 text-muted-foreground" />
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </div>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-xs text-muted-foreground">{t("mainBalance")}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {mainBalance != null ? formatUsd(mainBalance) : "—"}
            </p>
          </div>
          <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
            <p className="text-xs text-muted-foreground">{t("walletBalance")}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-primary">
              {walletBalance != null ? formatUsd(walletBalance) : "—"}
            </p>
          </div>
        </div>

        {/* Réduit à un petit bouton par défaut (retour client : "l'option de transfert
            doit être un petit bouton réduit") — le formulaire complet (sens, montant,
            raccourcis) ne s'ouvre qu'à la demande, plutôt que d'occuper en permanence de
            l'espace sous les deux soldes. */}
        {!open ? (
          <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setOpen(true)}>
            <ArrowLeftRight className="size-3.5" />
            {t("transfer")}
          </Button>
        ) : (
          <div className="flex flex-col gap-1.5 rounded-lg border border-border/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setDirection("in")}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    direction === "in"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("directionIn")}
                </button>
                <button
                  type="button"
                  onClick={() => setDirection("out")}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    direction === "out"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("directionOut")}
                </button>
              </div>
              <button
                type="button"
                aria-label={t("cancel")}
                disabled={busy}
                onClick={() => {
                  setOpen(false);
                  setAmount("");
                }}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder={t("amountPlaceholder")}
                value={amount}
                disabled={busy}
                onChange={(e) => setAmount(e.target.value)}
              />
              <Button type="button" disabled={busy || !isValidAmount} onClick={() => void handleTransfer()}>
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <ArrowLeftRight className="size-4" />
                    {t("transfer")}
                  </>
                )}
              </Button>
            </div>

            {sourceBalance != null && sourceBalance > 0 && (
              <div className="flex gap-1.5">
                {QUICK_FRACTIONS.map((fraction) => (
                  <button
                    key={fraction}
                    type="button"
                    disabled={busy}
                    onClick={() => setAmount((sourceBalance * fraction).toFixed(2))}
                    className="rounded-md border border-border/60 px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                  >
                    {fraction === 1 ? t("quickMax") : `${fraction * 100}%`}
                  </button>
                ))}
              </div>
            )}

            {exceedsSource && <p className="text-xs text-destructive">{t("insufficientBalance")}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
