"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSectionData } from "@/components/dashboard/use-section-data";
import { api, type TransactionRecord, type TransactionStatus } from "@/lib/api";
import { formatDate, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

type Filter = "all" | "funds" | "yield";

// Sens du mouvement du point de vue du wallet investissement : +1 il reçoit des fonds, −1
// il en verse (vers un placement ou vers le solde principal), 0 = rendement (variation du
// portefeuille placé, son signe vient du montant lui-même).
const WALLET_IN = new Set(["INVESTMENT_WALLET_TRANSFER_IN", "INVESTMENT_WITHDRAWAL", "FIXED_TERM_MATURITY_PAYOUT"]);
const WALLET_OUT = new Set(["INVESTMENT_WALLET_TRANSFER_OUT", "INVESTMENT_DEPOSIT", "FIXED_TERM_DEPOSIT"]);
const YIELD = new Set(["INVESTMENT_YIELD_ACCRUAL", "FIXED_TERM_YIELD_ACCRUAL"]);

function isInvestmentRelated(tx: TransactionRecord): boolean {
  if (WALLET_IN.has(tx.type) || WALLET_OUT.has(tx.type) || YIELD.has(tx.type)) return true;
  // Dépôts directs (crypto / carte) destinés au wallet investissement.
  return (tx.type === "DEPOSIT" || tx.type === "CARD_TOPUP") && tx.creditTarget === "INVESTMENT";
}

function signedAmount(tx: TransactionRecord): { text: string; tone: "in" | "out" | "neutral" } {
  const amount = Number(tx.amount);
  if (YIELD.has(tx.type)) {
    return { text: `${amount >= 0 ? "+" : ""}${formatUsd(amount)}`, tone: amount >= 0 ? "in" : "out" };
  }
  if (WALLET_OUT.has(tx.type)) return { text: `−${formatUsd(amount)}`, tone: "out" };
  // Un dépôt en attente de validation n'a pas encore crédité le wallet : pas de signe.
  if (tx.status !== "COMPLETED") return { text: formatUsd(amount), tone: "neutral" };
  return { text: `+${formatUsd(amount)}`, tone: "in" };
}

function statusVariant(status: TransactionStatus): "default" | "secondary" | "destructive" {
  if (status === "COMPLETED") return "default";
  if (status === "PENDING") return "secondary";
  return "destructive";
}

const PAGE = 50;

// Journal — l'historique propre à l'espace Investissement : mouvements de fonds (virements,
// dépôts directs, placements, retraits, règlements à échéance) et rendements quotidiens,
// filtrables. Les rendements sont nombreux (un par jour et par position) : ils sont
// séparés des mouvements pour ne pas noyer ce que le client a réellement fait.
export function InvestmentJournal() {
  const t = useTranslations("Dashboard.investmentSpace.journal");
  const tLabels = useTranslations("Dashboard.labels");
  const tHistory = useTranslations("Dashboard.transactionHistory");
  const locale = useLocale();
  const { data, loading, error } = useSectionData((userId) => api.listTransactions(userId));
  const [filter, setFilter] = useState<Filter>("funds");
  const [visible, setVisible] = useState(PAGE);

  const rows = useMemo(() => {
    const all = (data ?? []).filter(isInvestmentRelated);
    const filtered =
      filter === "all" ? all : filter === "yield" ? all.filter((tx) => YIELD.has(tx.type)) : all.filter((tx) => !YIELD.has(tx.type));
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [data, filter]);

  if (error) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
      </Card>
    );
  }
  if (loading || !data) return <Skeleton className="h-72 w-full" />;

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label={t("filterAria")} className="inline-flex w-fit rounded-lg bg-muted p-[3px] text-sm font-medium">
        {(["funds", "yield", "all"] as const).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => {
              setFilter(f);
              setVisible(PAGE);
            }}
            className={cn(
              "rounded-md px-3 py-1 whitespace-nowrap transition-colors",
              filter === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`filter.${f}`)}
          </button>
        ))}
      </div>

      <Card>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-xs text-muted-foreground">
                    <th className="px-2 py-2 text-left font-medium">{tHistory("columns.date")}</th>
                    <th className="px-2 py-2 text-left font-medium">{tHistory("columns.type")}</th>
                    <th className="px-2 py-2 text-left font-medium">{tHistory("columns.status")}</th>
                    <th className="px-2 py-2 text-right font-medium">{tHistory("columns.amount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, visible).map((tx) => {
                    const amount = signedAmount(tx);
                    return (
                      <tr key={tx.id} className="border-b border-border/40 last:border-0">
                        <td className="px-2 py-2.5 whitespace-nowrap text-muted-foreground">{formatDate(tx.createdAt, locale)}</td>
                        <td className="px-2 py-2.5 font-medium">{tLabels(`transactionType.${tx.type}`)}</td>
                        <td className="px-2 py-2.5">
                          <Badge variant={statusVariant(tx.status)}>{tLabels(`transactionStatus.${tx.status}`)}</Badge>
                        </td>
                        <td
                          className={cn(
                            "px-2 py-2.5 text-right font-medium tabular-nums",
                            amount.tone === "in" && "text-[color:var(--spark-good)]",
                            amount.tone === "out" && "text-[color:var(--spark-critical)]",
                          )}
                        >
                          {amount.text}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {rows.length > visible && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" size="sm" onClick={() => setVisible((v) => v + PAGE)}>
                {t("more", { count: rows.length - visible })}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
