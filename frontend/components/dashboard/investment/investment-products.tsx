"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FixedTermPlansSection } from "@/components/dashboard/fixed-term-plans-section";
import { InvestmentAdvisorDialog } from "@/components/dashboard/investment-advisor-dialog";
import { BasketCard } from "@/components/dashboard/investment-panel";
import { useInvestment } from "@/components/dashboard/investment/investment-context";
import { INVESTMENT_BASKETS } from "@/lib/api";
import { formatUsd } from "@/lib/format";

type ProductTab = "baskets" | "fixedTerm";

// Produits — le catalogue : 6 paniers perpétuels (retrait libre) et 6 plans à échéance fixe
// (capital bloqué). Le solde du wallet investissement reste visible en tête pour que le
// client sache ce qu'il peut placer, avec un raccourci vers l'approvisionnement.
export function InvestmentProducts() {
  const t = useTranslations("Dashboard.investment");
  const tSpace = useTranslations("Dashboard.investmentSpace.products");
  const inv = useInvestment();
  const [tab, setTab] = useState<ProductTab>("baskets");

  return (
    <div className="flex flex-col gap-5">
      {inv.error && (
        <Alert variant="destructive">
          <AlertDescription>{inv.error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Wallet className="size-4 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">{tSpace("availableLabel")}</p>
            <p className="font-heading text-xl leading-tight font-semibold">
              {inv.walletBalance != null ? formatUsd(inv.walletBalance) : "—"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button nativeButton={false} render={<Link href="/dashboard/investissement/approvisionner" />} variant="outline" size="sm">
            {tSpace("fund")}
          </Button>
          <InvestmentAdvisorDialog
            rates={inv.rates}
            plans={inv.fixedTermPlans}
            availableBalance={inv.walletBalance}
          />
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as ProductTab)}>
        <TabsList>
          <TabsTrigger value="baskets">{t("tabs.baskets")}</TabsTrigger>
          <TabsTrigger value="fixedTerm">{t("tabs.fixedTerm")}</TabsTrigger>
        </TabsList>

        {/* Rendu conditionnel manuel plutôt que <TabsContent> (Base UI Panel) : voir le
            commentaire équivalent de MarketView — la détection de fin de transition de la
            bibliothèque n'aboutit jamais sans transition CSS réelle sur le panneau. */}
        {tab === "baskets" && (
          <div className="grid gap-5 pt-4 sm:grid-cols-2 xl:grid-cols-3">
            {INVESTMENT_BASKETS.map((basket) => (
              <BasketCard
                key={basket}
                basket={basket}
                rate={inv.rates?.[basket] ?? null}
                assets={inv.assets?.[basket]?.assets ?? []}
                history={inv.history?.[basket] ?? []}
                position={inv.activePositions.get(basket) ?? null}
                availableBalance={inv.walletBalance}
                busy={inv.busyBasket === basket}
                onDeposit={inv.deposit}
                onWithdraw={inv.withdraw}
              />
            ))}
          </div>
        )}

        {tab === "fixedTerm" && (
          <div className="pt-4">
            <FixedTermPlansSection
              plans={inv.fixedTermPlans}
              positions={inv.fixedTermPositions}
              availableBalance={inv.walletBalance}
              busyPlan={inv.busyPlan}
              onDeposit={inv.depositFixedTerm}
            />
          </div>
        )}
      </Tabs>
    </div>
  );
}
