"use client";

import { useEffect, useState } from "react";
import { Play, RefreshCw } from "lucide-react";
import { AdminCard, AdminCardHeader, AdminDivider, AdminField, AdminMetric } from "@/components/admin/admin-ui";
import { PerformanceChart } from "@/components/marketing/performance-chart";
import { api, ApiError, type TreasuryBotRun } from "@/lib/api";
import { cn } from "@/lib/utils";

const percentFormatter = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "always",
});

const usdFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatPct(value: string): string {
  return percentFormatter.format(Number(value) / 100);
}

function formatUsd(value: string): string {
  return usdFormatter.format(Number(value));
}

const PILLARS = [
  { key: "pillarAReturnPct", label: "Pilier A : Cash & Carry" },
  { key: "pillarBReturnPct", label: "Pilier B : Prêt triangulaire" },
  { key: "pillarCReturnPct", label: "Pilier C : Apport de liquidité" },
] as const;

// Panneau back-office du bot de trésorerie — SIMULATION UNIQUEMENT (paper trading) :
// aucun ordre n'est jamais passé, aucun fonds ne bouge, aucune connexion à un exchange ou
// wallet réel (cf. TreasuryBotService). Le rendement simulé est calculé à partir de
// vraies données de marché (panier de métaux industriels tokenisés), mais reste un calcul
// de démonstration, sans effet sur le ledger ou tout compte client — d'où le bandeau
// d'avertissement répété plutôt qu'une simple mention en petit texte.
export function TreasuryBotPanel() {
  const [history, setHistory] = useState<TreasuryBotRun[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"run" | "backfill" | null>(null);

  function loadHistory() {
    api
      .getTreasuryBotHistory(180)
      .then(setHistory)
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Historique du bot indisponible.");
      });
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function handleRun() {
    setBusy("run");
    setError(null);
    try {
      await api.runTreasuryBotNow();
      loadHistory();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Échec de la simulation.");
    } finally {
      setBusy(null);
    }
  }

  async function handleBackfill() {
    setBusy("backfill");
    setError(null);
    try {
      await api.backfillTreasuryBotHistory(90);
      loadHistory();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Échec de la reconstitution d'historique.");
    } finally {
      setBusy(null);
    }
  }

  const latest = history && history.length > 0 ? history[history.length - 1] : null;
  const chartPoints = (history ?? []).map((run) => ({
    t: new Date(run.runDate).getTime(),
    usd: Number(run.cumulativeNavUsd),
  }));

  return (
    <AdminCard>
      <AdminCardHeader
        title="Bot de trésorerie (simulation)"
        description="Paper trading sur les 3 piliers de la feuille de route RWA, calculé à partir de vraies données de marché."
      />

      <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2.5 text-xs text-primary">
        <span className="mt-0.5">⚠</span>
        <span>
          Simulation uniquement (paper trading) : aucun ordre n&apos;est passé, aucun fonds réel ne bouge, aucune
          connexion à un exchange ou wallet réel. Le rendement dérive de vraies données de marché, mais reste un
          calcul de démonstration.
        </span>
      </div>

      {error && <p className="mb-3 text-xs text-red-400">{error}</p>}

      {!history && !error && <p className="text-xs text-muted-foreground">Chargement…</p>}

      {history && history.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-foreground/[0.1] py-8 text-center">
          <p className="text-sm text-muted-foreground">Aucune simulation enregistrée pour l&apos;instant.</p>
          <button
            type="button"
            onClick={handleBackfill}
            disabled={busy !== null}
            className="flex items-center gap-1.5 rounded-lg bg-foreground/[0.08] px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-foreground/[0.12] disabled:opacity-50"
          >
            <RefreshCw className={cn("size-3.5", busy === "backfill" && "animate-spin")} />
            Reconstituer un historique (90 jours, données réelles)
          </button>
        </div>
      )}

      {history && history.length > 0 && latest && (
        <>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            <AdminMetric label="Capital simulé" value={formatUsd(latest.cumulativeNavUsd)} />
            <AdminMetric
              label="PnL du dernier jour"
              value={formatUsd(latest.dailyPnlUsd)}
              accent={Number(latest.dailyPnlUsd) >= 0 ? "text-chart-3" : "text-destructive"}
            />
            <AdminMetric
              label="Rendement moyen (jour)"
              value={formatPct(latest.blendedReturnPct)}
              accent={Number(latest.blendedReturnPct) >= 0 ? "text-chart-3" : "text-destructive"}
            />
            <AdminMetric label="Signal de marché" value={formatPct(latest.marketSignalPct)} />
          </div>

          <div className="mt-4 rounded-lg border border-foreground/[0.07] bg-foreground/[0.02] p-3">
            <PerformanceChart points={chartPoints} height={90} />
          </div>

          <AdminDivider className="my-4" />

          <div className="grid gap-3 sm:grid-cols-3">
            {PILLARS.map((p) => (
              <AdminField key={p.key} label={p.label} value={formatPct(latest[p.key])} mono />
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRun}
              disabled={busy !== null}
              className="flex items-center gap-1.5 rounded-lg bg-foreground/[0.08] px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-foreground/[0.12] disabled:opacity-50"
            >
              <Play className={cn("size-3.5", busy === "run" && "animate-pulse")} />
              Lancer une simulation aujourd&apos;hui
            </button>
            <button
              type="button"
              onClick={handleBackfill}
              disabled={busy !== null}
              className="flex items-center gap-1.5 rounded-lg border border-foreground/[0.08] px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw className={cn("size-3.5", busy === "backfill" && "animate-spin")} />
              Compléter l&apos;historique
            </button>
          </div>
        </>
      )}
    </AdminCard>
  );
}
