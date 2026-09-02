"use client";

import { useEffect, useState } from "react";
import { Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MiniSparkline } from "@/components/marketing/performance-chart";
import { InvestmentAdvisorDialog } from "@/components/dashboard/investment-advisor-dialog";
import { FixedTermPlansSection } from "@/components/dashboard/fixed-term-plans-section";
import { InvestmentWalletCard } from "@/components/dashboard/investment-wallet-card";
import { MyPlacementsSection } from "@/components/dashboard/my-placements-section";
import { TermsAcceptance } from "@/components/dashboard/terms-acceptance";
import {
  api,
  ApiError,
  INVESTMENT_BASKETS,
  type FixedTermPlan,
  type FixedTermPlanId,
  type FixedTermPosition,
  type InvestmentAssets,
  type InvestmentBasket,
  type InvestmentBasketRate,
  type InvestmentHistory,
  type InvestmentPosition,
  type InvestmentRates,
  type RwaBasketAsset,
  type StockBasketAsset,
} from "@/lib/api";
import { formatUsd } from "@/lib/format";

const QUICK_FRACTIONS = [0.25, 0.5, 0.75, 1] as const;

// Convertit une série de rendements quotidiens réels (%) en indice de croissance
// cumulée (base 100) — MiniSparkline attend une progression de valeur, pas un
// pourcentage brut par point ; c'est la même composition que
// InvestmentService.accrueYieldForPosition côté backend (jamais un point fabriqué,
// seulement recalculé pour l'affichage à partir de vrais rendements déjà persistés).
function buildReturnIndex(points: { date: string; returnPct: string }[]) {
  let index = 100;
  return points.map((p) => {
    index = index * (1 + Number(p.returnPct) / 100);
    return { t: new Date(p.date).getTime(), usd: index };
  });
}

// Classification indicative (1-5, cf. RISK_LEVEL côté backend) — jamais un score calculé
// en direct, une hypothèse de stratégie éditoriale affichée à titre informatif. Seuil
// médian élargi à 3,5 (plutôt que l'égalité stricte === 3) depuis l'introduction des
// plans à échéance fixe (§2H CLAUDE.md entrée #29), dont les scores de risque (2,5/3,5)
// ne tombent pas exactement sur les paliers entiers des 6 paniers perpétuels.
export function riskLabel(level: number, t: ReturnType<typeof useTranslations>): string {
  if (level <= 2) return t("risk.low");
  if (level <= 3.5) return t("risk.medium");
  return t("risk.high");
}

export function RiskBadge({ level }: { level: number }) {
  const t = useTranslations("Dashboard.investment");
  const colorClass =
    level <= 2
      ? "border-primary/40 text-primary"
      : level <= 3.5
        ? "border-amber-500/40 text-amber-600 dark:text-amber-400"
        : "border-destructive/40 text-destructive";
  return (
    <Badge variant="outline" className={colorClass}>
      {t("risk.label", { level, max: 5, description: riskLabel(level, t) })}
    </Badge>
  );
}

