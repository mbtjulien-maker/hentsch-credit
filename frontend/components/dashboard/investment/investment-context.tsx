"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import {
  api,
  ApiError,
  type FixedTermPlan,
  type FixedTermPlanId,
  type FixedTermPosition,
  type InvestmentAssets,
  type InvestmentBasket,
  type InvestmentHistory,
  type InvestmentPerformance,
  type InvestmentPosition,
  type InvestmentRates,
} from "@/lib/api";
import { formatUsd, fromDisplay } from "@/lib/format";

type WalletDirection = "in" | "out";

interface InvestmentContextValue {
  userId: string;
  // Catalogue (paniers, plans, composition, tendance) — lecture seule, indépendant du client.
  rates: InvestmentRates | null;
  assets: InvestmentAssets | null;
  history: InvestmentHistory | null;
  fixedTermPlans: FixedTermPlan[] | null;
  // Position du client.
  positions: InvestmentPosition[];
  fixedTermPositions: FixedTermPosition[];
  activePositions: Map<InvestmentBasket, InvestmentPosition>;
  performance: InvestmentPerformance | null;
  // Soldes : solde principal (source du virement interne) et wallet investissement
  // (débité/crédité par tous les placements, cf. §2H CLAUDE.md entrée #31).
  mainBalance: number | null;
  walletBalance: number | null;
  // Agrégats dérivés des positions ACTIVES (paniers + plans à échéance fixe).
  investedCapital: number;
  accruedYield: number;
  portfolioValue: number;
  loaded: boolean;
  // Actions.
  busyBasket: InvestmentBasket | null;
  busyPlan: FixedTermPlanId | null;
  busyWallet: boolean;
  error: string | null;
  dismissError: () => void;
  refresh: () => void;
  deposit: (basket: InvestmentBasket, amount: string) => Promise<void>;
  depositFixedTerm: (plan: FixedTermPlanId, amount: string) => Promise<void>;
  withdraw: (basket: InvestmentBasket) => Promise<void>;
  transfer: (direction: WalletDirection, amount: string) => Promise<void>;
}

const InvestmentContext = createContext<InvestmentContextValue | null>(null);

