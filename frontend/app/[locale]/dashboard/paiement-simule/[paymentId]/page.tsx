"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { AlertTriangle, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("Dashboard.simulatedCheckout");
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
          setLoadError(err instanceof ApiError ? err.message : t("genericError"));
        }
      });
    return () => {
      ignore = true;
    };
  }, [paymentId, t]);

  async function handleConfirm() {
    setConfirming(true);
    setConfirmError(null);
    try {
      await api.confirmCardTopup(paymentId);
      router.push("/dashboard/solde?topup=complete");
    } catch (err) {
      setConfirmError(err instanceof ApiError ? err.message : t("genericError"));
      setConfirming(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 py-12">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CreditCard className="size-4" />
            {t("sandboxNotice")}
          </div>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {loadError && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>{t("notFoundTitle")}</AlertTitle>
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          )}

          {!loadError && !status && <Skeleton className="h-20 w-full" />}

          {status && (
            <>
              <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2.5">
                <span className="text-sm text-muted-foreground">{t("amountToDebit")}</span>
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
                    {t("confirmButton")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => router.push("/dashboard/solde")}
                    disabled={confirming}
                  >
                    {t("cancelButton")}
                  </Button>
                </>
              )}

              {status.status === "COMPLETED" && (
                <Alert>
                  <ShieldCheck className="size-4" />
                  <AlertTitle>{t("alreadyConfirmedTitle")}</AlertTitle>
                  <AlertDescription>{t("alreadyConfirmedDescription")}</AlertDescription>
                </Alert>
              )}

              {status.status === "FAILED" && (
                <Alert variant="destructive">
                  <AlertTriangle className="size-4" />
                  <AlertTitle>{t("failedTitle")}</AlertTitle>
                  <AlertDescription>{t("failedDescription")}</AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
