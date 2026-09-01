"use client";

import { useEffect, useState } from "react";
import { Layers, ShieldCheck, Sparkles, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { api, ApiError, type MarketOverviewEntry } from "@/lib/api";
import { formatPercent, formatPrice } from "@/lib/format";

// Actifs générateurs de rendement (cf. YIELD_ELIGIBLE_CURRENCIES côté backend) — ordre
// d'affichage fixe (métaux d'abord, ETH ensuite), indépendant de l'ordre renvoyé par
// l'API. Si le backend ajoute un nouvel actif éligible sans mise à jour ici, il
// n'apparaît simplement pas dans cette vitrine (dégradation silencieuse acceptable pour
// une section marketing, cf. filter ci-dessous).
const YIELD_CURRENCIES = ["XAUT", "PAXG", "KAG", "ETH"] as const;

// Récupère et filtre les actifs générateurs de rendement — partagé par YieldAssetGrid
// (vitrine compacte, colonne hero) et par toute future consommation de ces cours.
function useYieldAssets() {
  const t = useTranslations("YieldShowcase");
  const [entries, setEntries] = useState<MarketOverviewEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    api
      .getMarketPrices()
      .then((data) => {
        if (!ignore) setEntries(data);
      })
      .catch((err: unknown) => {
        if (!ignore) setError(err instanceof ApiError ? err.message : t("pricesUnavailable"));
      });
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t est stable pour la durée du composant
  }, []);

  const yieldEntries = YIELD_CURRENCIES.map((currency) =>
    entries?.find((e) => e.currency === currency),
  ).filter((e): e is MarketOverviewEntry => e !== undefined);

  return { entries, yieldEntries, error };
}

function AssetYieldCard({ entry, compact = false }: { entry: MarketOverviewEntry; compact?: boolean }) {
  const t = useTranslations("YieldShowcase");
  const isUp = (entry.change24hPct ?? 0) >= 0;
  return (
    <div
      className={`flex flex-col gap-2.5 rounded-2xl border border-amber-200/70 bg-white shadow-sm transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-lg ${
        compact ? "p-3.5" : "gap-3 p-5"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {entry.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo distant CoinGecko
            <img src={entry.image} alt="" className={compact ? "size-6 shrink-0 rounded-full" : "size-8 shrink-0 rounded-full"} />
          ) : (
            <div className={compact ? "size-6 shrink-0 rounded-full bg-muted" : "size-8 shrink-0 rounded-full bg-muted"} />
          )}
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">{entry.symbol}</div>
            {!compact && <div className="truncate text-xs text-slate-500">{entry.name}</div>}
          </div>
        </div>
        {!compact && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-medium text-amber-800">
            <Sparkles className="size-2.5" />
            {t("yieldBadge")}
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-2">
        <div>
          <div className={`font-semibold tabular-nums text-slate-900 ${compact ? "text-sm" : "text-lg"}`}>
            {entry.usdPrice ? formatPrice(entry.usdPrice) : "—"}
          </div>
          {entry.change24hPct !== null && (
            <div
              className={`flex items-center gap-1 text-xs font-medium tabular-nums ${
                isUp ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {isUp ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {formatPercent(entry.change24hPct)}
              {!compact && <span className="font-normal text-slate-400">{t("h24")}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Panneau compact "actifs générateurs de rendement" — pensé pour vivre à côté du hero
// (colonne droite, cf. app/[locale]/page.tsx), pas en pleine largeur : titre resserré,
// grille 2x2, cartes allégées (pas de sparkline ni de nom complet). Le détail du
// mécanisme et la mention des stablecoins vivent dans YieldMechanismStrip, juste en
// dessous du hero. Toujours en thème clair fixe (bg-white, text-slate-900…), quel que
// soit le thème choisi par le visiteur — identité visuelle volontairement invariante,
// cf. leçon du sed de conversion de thème plus tôt dans le projet.
export function YieldAssetGrid() {
  const t = useTranslations("YieldShowcase");
  const { entries, yieldEntries, error } = useYieldAssets();

  return (
    <div className="flex h-full flex-col rounded-3xl bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-white p-6 shadow-[0_8px_30px_-12px_rgba(217,119,6,0.25)] sm:p-7">
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-medium text-amber-800">
        <Sparkles className="size-3.5" />
        {t("badge")}
      </span>
      <h2 className="mt-3 text-xl font-semibold text-slate-900 sm:text-2xl">{t("title")}</h2>
      <p className="mt-2 text-sm text-slate-600">{t("subtitle")}</p>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {!error && !entries && (
        <div className="mt-5 grid grid-cols-2 gap-3">
          {YIELD_CURRENCIES.map((currency) => (
            <div key={currency} className="h-[84px] animate-pulse rounded-2xl border border-amber-200/50 bg-white/60" />
          ))}
        </div>
      )}

      {!error && entries && (
        <div className="mt-5 grid grid-cols-2 gap-3">
          {yieldEntries.map((entry) => (
            <AssetYieldCard key={entry.id} entry={entry} compact />
          ))}
        </div>
      )}
    </div>
  );
}

// Bandeau "comment ça marche" du rendement + rappel honnête sur les stablecoins — pleine
// largeur, placé juste sous la rangée hero/YieldAssetGrid (cf. app/[locale]/page.tsx).
// Séparé de YieldAssetGrid pour que la partie "preuve visuelle" (logos + cours) reste
// compacte à côté du hero, sans sacrifier l'explication détaillée du mécanisme.
export function YieldMechanismStrip() {
  const t = useTranslations("YieldShowcase");

  const MECHANISM_STEPS = [
    { icon: Layers, title: t("steps.deposit.title"), description: t("steps.deposit.description") },
    { icon: TrendingUp, title: t("steps.appreciation.title"), description: t("steps.appreciation.description") },
    { icon: ShieldCheck, title: t("steps.repaid.title"), description: t("steps.repaid.description") },
  ] as const;

  return (
    <section className="bg-gradient-to-b from-amber-50/60 to-transparent py-12">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="grid gap-5 rounded-2xl bg-white/70 p-5 sm:grid-cols-3 sm:gap-5 sm:p-6">
          {MECHANISM_STEPS.map((step) => (
            <div key={step.title} className="flex items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <step.icon className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-0.5 text-xs leading-snug text-slate-600">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
          <Wallet className="size-3.5" />
          {t("stablecoinsReminder")}
        </div>
      </div>
    </section>
  );
}
