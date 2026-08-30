"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditSimulator, CREDIT_RATIO } from "@/components/dashboard/credit-simulator";
import { RepaymentProjection } from "@/components/dashboard/repayment-projection";
import { InstallmentSchedule } from "@/components/dashboard/installment-schedule";
import { useCreditRates } from "@/lib/use-credit-rates";
import { useEstimatedYield } from "@/lib/use-estimated-yield";
import { useCreditRequests } from "@/lib/use-credit-requests";
import {
  api,
  ApiError,
  type AccountCurrency,
  type BalanceSummary,
  type CreditRequest,
  type TransactionRecord,
} from "@/lib/api";
import { CREDIT_REQUEST_STATUS_LABELS, formatDate, formatUsd } from "@/lib/format";
import { GLASS_CARD_CLASS } from "@/lib/utils";

// Le crédit se gère ici en deux temps stricts : (1) simuler/soumettre une demande, (2)
// suivre/rembourser la position existante. La génération d'adresse de dépôt (que ce soit
// pour un dépôt général ou pour honorer une demande approuvée) ne vit PAS ici — elle vit
// exclusivement dans Solde (cf. app/dashboard/solde/page.tsx et
// credit-request-deposit.tsx), pour ne pas mélanger "gérer mon crédit" et "gérer mon
// portefeuille". Onglets contrôlés pour permettre au lien "faire une nouvelle demande"
// (dans l'onglet Gérer) de rebasculer programmatiquement sur l'onglet Demander.
export function CreditForm({
  summary,
  requestsState,
  transactions,
  onSuccess,
}: {
  summary: BalanceSummary;
  requestsState: ReturnType<typeof useCreditRequests>;
  transactions: TransactionRecord[] | null;
  onSuccess: () => Promise<void> | void;
}) {
  const [tab, setTab] = useState("request");

  return (
    <Card className={GLASS_CARD_CLASS}>
      <CardHeader>
        <CardTitle>Gérer ma ligne de crédit</CardTitle>
        <CardDescription>
          Le crédit s&apos;obtient sur demande : soumettez le gage envisagé, puis déposez
          les fonds depuis <strong>Solde</strong> une fois la demande approuvée.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={(v) => v && setTab(v)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="request">Demander un crédit</TabsTrigger>
            <TabsTrigger value="manage">Gérer / rembourser</TabsTrigger>
          </TabsList>
          <TabsContent value="request" className="pt-4">
            <CreditRequestPanel summary={summary} requestsState={requestsState} />
          </TabsContent>
          <TabsContent value="manage" className="pt-4">
            <RepayPanel
              summary={summary}
              transactions={transactions}
              onSuccess={onSuccess}
              onRequestNewCredit={() => setTab("request")}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Le simulateur reste TOUJOURS visible, qu'une demande soit déjà active ou non — simuler
// est un outil d'exploration indépendant du droit de soumettre une nouvelle demande.
// Seul le bouton de soumission se désactive (remplacé par le bandeau de statut) tant
// qu'une demande PENDING/APPROVED existe déjà.
function CreditRequestPanel({
  summary,
  requestsState,
}: {
  summary: BalanceSummary;
  requestsState: ReturnType<typeof useCreditRequests>;
}) {
  const { active, loading } = requestsState;

  if (loading) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>;
  }

  const statusBanner =
    active?.status === "PENDING" ? (
      <PendingRequestStatus request={active} />
    ) : active?.status === "APPROVED" ? (
      <ApprovedRequestStatus request={active} />
    ) : null;

  return (
    <NewRequestForm
      summary={summary}
      canSubmit={!active}
      statusBanner={statusBanner}
      onSubmitted={requestsState.refetch}
    />
  );
}

function PendingRequestStatus({ request }: { request: CreditRequest }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed bg-muted/40 px-4 py-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium">{CREDIT_REQUEST_STATUS_LABELS[request.status]}</span>
        <span className="tabular-nums text-muted-foreground">
          {formatUsd(request.collateralAmount)} ({request.currency})
        </span>
      </div>
      <p className="text-muted-foreground">
        Votre demande de crédit est en attente de validation. Une fois approuvée, direction{" "}
        <strong className="text-foreground">Solde</strong> pour générer l&apos;adresse de
        dépôt et débloquer le crédit.
      </p>
    </div>
  );
}

// Demande approuvée : simple redirection vers Solde, où vit toute la logique de
// génération d'adresse de dépôt (cf. credit-request-deposit.tsx) — aucune duplication ici.
function ApprovedRequestStatus({ request }: { request: CreditRequest }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed bg-muted/40 px-4 py-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium text-primary">
          {CREDIT_REQUEST_STATUS_LABELS[request.status]}
        </span>
        <span className="tabular-nums text-muted-foreground">
          {formatUsd(request.collateralAmount)} ({request.currency})
        </span>
      </div>
      <p className="text-muted-foreground">
        Rendez-vous dans <strong className="text-foreground">Solde</strong> pour choisir
        l&apos;actif et le réseau, puis générer l&apos;adresse de dépôt dédiée à cette
        demande : le crédit sera émis automatiquement dès réception des fonds.
      </p>
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        nativeButton={false}
        render={<Link href="/dashboard/solde" />}
      >
        Aller à Solde
        <ArrowRight className="size-3.5" />
      </Button>
    </div>
  );
}

