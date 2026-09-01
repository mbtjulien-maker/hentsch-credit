"use client";

import { useEffect, useId, useState } from "react";
import { Briefcase, CheckCircle2, Info, Loader2, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  api,
  ApiError,
  type AccountCurrency,
  type DirectCreditRates,
  type DirectCreditRequest,
} from "@/lib/api";
import { formatAccountCurrency, formatDate } from "@/lib/format";
import { GLASS_CARD_CLASS } from "@/lib/utils";

function CurrencyToggle({
  value,
  onChange,
}: {
  value: AccountCurrency;
  onChange: (value: AccountCurrency) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {(["USD", "EUR"] as const).map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
            value === c
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

// Panneau des conditions actuelles — consulté avant soumission, cf. GET
// /direct-credit-requests/rates/:currency. Même logique de transparence que
// CreditRatesPanel (crédit gagé) : les seuils réels, pas devinés côté frontend.
function RatesPanel({ rates }: { rates: DirectCreditRates | null }) {
  const t = useTranslations("Dashboard.directCredit");
  if (!rates) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("ratesTitle")}</CardTitle>
        <CardDescription>{t("ratesDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <div className="text-xs text-muted-foreground">{t("ratesInterestRate")}</div>
          <div className="font-semibold tabular-nums">{rates.interestRatePct}%/an</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{t("ratesOriginationFee")}</div>
          <div className="font-semibold tabular-nums">{rates.originationFeePct}%</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{t("ratesTerm")}</div>
          <div className="font-semibold tabular-nums">{rates.termMonths} {t("months")}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{t("ratesMinSeniority")}</div>
          <div className="font-semibold tabular-nums">{rates.minCompanySeniorityMonths} {t("months")}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{t("ratesMinRevenue")}</div>
          <div className="font-semibold tabular-nums">{rates.minMonthlyRevenue}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{t("ratesMaxMultiple")}</div>
          <div className="font-semibold tabular-nums">{rates.maxRequestToMonthlyRevenueMultiple}×</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{t("ratesMaxDsr")}</div>
          <div className="font-semibold tabular-nums">≤ {rates.maxDebtServiceRatioPct}%</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{t("ratesMinGuarantee")}</div>
          <div className="font-semibold tabular-nums">≥ {rates.minGuaranteeCoveragePct}%</div>
        </div>
      </CardContent>
    </Card>
  );
}

function DecisionResult({ result }: { result: DirectCreditRequest }) {
  const t = useTranslations("Dashboard.directCredit");
  const eligible = result.decision === "ELIGIBLE";
  return (
    <div className={`rounded-lg border px-4 py-3.5 ${eligible ? "border-primary/40 bg-primary/5" : "border-destructive/40 bg-destructive/5"}`}>
      <div className="flex items-center gap-2">
        {eligible ? (
          <CheckCircle2 className="size-5 text-primary" />
        ) : (
          <XCircle className="size-5 text-destructive" />
        )}
        <span className="font-semibold">
          {eligible ? t("resultEligible") : t("resultIneligible")}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {eligible ? t("resultEligibleNote") : t("resultIneligibleNote")}
      </p>

      <ul className="mt-3 flex flex-col gap-1.5">
        {result.eligibilityBreakdown.map((c) => (
          <li key={c.key} className="flex items-start gap-2 text-xs">
            {c.passed ? (
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
            ) : (
              <XCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
            )}
            <span>
              <span className="font-medium text-foreground">{c.label}</span>
              {" — "}
              <span className="text-muted-foreground">
                {c.observed} ({t("threshold")}: {c.threshold})
              </span>
            </span>
          </li>
        ))}
      </ul>

      {eligible && (
        <p className="mt-3 text-xs text-muted-foreground">
          {t("resultEstimate", {
            rate: result.estimatedRatePct,
            payment: formatAccountCurrency(result.estimatedMonthlyPayment, result.currency),
          })}
        </p>
      )}
    </div>
  );
}

function History({ requests }: { requests: DirectCreditRequest[] }) {
  const t = useTranslations("Dashboard.directCredit");
  if (requests.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("historyEmpty")}</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {requests.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2 text-sm">
          <div>
            <div className="font-medium">{r.companyName}</div>
            <div className="text-xs text-muted-foreground">
              {formatAccountCurrency(r.requestedAmount, r.currency)} · {formatDate(r.createdAt)}
            </div>
          </div>
          <Badge variant={r.decision === "ELIGIBLE" ? "default" : "destructive"}>
            {t(`historyDecision.${r.decision}`)}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

export function DirectCreditForm({
  history,
  onSuccess,
}: {
  history: DirectCreditRequest[];
  onSuccess: () => void;
}) {
  const t = useTranslations("Dashboard.directCredit");
  const companyNameId = useId();
  const registrationNumberId = useId();
  const sectorId = useId();
  const seniorityId = useId();
  const descriptionId = useId();
  const amountId = useId();
  const revenueId = useId();
  const expensesId = useId();
  const guaranteeId = useId();

  const [currency, setCurrency] = useState<AccountCurrency>("USD");
  const [rates, setRates] = useState<DirectCreditRates | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [sector, setSector] = useState("");
  const [seniority, setSeniority] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [revenue, setRevenue] = useState("");
  const [expenses, setExpenses] = useState("");
  const [guarantee, setGuarantee] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DirectCreditRequest | null>(null);

  useEffect(() => {
    let ignore = false;
    api
      .getDirectCreditRates(currency)
      .then((r) => {
        if (!ignore) setRates(r);
      })
      .catch(() => {
        // Purement informatif — le formulaire reste utilisable, le backend revalide de
        // toute façon les seuils réels à la soumission.
      });
    return () => {
      ignore = true;
    };
  }, [currency]);

  const isValid =
    companyName.trim() !== "" &&
    registrationNumber.trim() !== "" &&
    sector.trim() !== "" &&
    seniority.trim() !== "" &&
    description.trim().length >= 10 &&
    Number(amount) > 0 &&
    Number(revenue) > 0 &&
    expenses.trim() !== "" &&
    guarantee.trim() !== "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const created = await api.createDirectCreditRequest({
        companyName: companyName.trim(),
        registrationNumber: registrationNumber.trim(),
        sector: sector.trim(),
        companySeniorityMonths: Math.round(Number(seniority)),
        projectDescription: description.trim(),
        requestedAmount: Number(amount).toFixed(6),
        currency,
        declaredMonthlyRevenue: Number(revenue).toFixed(6),
        declaredMonthlyExpenses: Number(expenses || 0).toFixed(6),
        guaranteeOffered: Number(guarantee || 0).toFixed(6),
      });
      setResult(created);
      toast.success(
        created.decision === "ELIGIBLE" ? t("resultEligible") : t("resultIneligible"),
      );
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <RatesPanel rates={rates} />

      <Card className={GLASS_CARD_CLASS}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="size-4.5 text-primary" />
            {t("formTitle")}
          </CardTitle>
          <CardDescription>{t("formDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor={companyNameId}>{t("companyName")}</Label>
                <Input id={companyNameId} value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={registrationNumberId}>{t("registrationNumber")}</Label>
                <Input id={registrationNumberId} value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={sectorId}>{t("sector")}</Label>
                <Input id={sectorId} value={sector} onChange={(e) => setSector(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={seniorityId}>{t("seniorityMonths")}</Label>
                <Input id={seniorityId} inputMode="numeric" value={seniority} onChange={(e) => setSeniority(e.target.value)} />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor={descriptionId}>{t("projectDescription")}</Label>
              <Textarea id={descriptionId} value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>

            <div className="grid gap-1.5">
              <Label>{t("currency")}</Label>
              <CurrencyToggle value={currency} onChange={setCurrency} />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label htmlFor={amountId}>{t("requestedAmount")}</Label>
                <Input id={amountId} inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={revenueId}>{t("declaredMonthlyRevenue")}</Label>
                <Input id={revenueId} inputMode="decimal" placeholder="0.00" value={revenue} onChange={(e) => setRevenue(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={expensesId}>{t("declaredMonthlyExpenses")}</Label>
                <Input id={expensesId} inputMode="decimal" placeholder="0.00" value={expenses} onChange={(e) => setExpenses(e.target.value)} />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor={guaranteeId}>{t("guaranteeOffered")}</Label>
              <Input id={guaranteeId} inputMode="decimal" placeholder="0.00" value={guarantee} onChange={(e) => setGuarantee(e.target.value)} />
              <p className="text-xs text-muted-foreground">{t("guaranteeNote")}</p>
            </div>

            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              {t("disclaimer")}
            </p>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={!isValid || loading} className="self-start">
              {loading && <Loader2 className="size-4 animate-spin" />}
              {t("submit")}
            </Button>
          </form>

          {result && (
            <div className="mt-5">
              <DecisionResult result={result} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("historyTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <History requests={history} />
        </CardContent>
      </Card>
    </div>
  );
}
