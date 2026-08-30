"use client";

import { useEffect, useState } from "react";
import { api, type CreditRatesResponse } from "@/lib/api";

// Taux de crédit courants (intérêt/origination/garde par devise + cours EUR/USD) —
// extrait de credit-form.tsx pour être partagé entre le formulaire de demande et le
// panneau d'information "Taux actuels" affiché en permanence sur la page crédit.
export function useCreditRates() {
  const [rates, setRates] = useState<CreditRatesResponse | null>(null);
  useEffect(() => {
    let ignore = false;
    api
      .getCreditRates()
      .then((r) => {
        if (!ignore) setRates(r);
      })
      .catch(() => {
        // Informatif seulement : le reste de la page reste utilisable sans les taux.
      });
    return () => {
      ignore = true;
    };
  }, []);
  return rates;
}
