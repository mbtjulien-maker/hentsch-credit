"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type CreditRequest } from "@/lib/api";

// Liste des demandes de crédit d'un client — extrait de credit-form.tsx pour être
// partagé entre le formulaire (qui n'a besoin que de la demande active) et le panneau
// d'historique affiché en permanence sur la page crédit (qui a besoin de la liste
// complète). Une seule requête réseau, deux consommateurs.
export function useCreditRequests(userId: string) {
  const [requests, setRequests] = useState<CreditRequest[] | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    // userId arrive vide le temps que le compte sélectionné se charge côté appelant
    // (hook toujours appelé, même avant le "gate" de chargement, cf. règles des hooks
    // React) — on n'appelle l'API qu'une fois un vrai userId disponible, pour éviter un
    // GET /users//credit-requests (404) à chaque montage.
    if (!userId) return;
    let ignore = false;
    api
      .listCreditRequests(userId)
      .then((list) => {
        if (!ignore) setRequests(list);
      })
      .catch(() => {
        if (!ignore) setRequests([]);
      });
    return () => {
      ignore = true;
    };
  }, [userId, refreshIndex]);

  const refetch = useCallback(() => setRefreshIndex((n) => n + 1), []);

  // La plus récente demande, si elle est encore active (PENDING/APPROVED) — une fois
  // FULFILLED ou REJECTED, elle ne bloque plus une nouvelle demande.
  const active =
    requests && requests.length > 0 && (requests[0].status === "PENDING" || requests[0].status === "APPROVED")
      ? requests[0]
      : null;

  return { requests, active, loading: requests === null, refetch };
}
