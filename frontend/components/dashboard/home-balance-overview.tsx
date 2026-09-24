import { HandCoins, LineChart, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { BalanceTile } from "@/components/dashboard/balance-tile";
import { formatUsd } from "@/lib/format";
import type { BalanceSummary } from "@/lib/api";

// Vue d'ensemble des soldes sur l'accueil — décision produit explicite : n'afficher ici
// QUE les trois soldes réels du compte (wallet principal, investissement, crédit), jamais
// le "Pouvoir d'achat total" ni le "Gage verrouillé" composites (cf. BalanceCards,
// toujours affiché tel quel sur /dashboard/solde, la page dédiée au détail du gage). Les
// trois soldes ici sont directement lus sur LedgerBalance, sans recomposition : le wallet
// investissement (§2H CLAUDE.md entrée #31) reste hors formule du Pouvoir d'Achat Total,
// exactement comme documenté côté backend — le montrer à plat, séparément, est cohérent
// avec ça plutôt que de le fondre dans un total qui l'exclut déjà. L'investissement passe
// en deuxième position et en carte mise en avant (produit phare, cf. entrée #54).
export function HomeBalanceOverview({ summary }: { summary: BalanceSummary }) {
  const t = useTranslations("Dashboard.home.overview");
  const { balance } = summary;
  const hasCredit = Number(balance.grantedCredit) > 0;
  const creditAvailable = Number(balance.grantedCredit) - Number(balance.usedCredit);

  return (
    <div className="grid items-stretch gap-4 sm:grid-cols-3">
      <BalanceTile
        label={t("mainWallet.title")}
        icon={<Wallet />}
        value={balance.availableBalance}
        note={t("mainWallet.description")}
      />
      <BalanceTile
        accent
        label={t("investment.title")}
        icon={<LineChart />}
        value={balance.investmentBalance}
        note={t("investment.description")}
      />
      <BalanceTile
        label={t("credit.title")}
        icon={<HandCoins />}
        value={balance.grantedCredit}
        note={
          hasCredit
            ? t("credit.description", {
                available: formatUsd(creditAvailable),
                used: formatUsd(balance.usedCredit),
              })
            : t("credit.descriptionNoCredit")
        }
      />
    </div>
  );
}
