import { HandCoins, Landmark, CreditCard, TrendingUp, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { BalanceTile } from "@/components/dashboard/balance-tile";
import { VaultBadgeIcon } from "@/components/dashboard/vault-graphics";
import { formatUsd } from "@/lib/format";
import type { BalanceSummary } from "@/lib/api";

// Tant qu'aucun crédit n'est accordé (aucune demande honorée), la carte "Gage verrouillé"
// n'a rien à composer et induirait en erreur (elle afficherait un gage à zéro comme si
// une position existait déjà) — elle reste donc masquée jusqu'à la première demande
// honorée. Solde de dépôt / Pouvoir d'achat / Crédit disponible restent en revanche
// affichés dès l'accueil, à la demande du client : le pouvoir d'achat vaut alors le solde
// de dépôt (rien d'autre à y ajouter) et le crédit disponible est explicitement à zéro,
// avec un renvoi vers Crédit plutôt qu'un silence qui laisserait croire à une ligne déjà
// active. Les trois cartes partagent le gabarit BalanceTile (montant en trois niveaux de
// lecture, cf. Money).
export function BalanceCards({ summary }: { summary: BalanceSummary }) {
  const t = useTranslations("Dashboard.balanceCards");
  const { balance, totalPurchasingPower } = summary;
  const hasCredit = Number(balance.grantedCredit) > 0;
  const creditAvailable = Number(balance.grantedCredit) - Number(balance.usedCredit);

  if (!hasCredit) {
    return (
      <div className="grid items-stretch gap-4 sm:grid-cols-3">
        <BalanceTile
          accent
          label={t("depositBalance.title")}
          icon={<Wallet />}
          value={balance.availableBalance}
          note={t("depositBalance.description")}
        />
        <BalanceTile
          label={t("purchasingPower.title")}
          icon={<TrendingUp />}
          value={totalPurchasingPower}
          note={t("purchasingPower.descriptionNoCredit")}
        />
        <BalanceTile
          label={t("availableCredit.title")}
          icon={<HandCoins />}
          value={0}
          note={t("availableCredit.description")}
        />
      </div>
    );
  }

  return (
    <div className="grid items-stretch gap-4 sm:grid-cols-3">
      <BalanceTile
        accent
        label={t("globalBalance.title")}
        icon={<Landmark />}
        value={totalPurchasingPower}
        note={t("globalBalance.description")}
      />
      <BalanceTile
        label={t("lockedCollateral.title")}
        icon={<VaultBadgeIcon />}
        value={balance.lockedCollateral}
        note={t("lockedCollateral.description")}
      />
      <BalanceTile
        label={t("creditLine.title")}
        icon={<CreditCard />}
        value={balance.grantedCredit}
        note={t("creditLine.description", {
          available: formatUsd(creditAvailable),
          used: formatUsd(balance.usedCredit),
        })}
      />
    </div>
  );
}
