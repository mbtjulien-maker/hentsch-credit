import { CreditCard, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUsd } from "@/lib/format";
import type { CardRecord, CardStatus } from "@/lib/api";

function statusVariant(status: CardStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "ACTIVE":
      return "default";
    case "PENDING":
      return "secondary";
    case "BLOCKED":
      return "destructive";
    default:
      return "outline";
  }
}

// Face de carte stylisée — même donnée (externalCardId, creditLimit, status) que
// l'ancienne ligne de liste, présentée comme une carte bancaire plutôt qu'une ligne de
// tableau : la carte est un élément prioritaire du produit (cf. brief de refonte,
// Actifs → Gage → Capacité d'achat → Carte). Aucun dégradé : aplat graphite + liseré
// champagne, cohérent avec le reste de la palette "Dark Luxury Fintech".
function CardFace({ card }: { card: CardRecord }) {
  const t = useTranslations("Dashboard");
  const masked = `•••• •••• •••• ${card.externalCardId.slice(-4).padStart(4, "0")}`;
  return (
    <div className="flex flex-col justify-between gap-6 rounded-2xl border border-primary/15 bg-secondary p-5">
      <div className="flex items-start justify-between">
        <div className="flex size-9 items-center justify-center rounded-md bg-primary/12 text-primary">
          <CreditCard className="size-4.5" />
        </div>
        <Badge variant={statusVariant(card.status)}>{t(`labels.cardStatus.${card.status}`)}</Badge>
      </div>
      <div>
        <p className="font-mono text-[15px] tracking-[0.08em] text-foreground">{masked}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {t("cardsSection.limit", { amount: formatUsd(card.creditLimit) })}
        </p>
      </div>
    </div>
  );
}

export function CardsSection({ cards }: { cards: CardRecord[] }) {
  const t = useTranslations("Dashboard.cardsSection");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {cards.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noCards")}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {cards.map((card) => (
              <CardFace key={card.id} card={card} />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t pt-4">
          <p className="text-xs text-muted-foreground">{t("step4Note")}</p>
          <Button size="sm" variant="outline" disabled>
            <Plus className="size-4" />
            {t("issueCard")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
