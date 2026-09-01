"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Clock, Copy, ShieldAlert, Users, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import {
  api,
  ApiError,
  type AccountOpeningRequest,
  type ApproveAccountRequestResult,
  type ClientAccountCapacity,
} from "@/lib/api";
import { formatDate } from "@/lib/format";

// File de validation des demandes d'ouverture de compte — réservée aux comptes ADMIN,
// appliqué côté API (AdminGuard) ET ici en défense en profondeur (même principe que
// /dashboard/demandes-credit). La validation crée réellement le compte (User) et génère
// un mot de passe temporaire affiché une seule fois : c'est à l'admin de le communiquer
// au client par un canal sécurisé (aucun service d'e-mail branché à ce stade).
export default function AccountRequestsQueuePage() {
  const { selectedUser, authLoading } = useDashboard();
  const [requests, setRequests] = useState<AccountOpeningRequest[] | null>(null);
  const [capacity, setCapacity] = useState<ClientAccountCapacity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [justApproved, setJustApproved] = useState<ApproveAccountRequestResult | null>(null);
  const [copied, setCopied] = useState(false);

  const isAdmin = selectedUser?.role === "ADMIN";

  const refetch = useCallback(async () => {
    try {
      const [list, cap] = await Promise.all([
        api.listPendingAccountRequests(),
        api.getAccountCapacity(),
      ]);
      setRequests(list);
      setCapacity(cap);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    let ignore = false;
    Promise.all([api.listPendingAccountRequests(), api.getAccountCapacity()])
      .then(([list, cap]) => {
        if (!ignore) {
          setRequests(list);
          setCapacity(cap);
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

  async function handleApprove(id: string) {
    setActingOn(id);
    setJustApproved(null);
    try {
      const result = await api.approveAccountRequest(id);
      setJustApproved(result);
      await refetch();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setActingOn(null);
    }
  }

  async function handleReject(id: string) {
    setActingOn(id);
    try {
      await api.rejectAccountRequest(id);
      await refetch();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setActingOn(null);
    }
  }

  function handleCopyPassword() {
    if (!justApproved) return;
    navigator.clipboard.writeText(justApproved.temporaryPassword).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
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
    <div className="flex flex-col gap-4">
      {justApproved && (
        <Alert className="border-primary/30 bg-primary/5">
          <AlertTitle>Compte créé pour {justApproved.request.email}</AlertTitle>
          <AlertDescription>
            <div className="mt-2 flex flex-col gap-2">
              <p>
                Mot de passe temporaire, <strong>affiché une seule fois</strong>, à
                communiquer au client par un canal sécurisé (jamais par cet écran à
                nouveau) :
              </p>
              <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
                <code className="flex-1 truncate text-xs">
                  {justApproved.temporaryPassword}
                </code>
                <Button type="button" size="icon-sm" variant="ghost" onClick={handleCopyPassword}>
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="self-start"
                onClick={() => setJustApproved(null)}
              >
                J&apos;ai noté ce mot de passe
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Demandes d&apos;ouverture de compte</CardTitle>
          <CardDescription>
            Validez ou rejetez les demandes reçues via le formulaire public. Valider crée
            immédiatement le compte du client et génère son mot de passe temporaire.
          </CardDescription>
          {capacity && (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="size-3.5" />
              <span>
                <strong className="font-medium text-foreground">{capacity.used}</strong> /{" "}
                {capacity.max} places clientes occupées
                {capacity.remaining === 0 && " · plafond atteint, aucune nouvelle validation possible"}
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {capacity?.remaining === 0 && (
            <Alert variant="destructive">
              <ShieldAlert className="size-4" />
              <AlertTitle>Plafond de {capacity.max} comptes clients atteint</AlertTitle>
              <AlertDescription>
                Aucune nouvelle demande ne peut être validée tant qu&apos;un compte existant
                n&apos;est pas fermé. Les demandes restent en attente ci-dessous.
              </AlertDescription>
            </Alert>
          )}

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
                <span className="text-sm font-medium">
                  {request.firstName} {request.lastName}
                </span>
                <span className="text-xs text-muted-foreground">{request.email}</span>
                {request.phone && (
                  <span className="text-xs text-muted-foreground">{request.phone}</span>
                )}
                {request.message && (
                  <p className="mt-1 max-w-md text-xs text-muted-foreground">
                    « {request.message} »
                  </p>
                )}
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
                  onClick={() => handleReject(request.id)}
                >
                  <X className="size-4" />
                  Rejeter
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={actingOn === request.id || capacity?.remaining === 0}
                  onClick={() => handleApprove(request.id)}
                >
                  <Check className="size-4" />
                  Valider
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
