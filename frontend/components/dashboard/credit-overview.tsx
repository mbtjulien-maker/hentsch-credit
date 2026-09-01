"use client";

import type { ComponentType } from "react";
import { HandCoins, Lock, Percent, TrendingUp, Wallet } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import type { BalanceSummary, CreditRatesResponse, CreditRequest } from "@/lib/api";
import { formatDate, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

// Couleurs par statut de demande — jamais réutilisées comme identité catégorielle,
// toujours associées au libellé (jamais la couleur seule). Vert = accordé/positif
// (FULFILLED), rouge = refus, champagne = en cours (PENDING/APPROVED) — palette
// restreinte au vocabulaire de couleur de la refonte (or/ivoire, vert positif, rouge
// alerte), plus de bleu/orange décoratifs.
const STATUS_DOT_CLASS: Record<CreditRequest["status"], string> = {
  PENDING: "bg-primary",
  APPROVED: "bg-primary",
  FULFILLED: "bg-[#0ca30c] dark:bg-[#34D399]",
  REJECTED: "bg-[#d03b3b] dark:bg-[#EF4444]",
};

// Bande de statut compacte — vue d'ensemble de la position crédit en un coup d'œil,
// avant même d'interagir avec le formulaire. Une seule ligne sur desktop, empile en
// grille 2 colonnes sur mobile (adaptatif). Icônes toutes en champagne (accent unique de
// la palette), plus de code couleur bleu/orange/vert par ligne — la hiérarchie se fait
// par la mise en avant du "Pouvoir d'achat total" (dernière carte, texte accentué),
// cohérent avec la priorité produit Actifs → Gage → Capacité d'achat → Crédit.
export function CreditOverviewStrip({ summary }: { summary: BalanceSummary }) {
  const t = useTranslations("Dashboard.creditOverview");
  const { balance } = summary;
  const creditAvailable = Number(balance.grantedCredit) - Number(balance.usedCredit);

  const items: { icon: ComponentType<{ className?: string }>; label: string; value: string; emphasis?: boolean }[] = [
    {
      icon: Wallet,
      label: t("availableBalance"),
      value: formatUsd(balance.availableBalance),
    },
    {
      icon: Lock,
      label: t("lockedCollateral"),
      value: formatUsd(balance.lockedCollateral),
    },
    {
      icon: HandCoins,
      label: t("availableCredit"),
      value: formatUsd(creditAvailable),
    },
    {
      icon: TrendingUp,
      label: t("totalPurchasingPower"),
      value: formatUsd(summary.totalPurchasingPower),
      emphasis: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm dark:shadow-none",
            item.emphasis && "border-primary/25",
          )}
        >
          <item.icon className="size-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <div className="truncate text-[11px] leading-tight text-muted-foreground">
              {item.label}
            </div>
            <div className={cn("text-sm font-semibold tabular-nums leading-tight", item.emphasis && "text-primary")}>
              {item.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Panneau "Taux actuels" — toujours visible, indépendamment de l'onglet actif du
// formulaire (contrairement au détail des taux affiché dans CreditSimulator, qui
// n'apparaît qu'une fois un montant saisi).
export function CreditRatesPanel({ rates }: { rates: CreditRatesResponse | null }) {
  const t = useTranslations("Dashboard.creditOverview");
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm dark:shadow-none">
      <div className="flex items-center gap-2">
        <Percent className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">{t("currentRates")}</h3>
      </div>
      {!rates ? (
        <div className="mt-3 flex flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      ) : (
        <dl className="mt-3 flex flex-col gap-2 text-xs">
          {(Object.entries(rates.rates) as [string, (typeof rates.rates)[keyof typeof rates.rates]][]).map(
            ([currency, info]) => (
              <div key={currency} className="flex items-center justify-between gap-2 border-t border-border pt-2 first:border-t-0 first:pt-0">
                <dt className="font-medium text-foreground">{currency}</dt>
                <dd className="flex flex-col items-end gap-0.5 text-right tabular-nums text-muted-foreground">
                  <span>{t("interestRateLine", { rate: info.interestRatePct })}</span>
                  <span>
                    {t("feesLine", {
                      origination: info.originationFeePct,
                      custody: info.custodyFeePct,
                    })}
                  </span>
                </dd>
              </div>
            ),
          )}
        </dl>
      )}
      <p className="mt-3 border-t border-border pt-2.5 text-[11px] text-muted-foreground">
        {t("ratioNote")}
      </p>
      <p className="mt-2 text-[11px] text-muted-foreground">{t("repaymentNote")}</p>
    </div>
  );
}

// Historique compact des demandes de crédit — richesse d'information sans quitter la
// page (pas de renvoi vers l'Historique général des transactions).
export function CreditRequestsHistory({
  requests,
  loading,
}: {
  requests: CreditRequest[] | null;
  loading: boolean;
}) {
  const t = useTranslations("Dashboard.creditOverview");
  const tLabels = useTranslations("Dashboard.labels");
  const locale = useLocale();
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm dark:shadow-none">
      <h3 className="text-sm font-semibold text-foreground">{t("myRequests")}</h3>
      {loading ? (
        <div className="mt-3 flex flex-col gap-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : !requests || requests.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">{t("noRequests")}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2.5">
          {requests.slice(0, 5).map((req) => (
            <li key={req.id} className="flex items-center gap-2.5 text-xs">
              <span
                className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT_CLASS[req.status])}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">
                    {formatUsd(req.collateralAmount)}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatDate(req.createdAt, locale)}
                  </span>
                </div>
                <span className="text-muted-foreground">
                  {tLabels(`creditRequestStatus.${req.status}`)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