// Détail des actifs réellement impliqués dans le panier — au-delà du rendement agrégé
// affiché plus bas, pour que le client voie concrètement la composition de la stratégie
// avant de placer des fonds (cf. §2H CLAUDE.md, GET /investment/assets). Un actif sans
// cours disponible pour l'instant (prix null) affiche "—" plutôt que d'être masqué : la
// composition du panier reste stable même si sa cotation manque temporairement.
function AssetsTable({ assets }: { assets: (RwaBasketAsset | StockBasketAsset)[] }) {
  const t = useTranslations("Dashboard.investment");
  if (assets.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full min-w-[280px] text-left text-xs">
        <thead>
          <tr className="border-b border-border/60 text-[10.5px] uppercase tracking-wide text-muted-foreground/80">
            <th className="px-2.5 py-1.5 font-medium">{t("assetsTable.asset")}</th>
            <th className="px-2.5 py-1.5 text-right font-medium">{t("assetsTable.price")}</th>
            <th className="px-2.5 py-1.5 text-right font-medium">{t("assetsTable.change")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40 tabular-nums">
          {assets.map((asset) => {
            const key = "currency" in asset ? asset.currency : asset.ticker;
            const image = "image" in asset ? asset.image : null;
            const changePct = asset.changePct;
            const isNegative = changePct != null && changePct < 0;
            return (
              <tr key={key}>
                <td className="flex items-center gap-1.5 px-2.5 py-1.5">
                  {image && (
                    // eslint-disable-next-line @next/next/no-img-element -- même logo CDN CoinMarketCap que market-view.tsx, hors du domaine autorisé par next/image
                    <img src={image} alt="" className="size-4 rounded-full" />
                  )}
                  <span className="truncate">{asset.name}</span>
                </td>
                <td className="px-2.5 py-1.5 text-right">
                  {asset.price != null ? formatUsd(asset.price) : "—"}
                </td>
                <td
                  className={`px-2.5 py-1.5 text-right font-medium ${
                    changePct == null ? "text-muted-foreground" : isNegative ? "text-destructive" : "text-primary"
                  }`}
                >
                  {changePct != null ? `${isNegative ? "" : "+"}${changePct.toFixed(2)}%` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Un seul panneau par panier — dernier rendement quotidien réel affiché (peut être
// négatif, cf. InvestmentService.accrueYieldForPosition), jamais masqué comme une erreur :
// un placement réel porte un vrai risque de perte, contrairement au rendement indexé du
// gage (§2A) qui ne rembourse jamais que sur plus-value.
function BasketCard({
  basket,
  rate,
  assets,
  history,
  position,
  availableBalance,
  busy,
  onDeposit,
  onWithdraw,
}: {
  basket: InvestmentBasket;
  rate: InvestmentBasketRate | null;
  assets: (RwaBasketAsset | StockBasketAsset)[];
  history: { date: string; returnPct: string }[];
  position: InvestmentPosition | null;
  availableBalance: number | null;
  busy: boolean;
  onDeposit: (basket: InvestmentBasket, amount: string) => Promise<void>;
  onWithdraw: (basket: InvestmentBasket) => Promise<void>;
}) {
  const t = useTranslations("Dashboard.investment");
  const [amount, setAmount] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const dailyPct =
    basket === "RWA_STRATEGY" ? rate?.latestDailyReturnPct : rate?.latestMarketSignalPct;
  const dailyPctIsNegative = dailyPct != null && Number(dailyPct) < 0;

  const principal = position ? Number(position.principalAmount) : 0;
  const accruedYield = position ? Number(position.accruedYield) : 0;
  const totalValue = principal + accruedYield;

  const parsedAmount = Number(amount);
  const minAmount = 10;
  const exceedsBalance = availableBalance != null && parsedAmount > availableBalance;
  const belowMinimum = amount.trim() !== "" && parsedAmount > 0 && parsedAmount < minAmount;
  const isValidAmount = parsedAmount > 0 && !exceedsBalance && !belowMinimum && acceptedTerms;

  const sparklinePoints = buildReturnIndex(history);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{t(`basket.${basket}.title`)}</CardTitle>
          {rate && <RiskBadge level={rate.riskLevel} />}
        </div>
        <CardDescription>{t(`basket.${basket}.description`)}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t("assetsTable.title")}</p>
          <AssetsTable assets={assets} />
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("indicativeAnnual")}</span>
          <span className="font-semibold tabular-nums">
            {rate ? `${rate.indicativeAnnualPct}%/an` : "—"}
          </span>
        </div>

        {dailyPct != null && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("latestDaily")}</span>
            <div className="flex items-center gap-2">
              {sparklinePoints.length >= 2 && (
                <MiniSparkline points={sparklinePoints} width={56} height={22} />
              )}
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

        <div className="flex flex-col gap-1.5">
          <TermsAcceptance variant="investment" accepted={acceptedTerms} onAcceptedChange={setAcceptedTerms} disabled={busy} />
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
              disabled={busy || !isValidAmount}
              onClick={() => {
                void onDeposit(basket, amount).then(() => {
                  setAmount("");
                  setAcceptedTerms(false);
                });
              }}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : t("deposit")}
            </Button>
          </div>

          {/* Raccourcis 25/50/75/MAX — calculés sur le vrai solde disponible du client
              (cf. availableBalance, passé par InvestmentPanel), jamais une valeur devinée. */}
          {availableBalance != null && availableBalance > 0 && (
            <div className="flex gap-1.5">
              {QUICK_FRACTIONS.map((fraction) => (
                <button
                  key={fraction}
                  type="button"
                  disabled={busy}
                  onClick={() => setAmount((availableBalance * fraction).toFixed(2))}
                  className="rounded-md border border-border/60 px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                >
                  {fraction === 1 ? t("quickMax") : `${fraction * 100}%`}
                </button>
              ))}
            </div>
          )}

          {exceedsBalance && (
            <p className="text-xs text-destructive">{t("insufficientBalance")}</p>
          )}
          {belowMinimum && (
            <p className="text-xs text-destructive">{t("belowMinimum", { min: minAmount })}</p>
          )}
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
  userId,
  positions,
  onSuccess,
}: {
  userId: string;
  positions: InvestmentPosition[];
  onSuccess: () => void;
}) {
  const t = useTranslations("Dashboard.investment");
  const [rates, setRates] = useState<InvestmentRates | null>(null);
  const [assets, setAssets] = useState<InvestmentAssets | null>(null);
  const [history, setHistory] = useState<InvestmentHistory | null>(null);
  const [fixedTermPlans, setFixedTermPlans] = useState<FixedTermPlan[] | null>(null);
  const [fixedTermPositions, setFixedTermPositions] = useState<FixedTermPosition[]>([]);
  // Wallet investissement (cf. §2H CLAUDE.md entrée #31) — solde SÉPARÉ du solde
  // principal : les paniers/plans ci-dessous débitent/créditent walletBalance, jamais
  // mainBalance directement. mainBalance ne sert plus qu'à alimenter le formulaire de
  // virement interne (cf. InvestmentWalletCard).
  const [mainBalance, setMainBalance] = useState<number | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [busyBasket, setBusyBasket] = useState<InvestmentBasket | null>(null);
  const [busyPlan, setBusyPlan] = useState<FixedTermPlanId | null>(null);
  const [busyWallet, setBusyWallet] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function refreshFixedTermPositions() {
    api
      .listFixedTermPositions(userId)
      .then(setFixedTermPositions)
      .catch(() => {
        // Purement informatif — la section reste utilisable sans l'historique des
        // positions (le dépôt lui-même reste possible).
      });
  }

  function refreshBalances() {
    api
      .getBalance(userId)
      .then((b) => {
        setMainBalance(Number(b.balance.availableBalance));
        setWalletBalance(Number(b.balance.investmentBalance));
      })
      .catch(() => {
        // Purement informatif — sans le solde, les raccourcis restent simplement masqués.
      });
  }

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
    api
      .getInvestmentAssets()
      .then((a) => {
        if (!ignore) setAssets(a);
      })
      .catch(() => {
        // Purement informatif — le panneau reste utilisable sans le détail des actifs.
      });
    api
      .getInvestmentHistory()
      .then((h) => {
        if (!ignore) setHistory(h);
      })
      .catch(() => {
        // Purement informatif — le panneau reste utilisable sans la tendance.
      });
    api
      .getFixedTermPlans()
      .then((p) => {
        if (!ignore) setFixedTermPlans(p);
      })
      .catch(() => {
        // Purement informatif — les paniers perpétuels restent utilisables sans les
        // plans à échéance fixe (section masquée si absente, cf. FixedTermPlansSection).
      });
    api
      .listFixedTermPositions(userId)
      .then((p) => {
        if (!ignore) setFixedTermPositions(p);
      })
      .catch(() => {
        // Purement informatif — voir refreshFixedTermPositions ci-dessus.
      });
    // Soldes réels — mainBalance/walletBalance, utilisés pour le virement interne
    // (InvestmentWalletCard) et pour les raccourcis 25/50/75/MAX des paniers/plans
    // (désormais sur walletBalance, jamais mainBalance directement).
    api
      .getBalance(userId)
      .then((b) => {
        if (!ignore) {
          setMainBalance(Number(b.balance.availableBalance));
          setWalletBalance(Number(b.balance.investmentBalance));
        }
      })
      .catch(() => {
        // Purement informatif — sans le solde, les raccourcis restent simplement masqués.
      });
    return () => {
      ignore = true;
    };
  }, [userId]);

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
      // Débite le wallet investissement (§2H CLAUDE.md entrée #31) — jamais rafraîchi
      // automatiquement par onSuccess() (qui ne rafraîchit que les positions côté page).
      refreshBalances();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("genericError"));
    } finally {
      setBusyBasket(null);
    }
  }

  async function handleDepositFixedTerm(plan: FixedTermPlanId, amount: string) {
    setBusyPlan(plan);
    setError(null);
    try {
      await api.depositFixedTerm(plan, Number(amount).toFixed(6));
      toast.success(t("fixedTermPlans.depositSuccess"));
      refreshFixedTermPositions();
      refreshBalances();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("genericError"));
    } finally {
      setBusyPlan(null);
    }
  }

  async function handleWithdraw(basket: InvestmentBasket) {
    setBusyBasket(basket);
    setError(null);
    try {
      const result = await api.withdrawInvestment(basket);
      toast.success(t("withdrawSuccess", { amount: formatUsd(result.withdrawnAmount) }));
      onSuccess();
      refreshBalances();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("genericError"));
    } finally {
      setBusyBasket(null);
    }
  }

  async function handleWalletTransfer(direction: "in" | "out", amount: string) {
    setBusyWallet(true);
    setError(null);
    try {
      const value = Number(amount).toFixed(6);
      if (direction === "in") {
        await api.transferToInvestmentWallet(value);
        toast.success(t("wallet.transferInSuccess"));
      } else {
        await api.transferFromInvestmentWallet(value);
        toast.success(t("wallet.transferOutSuccess"));
      }
      refreshBalances();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("genericError"));
    } finally {
      setBusyWallet(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <InvestmentWalletCard
        mainBalance={mainBalance}
        walletBalance={walletBalance}
        busy={busyWallet}
        onTransfer={handleWalletTransfer}
      />

      <div className="flex justify-end">
        <InvestmentAdvisorDialog
          rates={rates}
          plans={fixedTermPlans}
          availableBalance={walletBalance}
        />
      </div>

      <Tabs defaultValue="baskets">
        <TabsList>
          <TabsTrigger value="baskets">{t("tabs.baskets")}</TabsTrigger>
          <TabsTrigger value="fixedTerm">{t("tabs.fixedTerm")}</TabsTrigger>
          <TabsTrigger value="myPlacements">{t("tabs.myPlacements")}</TabsTrigger>
        </TabsList>

        <TabsContent value="baskets" className="pt-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {INVESTMENT_BASKETS.map((basket) => (
              <BasketCard
                key={basket}
                basket={basket}
                rate={rates?.[basket] ?? null}
                assets={assets?.[basket]?.assets ?? []}
                history={history?.[basket] ?? []}
                position={activePositions.get(basket) ?? null}
                availableBalance={walletBalance}
                busy={busyBasket === basket}
                onDeposit={handleDeposit}
                onWithdraw={handleWithdraw}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="fixedTerm" className="pt-4">
          <FixedTermPlansSection
            plans={fixedTermPlans}
            positions={fixedTermPositions}
            availableBalance={walletBalance}
            busyPlan={busyPlan}
            onDeposit={handleDepositFixedTerm}
          />
        </TabsContent>

        <TabsContent value="myPlacements" className="pt-4">
          <MyPlacementsSection
            basketPositions={activePositions}
            fixedTermPositions={fixedTermPositions}
            fixedTermPlans={fixedTermPlans}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
