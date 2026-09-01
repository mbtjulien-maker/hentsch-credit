"use client";

import { useEffect, useState } from "react";
import { api, type AcceptedCurrency } from "@/lib/api";

// Performance réelle sur 12 mois d'UN actif éligible au rendement — cf. AssetHistoryEntry
// côté backend. `changePct` est `null` quand l'historique n'a pas pu être récupéré
// (panne CoinMarketCap sur cet actif précis) : jamais confondu avec un rendement nul.
export interface AssetYieldEstimate {
  currency: AcceptedCurrency;
  changePct: number | null;
}

export interface EstimatedYield {
  // Les 8 actifs éligibles (cf. YIELD_ELIGIBLE_CURRENCIES côté backend), chacun avec sa
  // propre performance — jamais une moyenne opaque qui mélangerait or, argent, ETH et
  // métaux industriels comme s'ils avaient la même volatilité.
  perAsset: AssetYieldEstimate[];
  // Repli utilisé tant qu'aucun actif de gage précis n'est choisi dans le simulateur :
  // moyenne simple des actifs dont la performance est disponible (jamais les null).
  // Un vrai calcul, pas un chiffre inventé — mais explicitement un REPLI, pas la valeur
  // recommandée : dès qu'un actif est choisi, resolveEstimatedYield ci-dessous préfère
  // toujours sa performance propre.
  blendedPct: number | null;
}

const EMPTY: EstimatedYield = { perAsset: [], blendedPct: null };

// Rendement annuel par défaut proposé dans les simulateurs (RepaymentProjection,
// InstallmentSchedule) — calculé automatiquement à partir de la VRAIE performance sur 12
// mois des actifs générateurs de rendement (même source que /rendement, cf.
// MarketDataService.getYieldAssetHistory côté backend), jamais un chiffre inventé.
// Couvre désormais les 8 actifs réellement éligibles (métaux précieux, ETH, métaux
// industriels — cf. YIELD_ELIGIBLE_CURRENCIES), pas seulement les 4 mis en avant sur la
// vitrine "/rendement" (bug corrigé : le simulateur de crédit réutilisait auparavant cet
// endpoint restreint, ignorant silencieusement XPT/XPD/XCU/WTI dans toute estimation).
export function useEstimatedYield(): EstimatedYield {
  const [estimate, setEstimate] = useState<EstimatedYield>(EMPTY);

  useEffect(() => {
    let ignore = false;
    api
      .getYieldHistoryFull()
      .then((entries) => {
        if (ignore) return;
        const perAsset = entries.map((e) => ({ currency: e.currency, changePct: e.changePct }));
        const available = perAsset
          .map((e) => e.changePct)
          .filter((v): v is number => v !== null);
        setEstimate({
          perAsset,
          blendedPct:
            available.length > 0
              ? available.reduce((sum, v) => sum + v, 0) / available.length
              : null,
        });
      })
      .catch(() => {
        // Informatif seulement : les simulateurs restent utilisables (repli sur 0),
        // le client peut toujours saisir sa propre hypothèse.
      });
    return () => {
      ignore = true;
    };
  }, []);

  return estimate;
}

// Résout le taux à utiliser pour la simulation : la performance réelle de l'actif de gage
// choisi si elle est connue, sinon le repli moyen (cf. blendedPct ci-dessus). Centralisé
// ici plutôt que dupliqué dans chaque simulateur — un seul endroit décide de la priorité
// "actif précis > moyenne".
export function resolveEstimatedYield(
  estimate: EstimatedYield,
  currency: AcceptedCurrency | null,
): number | null {
  if (currency) {
    const found = estimate.perAsset.find((e) => e.currency === currency);
    if (found && found.changePct !== null) return found.changePct;
  }
  return estimate.blendedPct;
}
