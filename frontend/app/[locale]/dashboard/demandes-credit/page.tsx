"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Clock, ShieldAlert, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { api, ApiError, type CreditRequest } from "@/lib/api";
import { formatDate, formatUsd } from "@/lib/format";

// File de validation back-office — réservée aux comptes ADMIN, appliqué côté API
// (AdminGuard, cf. backend/src/common/guards/admin.guard.ts) ET ici en défense en
// profondeur : un client normal qui arriverait sur cette route par l'URL directe (le lien
// de navigation lui est déjà masqué, cf. sidebar.tsx) voit un message d'accès refusé
// plutôt qu'une file qu'il ne pourrait de toute façon pas faire fonctionner (l'API
// rejetterait ses appels avec 403).
export default function CreditRequestsQueuePage() {
  const { triggerRefresh, selectedUser, authLoading } = useDashboard();
  const [requests, setRequests] = useState<CreditRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const isAdmin = selectedUser?.role === "ADMIN";

  const refetch = useCallback(async () => {
    try {
      setRequests(await api.listPendingCreditRequests());
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    let ignore = false;
    api
      .listPendingCreditRequests()
      .then((list) => {
        if (!ignore) {
          setRequests(list);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
        }
      });
    return () => {
      ignore = true;
    };
  }, [isAdmin]);

  async function handleDecision(id: string, action: "approve" | "reject") {
    setActingOn(id);
    try {
      if (action === "approve") {
        await api.approveCreditRequest(id);
      } else {
        await api.rejectCreditRequest(id);
      }
      await refetch();
      triggerRefresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setActingOn(null);
    }
  }

  if (authLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <ShieldAlert className="size-8 text-muted-foreground" />
          <p className="font-medium">Accès réservé au back-office</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Cette section est réservée aux comptes ayant le rôle ADMIN. Le compte
            actuellement sélectionné ({selectedUser?.email ?? "aucun"}) n&apos;y a pas accès.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Demandes de crédit</CardTitle>
        <CardDescription>
          Validez ou rejetez les demandes en attente. Une fois approuvée, le client
          obtient une adresse de dépôt dédiée ; le crédit est émis automatiquement dès
          réception du dépôt.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!requests && !error && (
          <div className="flex flex-col gap-2">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        )}

        {requests?.length === 0 && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="size-4" />
            Aucune demande en attente.
          </p>
        )}

        {requests?.map((request) => (
          <div
            key={request.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3"
          >
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-xs text-muted-foreground">
                {request.userId}
              </span>
              <span className="text-sm font-medium tabular-nums">
                {formatUsd(request.collateralAmount)} ({request.currency})
              </span>
              <span className="text-xs text-muted-foreground">
                Soumise le {formatDate(request.createdAt)}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={actingOn === request.id}
                onClick={() => handleDecision(request.id, "reject")}
              >
                <X className="size-4" />
                Rejeter
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={actingOn === request.id}
                onClick={() => handleDecision(request.id, "approve")}
              >
                <Check className="size-4" />
                Valider
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
