"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatUsd } from "@/lib/format";
import type { TransactionRecord, TransactionStatus } from "@/lib/api";

const SIGN: Record<string, "+" | "−" | ""> = {
  DEPOSIT: "+",
  CREDIT_ISSUED: "",
  COLLATERAL_LOCK: "",
  REPAYMENT: "",
  CARD_PAYMENT: "−",
  WITHDRAWAL: "−",
};

function statusVariant(status: TransactionStatus): "default" | "secondary" | "destructive" {
  if (status === "COMPLETED") return "default";
  if (status === "PENDING") return "secondary";
  return "destructive";
}

// Un compte actif journalise des centaines de lignes (un rendement par placement et par
// jour) : on n'affiche que les plus récentes, par tranches, plutôt que toute la liste.
// `limit` (accueil) fige l'affichage aux N dernières avec un lien vers l'historique complet ;
// sans `limit` (page Historique), l'utilisateur déplie par tranches de PAGE_SIZE.
const PAGE_SIZE = 25;

export function TransactionHistory({
  transactions,
  limit,
}: {
  transactions: TransactionRecord[];
  limit?: number;
}) {
  const [visible, setVisible] = useState(limit ?? PAGE_SIZE);
  const shown = transactions.slice(0, visible);
  const hasMore = transactions.length > shown.length;
  const t = useTranslations("Dashboard.transactionHistory");
  const tLabels = useTranslations("Dashboard.labels");
  const locale = useLocale();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noTransactions")}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.type")}</TableHead>
                  <TableHead>{t("columns.amount")}</TableHead>
                  <TableHead>{t("columns.status")}</TableHead>
                  <TableHead>{t("columns.onChainReference")}</TableHead>
                  <TableHead className="text-right">{t("columns.date")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">
                      {tLabels(`transactionType.${tx.type}`)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {SIGN[tx.type]}
                      {formatUsd(tx.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(tx.status)}>
                        {tLabels(`transactionStatus.${tx.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate font-mono text-xs text-muted-foreground">
                      {tx.referenceTx ?? "—"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatDate(tx.createdAt, locale)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {hasMore && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>{t("shownCount", { shown: shown.length, total: transactions.length })}</span>
            {limit !== undefined ? (
              <Button nativeButton={false} variant="outline" size="sm" render={<Link href="/dashboard/historique" />}>
                {t("viewAll")}
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setVisible((n) => n + PAGE_SIZE)}>
                {t("showMore")}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
