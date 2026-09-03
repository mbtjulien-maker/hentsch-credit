import { Clock, CreditCard } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Système de carte retiré de l'espace client (retour client : "enlève le système de
// carte, mets « à venir prochainement »") — l'émission Visa/Mastercard n'a de toute façon
// jamais dépassé le stade de maquette (cf. STEP 4 CLAUDE.md, §5 : aucune autorisation JIT
// réelle n'est branchée, seul le rechargement de solde par carte via Mollie l'est —
// fonctionnalité distincte, cf. WalletActions "Acheter par carte", non affectée par ce
// retrait). Remplacé par une simple mention "bientôt disponible" plutôt que de continuer
// à présenter des cartes factices comme un vrai produit émis.
export function CardsSection() {
  const t = useTranslations("Dashboard.cardsSection");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="size-4 text-muted-foreground" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/60 py-10 text-center">
          <Clock className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">{t("comingSoonTitle")}</p>
          <p className="max-w-xs text-xs text-muted-foreground">{t("comingSoonDescription")}</p>
        </div>
      </CardContent>
    </Card>
  );
}
