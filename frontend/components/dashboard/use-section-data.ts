"use client";

import { useEffect, useState } from "react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { ApiError } from "@/lib/api";

function describeError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Une erreur inattendue est survenue.";
}

// Charge une donnée propre à l'utilisateur sélectionné pour la page courante — chaque
// route ne récupère que ce dont elle a besoin (pas de fetch global façon single-page).
// Recharge automatiquement au changement de compte ou après une mutation (refreshToken).
export function useSectionData<T>(fetchFn: (userId: string) => Promise<T>) {
  const { selectedUserId, refreshToken } = useDashboard();
  const [data, setData] = useState<T | null>(null);
  const [dataUserId, setDataUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedUserId) return;
    let ignore = false;

    fetchFn(selectedUserId)
      .then((result) => {
        if (ignore) return;
        setData(result);
        setDataUserId(selectedUserId);
        setError(null);
      })
      .catch((err) => {
        if (!ignore) setError(describeError(err));
      });

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchFn is expected to be a stable reference per call site (an api.* method)
  }, [selectedUserId, refreshToken]);

  return {
    data,
    loading: !data || selectedUserId !== dataUserId,
    error,
    selectedUserId,
  };
}
