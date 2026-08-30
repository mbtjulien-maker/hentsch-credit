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
import {
  TRANSACTION_STATUS_LABELS,
  TRANSACTION_TYPE_LABELS,
  formatDate,
  formatUsd,
} from "@/lib/format";
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique des transactions</CardTitle>
        <CardDescription>Journal complet des mouvements du compte</CardDescription>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune transaction pour ce compte.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Référence on-chain</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">
                      {TRANSACTION_TYPE_LABELS[tx.type] ?? tx.type}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {SIGN[tx.type]}
                      {formatUsd(tx.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(tx.status)}>
                        {TRANSACTION_STATUS_LABELS[tx.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate font-mono text-xs text-muted-foreground">
                      {tx.referenceTx ?? "—"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatDate(tx.createdAt)}
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
