import type { ReactNode } from "react";
import { HandCoins, LineChart, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GLASS_CARD_CLASS, cn } from "@/lib/utils";
import { formatUsd } from "@/lib/format";
import type { BalanceSummary } from "@/lib/api";

// Même halo au survol que BalanceCards (cf. KpiCardShell) — dupliqué ici plutôt
// qu'exporté/partagé : les deux composants n'ont plus vocation à rester synchronisés
// (BalanceCards reste le détail complet de /dashboard/solde, celui-ci est la vue
// volontairement réduite de l'accueil, cf. commentaire de HomeBalanceOverview).
function KpiCardShell({ children }: { children: ReactNode }) {
  return (
    <div className="group relative rounded-2xl">
      {children}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100 [background:radial-gradient(circle_at_35%_25%,rgba(96,165,250,0.16),transparent_55%),radial-gradient(circle_at_70%_60%,rgba(226,232,240,0.4),transparent_60%)] dark:[background:radial-gradient(circle_at_30%_20%,rgba(201,168,118,0.10),transparent_60%)]"
      />
    </div>
  );
}

// Vue d'ensemble des soldes sur l'accueil — décision produit explicite : n'afficher ici
// QUE les trois soldes réels du compte (wallet principal, crédit, investissement), jamais
// le "Pouvoir d'achat total" ni le "Gage verrouillé" composites (cf. BalanceCards,
// toujours affiché tel quel sur /dashboard/solde, la page dédiée au détail du gage). Les
// trois soldes ici sont directement lus sur LedgerBalance, sans recomposition : le wallet
// investissement (§2H CLAUDE.md entrée #31) reste hors formule du Pouvoir d'Achat Total,
// exactement comme documenté côté backend — le montrer à plat, séparément, est cohérent
// avec ça plutôt que de le fondre dans un total qui l'exclut déjà.
export function HomeBalanceOverview({ summary }: { summary: BalanceSummary }) {
  const t = useTranslations("Dashboard.home.overview");
  const { balance } = summary;
  const hasCredit = Number(balance.grantedCredit) > 0;
  const creditAvailable = Number(balance.grantedCredit) - Number(balance.usedCredit);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <KpiCardShell>
        <Card className={cn(GLASS_CARD_CLASS, "border-primary/20")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("mainWallet.title")}
            </CardTitle>
            <Wallet className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight tabular-nums">
              {formatUsd(balance.availableBalance)}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{t("mainWallet.description")}</p>
          </CardContent>
        </Card>
      </KpiCardShell>

      <KpiCardShell>
        <Card className={GLASS_CARD_CLASS}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("credit.title")}
            </CardTitle>
            <HandCoins className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight tabular-nums">
              {formatUsd(balance.grantedCredit)}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {hasCredit
                ? t("credit.description", {
                    available: formatUsd(creditAvailable),
                    used: formatUsd(balance.usedCredit),
                  })
                : t("credit.descriptionNoCredit")}
            </p>
          </CardContent>
        </Card>
      </KpiCardShell>

      <KpiCardShell>
        <Card className={GLASS_CARD_CLASS}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("investment.title")}
            </CardTitle>
            <LineChart className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight tabular-nums">
              {formatUsd(balance.investmentBalance)}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{t("investment.description")}</p>
          </CardContent>
        </Card>
      </KpiCardShell>
    </div>
  );
}
