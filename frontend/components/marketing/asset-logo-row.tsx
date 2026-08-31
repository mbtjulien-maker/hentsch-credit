"use client";

import { useEffect, useState } from "react";
import { api, type MarketOverviewEntry } from "@/lib/api";
import { CURRENCY_LABELS } from "@/lib/format";

// Rangée de logos pour une liste d'actifs — réutilisée à plusieurs endroits de la
// vitrine publique pour ne jamais lister des tickers en texte brut quand le vrai logo
// (CoinMarketCap, même source que MarketView) est disponible. Chaque usage fait son propre
// appel : /market/prices est public et mis en cache côté serveur (30s, cf.
// MarketDataService), le coût de plusieurs appels sur une même page est négligeable
// face à la simplicité de ne pas faire remonter l'état.
//
// Deux présentations : "chips" (puce logo + libellé par actif, pour une liste à
// parcourir — étapes, chiffres clés) et "bare" (cercles se chevauchant, sans libellé,
// pour un rappel visuel compact — hero, bandeau de preuve).
export function AssetLogoRow({
  currencies,
  variant = "chips",
  className = "",
}: {
  currencies: readonly string[];
  variant?: "chips" | "bare";
  className?: string;
}) {
  const [entries, setEntries] = useState<MarketOverviewEntry[] | null>(null);

  useEffect(() => {
    let ignore = false;
    api
      .getMarketPrices()
      .then((data) => {
        if (!ignore) setEntries(data);
      })
      .catch(() => {
        // Purement décoratif — un échec retombe sur le repli monogramme ci-dessous.
      });
    return () => {
      ignore = true;
    };
  }, []);

  function logoFor(currency: string) {
    const entry = entries?.find((e) => e.currency === currency);
    return entry?.image ? (
      // eslint-disable-next-line @next/next/no-img-element -- logo distant CoinMarketCap
      <img src={entry.image} alt="" className="size-full rounded-full object-cover" />
    ) : (
      <span className="flex size-full items-center justify-center rounded-full bg-slate-200 text-[8px] font-semibold text-muted-foreground/80">
        {currency.slice(0, 1)}
      </span>
    );
  }

  if (variant === "bare") {
    return (
      <div className={`flex items-center -space-x-2 ${className}`}>
        {currencies.map((currency) => (
          <span
            key={currency}
            className="size-7 shrink-0 overflow-hidden rounded-full border-2 border-white shadow-sm"
            title={CURRENCY_LABELS[currency] ?? currency}
          >
            {logoFor(currency)}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {currencies.map((currency) => (
        <span
          key={currency}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-2 py-1 text-xs font-medium text-foreground/80"
        >
          <span className="size-4 shrink-0 overflow-hidden rounded-full">{logoFor(currency)}</span>
          {CURRENCY_LABELS[currency] ?? currency}
        </span>
      ))}
    </div>
  );
}