function NewRequestForm({
  summary,
  canSubmit,
  statusBanner,
  onSubmitted,
}: {
  summary: BalanceSummary;
  canSubmit: boolean;
  statusBanner: ReactNode;
  onSubmitted: () => Promise<void> | void;
}) {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<AccountCurrency>("USD");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rates = useCreditRates();
  const estimatedYieldPct = useEstimatedYield();

  const parsedAmount = Number(amount);
  const isValid = canSubmit && amount.trim() !== "" && parsedAmount > 0;

  const simulatedAmount = Math.max(parsedAmount || 0, 0);
  const simulatedCreditIssued = simulatedAmount * CREDIT_RATIO;
  const interestRatePct = rates?.rates[currency]?.interestRatePct
    ? Number(rates.rates[currency].interestRatePct)
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.createCreditRequest(parsedAmount.toFixed(6), currency);
      setAmount("");
      await onSubmitted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {statusBanner}

      <CreditSimulator
        balance={summary.balance}
        amount={amount}
        onAmountChange={setAmount}
        currency={currency}
        onCurrencyChange={setCurrency}
        rates={rates}
      />

      {simulatedAmount > 0 && (
        <>
          <RepaymentProjection
            creditIssued={simulatedCreditIssued}
            collateralAmount={simulatedAmount}
            annualInterestRatePct={interestRatePct}
            estimatedYieldPct={estimatedYieldPct}
          />
          <InstallmentSchedule
            creditIssued={simulatedCreditIssued}
            annualInterestRatePct={interestRatePct}
            estimatedYieldPct={estimatedYieldPct}
          />
        </>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {canSubmit ? (
        <Button type="submit" disabled={!isValid || submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Soumettre une demande de crédit
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">
          Simulation uniquement : une demande est déjà en cours (voir ci-dessus).
        </p>
      )}
    </form>
  );
}

function RepayPanel({
  summary,
  transactions,
  onSuccess,
  onRequestNewCredit,
}: {
  summary: BalanceSummary;
  transactions: TransactionRecord[] | null;
  onSuccess: () => Promise<void> | void;
  onRequestNewCredit: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grantedCredit = Number(summary.balance.grantedCredit);
  const usedCredit = Number(summary.balance.usedCredit);
  const usedPct = grantedCredit > 0 ? Math.min((usedCredit / grantedCredit) * 100, 100) : 0;

  const parsedAmount = Number(amount);
  const isValid = amount.trim() !== "" && parsedAmount > 0 && parsedAmount <= usedCredit;
  const willUnlockCollateral = isValid && parsedAmount === usedCredit;

  const repayments = useMemo(
    () =>
      (transactions ?? [])
        .filter((t) => t.type === "REPAYMENT" || t.type === "YIELD_REPAYMENT")
        .slice(0, 5),
    [transactions],
  );

  const preview = useMemo(() => {
    if (!isValid) return null;
    const remaining = usedCredit - parsedAmount;
    return remaining === 0
      ? "Remboursement intégral : le gage sera libéré vers le solde disponible."
      : `Crédit utilisé restant après remboursement : ${formatUsd(remaining)}`;
  }, [isValid, usedCredit, parsedAmount]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.repayCredit(parsedAmount.toFixed(6));
      setAmount("");
      await onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Position actuelle — "gérer les infos" de la ligne de crédit, avant même de
          rembourser quoi que ce soit. */}
      <div className="rounded-lg border bg-muted/30 px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Crédit utilisé</span>
          <span className="font-medium tabular-nums">
            {formatUsd(usedCredit)} / {formatUsd(grantedCredit)}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background">
          <div
            className="h-full rounded-full bg-[#eb6834] transition-all duration-500 ease-in-out dark:bg-primary"
            style={{ width: `${usedPct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Besoin de plus de crédit ?{" "}
          <button
            type="button"
            onClick={onRequestNewCredit}
            className="font-medium text-foreground underline underline-offset-2 hover:no-underline"
          >
            Faire une nouvelle demande
          </button>
          .
        </p>
      </div>

      {usedCredit === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucun crédit utilisé actuellement : rien à rembourser.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="repay-amount">Montant à rembourser</Label>
            <Input
              id="repay-amount"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {preview && (
            <p
              className={`text-sm ${willUnlockCollateral ? "font-medium text-primary" : "text-muted-foreground"}`}
            >
              {preview}
            </p>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" variant="outline" disabled={!isValid || submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Rembourser
          </Button>
        </form>
      )}

      {/* Évolution du remboursement — historique compact, sans renvoyer vers la page
          Historique générale. */}
      {repayments.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">Évolution du remboursement</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {repayments.map((t) => (
              <li key={t.id} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {formatDate(t.createdAt)}
                  {t.type === "YIELD_REPAYMENT" && (
                    <span className="ml-1.5 text-[#1baf7a] dark:text-[#34D399]">· rendement du gage</span>
                  )}
                </span>
                <span className="font-medium tabular-nums">− {formatUsd(t.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
