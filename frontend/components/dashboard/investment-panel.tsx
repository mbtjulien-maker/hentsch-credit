"use client";

import { useEffect, useState } from "react";
import { Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  api,
  ApiError,
  type InvestmentBasket,
  type InvestmentBasketRate,
  type InvestmentPosition,
  type InvestmentRates,
} from "@/lib/api";
import { formatUsd } from "@/lib/format";

const BASKETS: InvestmentBasket[] = ["RWA_STRATEGY", "STOCKS"];

// Un seul panneau par panier — dernier rendement quotidien réel affiché (peut être
// négatif, cf. InvestmentService.accrueYieldForPosition), jamais masqué comme une erreur :
// un placement réel porte un vrai risque de perte, contrairement au rendement indexé du
// gage (§2A) qui ne rembourse jamais que sur plus-value.
function BasketCard({
  basket,
  rate,
  position,
  busy,
  onDeposit,
  onWithdraw,
}: {
  basket: InvestmentBasket;
  rate: InvestmentBasketRate | null;
  position: InvestmentPosition | null;
  busy: boolean;
  onDeposit: (basket: InvestmentBasket, amount: string) => Promise<void>;
  onWithdraw: (basket: InvestmentBasket) => Promise<void>;
}) {
  const t = useTranslations("Dashboard.investment");
  const [amount, setAmount] = useState("");

  const dailyPct =
    basket === "RWA_STRATEGY" ? rate?.latestDailyReturnPct : rate?.latestMarketSignalPct;
  const dailyPctIsNegative = dailyPct != null && Number(dailyPct) < 0;

  const principal = position ? Number(position.principalAmount) : 0;
  const accruedYield = position ? Number(position.accruedYield) : 0;
  const totalValue = principal + accruedYield;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t(`basket.${basket}.title`)}</CardTitle>
        <CardDescription>{t(`basket.${basket}.description`)}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("indicativeAnnual")}</span>
          <span className="font-semibold tabular-nums">
            {rate ? `${rate.indicativeAnnualPct}%/an` : "—"}
          </span>
        </div>

        {dailyPct != null && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("latestDaily")}</span>
            <span
              className={`flex items-center gap-1 font-semibold tabular-nums ${
                dailyPctIsNegative ? "text-destructive" : "text-primary"
              }`}
            >
              {dailyPctIsNegative ? (
                <TrendingDown className="size-3.5" />
              ) : (
                <TrendingUp className="size-3.5" />
              )}
              {dailyPct}%
            </span>
          </div>
        )}

        {position && (
          <div className="flex flex-col gap-1 rounded-lg border border-border/60 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("principal")}</span>
              <span className="font-medium tabular-nums">{formatUsd(principal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("accruedYield")}</span>
              <span
                className={`font-medium tabular-nums ${
                  accruedYield < 0 ? "text-destructive" : "text-primary"
                }`}
              >
                {formatUsd(accruedYield)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between border-t border-border/60 pt-1.5 text-sm">
              <span className="font-medium">{t("totalValue")}</span>
              <span className="font-semibold tabular-nums">{formatUsd(totalValue)}</span>
            </div>
          </div>
        )}

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
          <Button
            type="button"
            disabled={busy || !(Number(amount) > 0)}
            onClick={() => {
              void onDeposit(basket, amount).then(() => setAmount(""));
            }}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : t("deposit")}
          </Button>
        </div>

        {position && (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => {
              void onWithdraw(basket);
            }}
          >
            {t("withdrawAll")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function InvestmentPanel({
  positions,
  onSuccess,
}: {
  positions: InvestmentPosition[];
  onSuccess: () => void;
}) {
  const t = useTranslations("Dashboard.investment");
  const [rates, setRates] = useState<InvestmentRates | null>(null);
  const [busyBasket, setBusyBasket] = useState<InvestmentBasket | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    api
      .getInvestmentRates()
      .then((r) => {
        if (!ignore) setRates(r);
      })
      .catch(() => {
        // Purement informatif — le panneau reste utilisable sans le rendement indicatif.
      });
    return () => {
      ignore = true;
    };
  }, []);

  const activePositions = new Map(
    positions.filter((p) => p.status === "ACTIVE").map((p) => [p.basket, p]),
  );

  async function handleDeposit(basket: InvestmentBasket, amount: string) {
    setBusyBasket(basket);
    setError(null);
    try {
      await api.depositInvestment(basket, Number(amount).toFixed(6));
      toast.success(t("depositSuccess"));
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("genericError"));
    } finally {
      setBusyBasket(null);
    }
  }

  async function handleWithdraw(basket: InvestmentBasket) {
    setBusyBasket(basket);
    setError(null);
    try {
      const result = await api.withdrawInvestment(basket);
      toast.success(t("withdrawSuccess", { amount: formatUsd(result.withdrawnAmount) }));
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("genericError"));
    } finally {
      setBusyBasket(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {BASKETS.map((basket) => (
          <BasketCard
            key={basket}
            basket={basket}
            rate={rates?.[basket] ?? null}
            position={activePositions.get(basket) ?? null}
            busy={busyBasket === basket}
            onDeposit={handleDeposit}
            onWithdraw={handleWithdraw}
          />
        ))}
      </div>
    </div>
  );
}