// Charge UNE fois, pour toutes les sous-pages de l'espace Investissement (vue d'ensemble,
// approvisionnement, produits, placements, journal), ce qui était auparavant embarqué
// dans un unique panneau à onglets (ancien InvestmentPanel) : les sous-pages ne
// re-téléchargent donc rien en naviguant de l'une à l'autre, et toutes voient les mêmes
// soldes. Chaque appel reste purement informatif en cas d'échec (jamais bloquant pour les
// autres) — même discipline que l'ancien panneau.
export function InvestmentProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("Dashboard.investment");
  const { selectedUserId, refreshToken, triggerRefresh } = useDashboard();

  const [rates, setRates] = useState<InvestmentRates | null>(null);
  const [assets, setAssets] = useState<InvestmentAssets | null>(null);
  const [history, setHistory] = useState<InvestmentHistory | null>(null);
  const [fixedTermPlans, setFixedTermPlans] = useState<FixedTermPlan[] | null>(null);
  const [positions, setPositions] = useState<InvestmentPosition[] | null>(null);
  const [fixedTermPositions, setFixedTermPositions] = useState<FixedTermPosition[]>([]);
  const [performance, setPerformance] = useState<InvestmentPerformance | null>(null);
  const [mainBalance, setMainBalance] = useState<number | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [busyBasket, setBusyBasket] = useState<InvestmentBasket | null>(null);
  const [busyPlan, setBusyPlan] = useState<FixedTermPlanId | null>(null);
  const [busyWallet, setBusyWallet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Incrémenté après chaque mutation locale pour relire positions/soldes/performance.
  const [localRefresh, setLocalRefresh] = useState(0);

  const refresh = useCallback(() => setLocalRefresh((n) => n + 1), []);

  // Catalogue — une seule fois par session de l'espace (les taux du jour ne changent pas
  // pendant la navigation entre sous-pages).
  useEffect(() => {
    let ignore = false;
    api.getInvestmentRates().then((r) => !ignore && setRates(r)).catch(() => {});
    api.getInvestmentAssets().then((a) => !ignore && setAssets(a)).catch(() => {});
    api.getInvestmentHistory().then((h) => !ignore && setHistory(h)).catch(() => {});
    api.getFixedTermPlans().then((p) => !ignore && setFixedTermPlans(p)).catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  // Données du client — rechargées à chaque mutation (locale ou d'une autre page du
  // dashboard, cf. refreshToken).
  useEffect(() => {
    if (!selectedUserId) return;
    let ignore = false;
    api
      .listInvestmentPositions(selectedUserId)
      .then((p) => !ignore && setPositions(p))
      .catch(() => !ignore && setPositions((prev) => prev ?? []));
    api
      .listFixedTermPositions(selectedUserId)
      .then((p) => !ignore && setFixedTermPositions(p))
      .catch(() => {});
    api
      .getInvestmentPerformance(selectedUserId)
      .then((p) => !ignore && setPerformance(p))
      .catch(() => {});
    api
      .getBalance(selectedUserId)
      .then((b) => {
        if (ignore) return;
        setMainBalance(Number(b.balance.availableBalance));
        setWalletBalance(Number(b.balance.investmentBalance));
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [selectedUserId, refreshToken, localRefresh]);

  const activePositions = useMemo(
    () => new Map((positions ?? []).filter((p) => p.status === "ACTIVE").map((p) => [p.basket, p])),
    [positions],
  );

  const { investedCapital, accruedYield } = useMemo(() => {
    let principal = 0;
    let yieldTotal = 0;
    for (const p of activePositions.values()) {
      principal += Number(p.principalAmount);
      yieldTotal += Number(p.accruedYield);
    }
    for (const p of fixedTermPositions) {
      if (p.status !== "ACTIVE") continue;
      principal += Number(p.principalAmount);
      yieldTotal += Number(p.accruedYield);
    }
    return { investedCapital: principal, accruedYield: yieldTotal };
  }, [activePositions, fixedTermPositions]);

  const describe = useCallback(
    (err: unknown) => (err instanceof ApiError ? err.message : t("genericError")),
    [t],
  );

  const deposit = useCallback(
    async (basket: InvestmentBasket, amount: string) => {
      setBusyBasket(basket);
      setError(null);
      try {
        await api.depositInvestment(basket, fromDisplay(Number(amount)).toFixed(6));
        toast.success(t("depositSuccess"));
        refresh();
        triggerRefresh();
      } catch (err) {
        setError(describe(err));
      } finally {
        setBusyBasket(null);
      }
    },
    [t, refresh, triggerRefresh, describe],
  );

  const depositFixedTerm = useCallback(
    async (plan: FixedTermPlanId, amount: string) => {
      setBusyPlan(plan);
      setError(null);
      try {
        await api.depositFixedTerm(plan, fromDisplay(Number(amount)).toFixed(6));
        toast.success(t("fixedTermPlans.depositSuccess"));
        refresh();
        triggerRefresh();
      } catch (err) {
        setError(describe(err));
      } finally {
        setBusyPlan(null);
      }
    },
    [t, refresh, triggerRefresh, describe],
  );

  const withdraw = useCallback(
    async (basket: InvestmentBasket) => {
      setBusyBasket(basket);
      setError(null);
      try {
        const result = await api.withdrawInvestment(basket);
        toast.success(t("withdrawSuccess", { amount: formatUsd(result.withdrawnAmount) }));
        refresh();
        triggerRefresh();
      } catch (err) {
        setError(describe(err));
      } finally {
        setBusyBasket(null);
      }
    },
    [t, refresh, triggerRefresh, describe],
  );

  const transfer = useCallback(
    async (direction: WalletDirection, amount: string) => {
      setBusyWallet(true);
      setError(null);
      try {
        const value = fromDisplay(Number(amount)).toFixed(6);
        if (direction === "in") {
          await api.transferToInvestmentWallet(value);
          toast.success(t("wallet.transferInSuccess"));
        } else {
          await api.transferFromInvestmentWallet(value);
          toast.success(t("wallet.transferOutSuccess"));
        }
        refresh();
        triggerRefresh();
      } catch (err) {
        setError(describe(err));
      } finally {
        setBusyWallet(false);
      }
    },
    [t, refresh, triggerRefresh, describe],
  );

  const value: InvestmentContextValue | null = selectedUserId
    ? {
        userId: selectedUserId,
        rates,
        assets,
        history,
        fixedTermPlans,
        positions: positions ?? [],
        fixedTermPositions,
        activePositions,
        performance,
        mainBalance,
        walletBalance,
        investedCapital,
        accruedYield,
        portfolioValue: investedCapital + accruedYield,
        loaded: positions !== null,
        busyBasket,
        busyPlan,
        busyWallet,
        error,
        dismissError: () => setError(null),
        refresh,
        deposit,
        depositFixedTerm,
        withdraw,
        transfer,
      }
    : null;

  return <InvestmentContext.Provider value={value}>{value ? children : null}</InvestmentContext.Provider>;
}

export function useInvestment(): InvestmentContextValue {
  const ctx = useContext(InvestmentContext);
  if (!ctx) throw new Error("useInvestment doit être utilisé sous <InvestmentProvider>");
  return ctx;
}
