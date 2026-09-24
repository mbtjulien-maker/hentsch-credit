"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { useInvestment } from "@/components/dashboard/investment/investment-context";
import { MyPlacementsSection } from "@/components/dashboard/my-placements-section";

// Mes placements — tout ce qui est en cours (paniers perpétuels retirables à tout moment,
// plans à échéance fixe bloqués jusqu'à leur date) et l'historique des plans réglés. Le
// retrait d'un panier se fait ici, depuis sa ligne.
export function InvestmentPlacements() {
  const inv = useInvestment();
  return (
    <div className="flex flex-col gap-4">
      {inv.error && (
        <Alert variant="destructive">
          <AlertDescription>{inv.error}</AlertDescription>
        </Alert>
      )}
      <MyPlacementsSection
        basketPositions={inv.activePositions}
        fixedTermPositions={inv.fixedTermPositions}
        fixedTermPlans={inv.fixedTermPlans}
        onWithdraw={inv.withdraw}
        busyBasket={inv.busyBasket}
      />
    </div>
  );
}
