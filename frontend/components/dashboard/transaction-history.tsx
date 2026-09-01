import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export function TransactionHistory({ transactions }: { transactions: TransactionRecord[] }) {
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
                {transactions.map((tx) => (
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
      </CardContent>
    </Card>
  );
}
