"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError, type PaymentStatus } from "@/lib/api";
import { formatUsd } from "@/lib/format";

// Page de paiement simulée : ne représente PAS l'interface réelle de Mollie. Tant que
// MOLLIE_API_KEY n'est pas configurée côté backend, createCardTopup redirige ici plutôt
// que vers un vrai checkout hébergé — même convention que les adresses de dépôt sandbox
// (WalletService.generateSandboxAddress). Le bouton "Confirmer" appelle exactement le
// même endpoint que le webhook Mollie réel appellerait (POST /payments/mollie-webhook) :
// aucune divergence de logique entre sandbox et production, cf. MollieService.
export default function SimulatedCheckoutPage() {
  const { paymentId } = useParams<{ paymentId: string }>();
  const router = useRouter();

  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    api
      .getCardTopupStatus(paymentId)
      .then((s) => {
        if (!ignore) setStatus(s);
      })
      .catch((err) => {
        if (!ignore) {
          setLoadError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
        }
      });
    return () => {
      ignore = true;
    };
  }, [paymentId]);

  async function handleConfirm() {
    setConfirming(true);
    setConfirmError(null);
    try {
      await api.confirmCardTopup(paymentId);
      router.push("/dashboard/solde?topup=complete");
    } catch (err) {
      setConfirmError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
      setConfirming(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 py-12">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CreditCard className="size-4" />
            Paiement simulé (mode sandbox Mollie)
          </div>
          <CardTitle>Confirmer le paiement par carte</CardTitle>
          <CardDescription>
            Cette page remplace le checkout Mollie hébergé tant qu&apos;aucune clé API
            n&apos;est configurée côté banque. Aucune donnée de carte réelle n&apos;est
            demandée ici.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {loadError && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>Paiement introuvable</AlertTitle>
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          )}

          {!loadError && !status && <Skeleton className="h-20 w-full" />}

          {status && (
            <>
              <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2.5">
                <span className="text-sm text-muted-foreground">Montant à débiter</span>
                <span className="text-lg font-semibold tabular-nums">
                  {formatUsd(status.amount)}
                </span>
              </div>

              {status.status === "PENDING" && (
                <>
                  {confirmError && (
                    <Alert variant="destructive">
                      <AlertDescription>{confirmError}</AlertDescription>
                    </Alert>
                  )}
                  <Button type="button" onClick={handleConfirm} disabled={confirming}>
                    {confirming ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="size-4" />
                    )}
                    Confirmer le paiement
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => router.push("/dashboard/solde")}
                    disabled={confirming}
                  >
                    Annuler
                  </Button>
                </>
              )}

              {status.status === "COMPLETED" && (
                <Alert>
                  <ShieldCheck className="size-4" />
                  <AlertTitle>Paiement déjà confirmé</AlertTitle>
                  <AlertDescription>
                    Le solde a déjà été crédité pour ce paiement.
                  </AlertDescription>
                </Alert>
              )}

              {status.status === "FAILED" && (
                <Alert variant="destructive">
                  <AlertTriangle className="size-4" />
                  <AlertTitle>Paiement échoué</AlertTitle>
                  <AlertDescription>
                    Ce paiement n&apos;a pas abouti et le solde n&apos;a pas été crédité.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
