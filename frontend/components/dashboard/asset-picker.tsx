"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { api, type MarketOverviewEntry } from "@/lib/api";
import { CHAIN_LABELS, CURRENCY_CHAINS, CURRENCY_GROUPS, CURRENCY_LABELS, EVM_CHAINS } from "@/lib/format";
import { cn } from "@/lib/utils";

// Sélection actif + réseau, dans cet ordre : l'actif choisi détermine les réseaux
// disponibles (cf. CURRENCY_CHAINS), jamais l'inverse. Changer d'actif recadre
// automatiquement le réseau sélectionné sur la première option valide pour ce nouvel
// actif — évite de se retrouver avec une combinaison actif/réseau invalide en mémoire.
export function useAssetSelection(initialCurrency: string = "DAI") {
  const [currency, setCurrencyState] = useState(initialCurrency);
  const [chain, setChain] = useState<string>(CURRENCY_CHAINS[initialCurrency]?.[0] ?? "ETHEREUM");

  function setCurrency(next: string) {
    setCurrencyState(next);
    const validChains: readonly string[] = CURRENCY_CHAINS[next] ?? EVM_CHAINS;
    setChain((current) => (validChains.includes(current) ? current : validChains[0]));
  }

  return { currency, chain, setCurrency, setChain };
}

function EthereumIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="12" fill="#627EEA" />
      <path d="M12 3.5 6.5 12.2 12 15.1l5.5-2.9L12 3.5Z" fill="#C6CEF7" />
      <path d="M12 3.5 6.5 12.2 12 15.1V3.5Z" fill="#FFFFFF" />
      <path d="M12 16.4 6.5 13.3 12 20.5l5.5-7.2-5.5 3.1Z" fill="#C6CEF7" />
      <path d="M12 16.4 6.5 13.3 12 20.5V16.4Z" fill="#FFFFFF" />
    </svg>
  );
}

function PolygonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="12" fill="#8247E5" />
      <path
        d="M15.4 9.3a1 1 0 0 0-1 0l-1.9 1.1v-1.1a1 1 0 0 0-.5-.9L9.9 7.3a1 1 0 0 0-1 0L6.8 8.4a1 1 0 0 0-.5.9v2.2a1 1 0 0 0 .5.9l2.1 1.1a1 1 0 0 0 1 0l1.9-1.1v1.1a1 1 0 0 0 .5.9l2.1 1.1a1 1 0 0 0 1 0l2.1-1.1a1 1 0 0 0 .5-.9v-2.2a1 1 0 0 0-.5-.9l-2.1-1.1Z"
        fill="#fff"
      />
    </svg>
  );
}

function ArbitrumIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="12" fill="#2D374B" />
      <path d="M8.5 15.5 12 6.5l3.5 9" stroke="#28A0F0" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 16.5 12 17.8l5.5-1.3" stroke="#96BEDC" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChainIcon({ chain, className = "size-5 shrink-0" }: { chain: string; className?: string }) {
  if (chain === "POLYGON") return <PolygonIcon className={className} />;
  if (chain === "ARBITRUM") return <ArbitrumIcon className={className} />;
  return <EthereumIcon className={className} />;
}

function AssetLogo({ currency, src }: { currency: string; src?: string }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- logo distant CoinGecko, pas un asset local Next/Image
      <img src={src} alt="" className="size-6 shrink-0 rounded-full" />
    );
  }
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
      {currency.slice(0, 2)}
    </span>
  );
}

// Logos réels des actifs — même source que la vue Marché (cf. market-view.tsx) : le
// champ `image` de MarketOverviewEntry (CoinGecko), pour ne jamais afficher un logo
// approximatif quand la vraie image est disponible. Un échec réseau retombe
// silencieusement sur le repli monogramme (AssetLogo) : purement décoratif, jamais
// bloquant pour choisir un actif.
function useAssetLogos(): Record<string, string> {
  const [logos, setLogos] = useState<Record<string, string>>({});

  useEffect(() => {
    let ignore = false;
    api
      .getMarketPrices()
      .then((entries: MarketOverviewEntry[]) => {
        if (ignore) return;
        const map: Record<string, string> = {};
        for (const entry of entries) {
          if (entry.currency && entry.image) map[entry.currency] = entry.image;
        }
        setLogos(map);
      })
      .catch(() => {
        // silencieux — cf. commentaire ci-dessus
      });
    return () => {
      ignore = true;
    };
  }, []);

  return logos;
}

// Sélecteur d'actif — liste groupée par logique de valorisation (cf. CURRENCY_GROUPS),
// avec le vrai logo de chaque actif. Remplace un <select> par des lignes cliquables :
// c'est le premier choix du flux de dépôt/retrait, celui qui détermine les réseaux
// ensuite proposés (cf. ChainList).
export function AssetList({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const logos = useAssetLogos();

  return (
    <div className="flex max-h-64 flex-col gap-3 overflow-y-auto pr-1">
      {CURRENCY_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-1.5 px-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {group.label}
          </p>
          <div className="flex flex-col gap-1">
            {group.currencies.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onChange(c)}
                aria-pressed={value === c}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  value === c ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/50",
                )}
              >
                <AssetLogo currency={c} src={logos[c]} />
                <span className="flex-1 font-medium">{CURRENCY_LABELS[c]}</span>
                {value === c && <Check className="size-4 shrink-0 text-primary" />}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Sélecteur de réseau — recadré sur l'actif choisi (cf. CURRENCY_CHAINS). Un seul réseau
// disponible s'affiche en lecture seule plutôt que comme un choix factice à un élément.
export function ChainList({
  currency,
  value,
  onChange,
}: {
  currency: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const chains = CURRENCY_CHAINS[currency] ?? EVM_CHAINS;

  if (chains.length <= 1) {
    const only = chains[0] ?? "ETHEREUM";
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
        <ChainIcon chain={only} />
        <span className="flex-1 font-medium">{CHAIN_LABELS[only]}</span>
        <span className="text-xs text-muted-foreground">Seul réseau disponible pour cet actif</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {chains.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-pressed={value === c}
          className={cn(
            "flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
            value === c ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/50",
          )}
        >
          <ChainIcon chain={c} />
          <span className="flex-1 font-medium">{CHAIN_LABELS[c]}</span>
          {value === c && <Check className="size-4 shrink-0 text-primary" />}
        </button>
      ))}
    </div>
  );
}
