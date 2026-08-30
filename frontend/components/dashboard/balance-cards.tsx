import type { ReactNode } from "react";
import { HandCoins, Landmark, CreditCard, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VaultBadgeIcon } from "@/components/dashboard/vault-graphics";
import { GLASS_CARD_CLASS, cn } from "@/lib/utils";
import { formatUsd } from "@/lib/format";
import type { BalanceSummary } from "@/lib/api";

// Halo au survol — CSS pur (aucune dépendance JS d'animation). En clair : reflet
// bleu/blanc "cyber" existant. En sombre (.dark, cf. app/globals.css) : halo champagne
// unique, très discret — "aucun gradient excessif", cf. brief de refonte Dark Luxury
// Fintech. La carte porte elle-même la transition (transform/shadow/border/bg, cf.
// GLASS_CARD_CLASS) ; ce wrapper n'ajoute que le halo superposé, dont l'opacité passe de
// 0 à 1 via `group-hover`.
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

// Tant qu'aucun crédit n'est accordé (aucune demande honorée), la carte "Gage verrouillé"
// n'a rien à composer et induirait en erreur (elle afficherait un gage à zéro comme si
// une position existait déjà) — elle reste donc masquée jusqu'à la première demande
// honorée. Solde de dépôt / Pouvoir d'achat / Crédit disponible restent en revanche
// affichés dès l'accueil, à la demande du client : le pouvoir d'achat vaut alors le solde
// de dépôt (rien d'autre à y ajouter) et le crédit disponible est explicitement à zéro,
// avec un renvoi vers Crédit plutôt qu'un silence qui laisserait croire à une ligne déjà
// active.
//
// Le filigrane coffre-fort vit désormais au niveau du layout dashboard (cf.
// app/dashboard/layout.tsx), sur le fond de la zone client — pas ici, pour ne pas le
// dupliquer par page.
//
// Hiérarchie typographique volontairement renforcée sur ces trois cartes : Actifs → Gage
// → Capacité d'achat → Crédit sont les éléments prioritaires du produit (cf. brief de
// refonte) — les montants doivent être identifiables au premier coup d'œil.
export function BalanceCards({ summary }: { summary: BalanceSummary }) {
  const { balance, totalPurchasingPower } = summary;
  const hasCredit = Number(balance.grantedCredit) > 0;
  const creditAvailable =
    Number(balance.grantedCredit) - Number(balance.usedCredit);

  if (!hasCredit) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCardShell>
          <Card className={cn(GLASS_CARD_CLASS, "border-primary/20")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Solde de dépôt
              </CardTitle>
              <Wallet className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tracking-tight tabular-nums">
                {formatUsd(balance.availableBalance)}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Montant disponible dans votre wallet, aucune ligne de crédit active pour
                l&apos;instant.
              </p>
            </CardContent>
          </Card>
        </KpiCardShell>

        <KpiCardShell>
          <Card className={GLASS_CARD_CLASS}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pouvoir d&apos;achat
              </CardTitle>
              <TrendingUp className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tracking-tight tabular-nums">
                {formatUsd(totalPurchasingPower)}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Identique au solde de dépôt tant qu&apos;aucun crédit n&apos;est accordé.
              </p>
            </CardContent>
          </Card>
        </KpiCardShell>

        <KpiCardShell>
          <Card className={GLASS_CARD_CLASS}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Crédit disponible
              </CardTitle>
              <HandCoins className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tracking-tight tabular-nums">
                {formatUsd(0)}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Aucune ligne active, soumettez une demande depuis Crédit.
              </p>
            </CardContent>
          </Card>
        </KpiCardShell>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <KpiCardShell>
        <Card className={cn(GLASS_CARD_CLASS, "border-primary/20 dark:border-primary/25")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Solde global
            </CardTitle>
            <Landmark className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight text-primary tabular-nums">
              {formatUsd(totalPurchasingPower)}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Disponible + gage verrouillé + crédit accordé − crédit utilisé
            </p>
          </CardContent>
        </Card>
      </KpiCardShell>

      <KpiCardShell>
        <Card className={GLASS_CARD_CLASS}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gage verrouillé
            </CardTitle>
            <div className="rounded-xl border border-slate-300/50 bg-gradient-to-br from-slate-100 to-slate-200 p-2.5 shadow-inner dark:border-primary/25 dark:bg-none dark:bg-primary/10 dark:shadow-none">
              <VaultBadgeIcon className="size-4 text-slate-500 dark:text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight tabular-nums">
              {formatUsd(balance.lockedCollateral)}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Retirable seulement après remboursement intégral
            </p>
          </CardContent>
        </Card>
      </KpiCardShell>

      <KpiCardShell>
        <Card className={GLASS_CARD_CLASS}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ligne de crédit
            </CardTitle>
            <CreditCard className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight tabular-nums">
              {formatUsd(balance.grantedCredit)}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {formatUsd(creditAvailable)} restant · {formatUsd(balance.usedCredit)} utilisé
            </p>
          </CardContent>
        </Card>
      </KpiCardShell>
    </div>
  );
}
