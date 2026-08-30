"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

// Rendement annuel par défaut proposé dans les simulateurs (RepaymentProjection,
// InstallmentSchedule) — calculé automatiquement à partir de la VRAIE performance sur 12
// mois des actifs générateurs de rendement (même source que /rendement, cf.
// MarketDataService.getYieldAssetHistory côté backend), pas un chiffre inventé ni un champ
// laissé à zéro que le client devrait deviner lui-même. Reste modifiable dans chaque
// simulateur : ce n'est qu'un point de départ réaliste, pas une garantie (l'actif de gage
// précis n'est choisi qu'au moment du dépôt, après la demande, cf. credit-form.tsx).
export function useEstimatedYield(): number | null {
  const [estimatedYieldPct, setEstimatedYieldPct] = useState<number | null>(null);

  useEffect(() => {
    let ignore = false;
    api
      .getYieldHistory()
      .then((entries) => {
        if (ignore) return;
        const changes = entries
          .map((e) => e.changePct)
          .filter((v): v is number => v !== null);
        if (changes.length > 0) {
          setEstimatedYieldPct(changes.reduce((sum, v) => sum + v, 0) / changes.length);
        }
      })
      .catch(() => {
        // Informatif seulement : les simulateurs restent utilisables (repli sur 0),
        // le client peut toujours saisir sa propre hypothèse.
      });
    return () => {
      ignore = true;
    };
  }, []);

  return estimatedYieldPct;
}
