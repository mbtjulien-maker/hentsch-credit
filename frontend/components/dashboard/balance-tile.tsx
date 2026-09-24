import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Money } from "@/components/dashboard/money";
import { GLASS_CARD_CLASS, cn } from "@/lib/utils";

// Carte de solde partagée par l'accueil, la page Solde et l'espace Investissement : même
// gabarit partout pour que les chiffres tombent sur la même ligne d'une carte à l'autre
// (libellé + pastille d'icône en haut, montant au milieu, note en bas séparée par un
// filet), au lieu de trois variantes qui dérivaient chacune de leur côté.
export function BalanceTile({
  label,
  icon,
  value,
  size = "lg",
  accent = false,
  valueClassName,
  extra,
  note,
  action,
  className,
}: {
  label: string;
  icon: ReactNode;
  // `null` tant que le montant n'est pas chargé : un tiret plutôt qu'un faux 0.
  value: string | number | null;
  size?: "hero" | "lg" | "md";
  // Carte mise en avant : filet et pastille en couleur primaire.
  accent?: boolean;
  valueClassName?: string;
  // Ligne sous le montant (variation, rendement cumulé…).
  extra?: ReactNode;
  note?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn(GLASS_CARD_CLASS, "h-full", accent && "border-primary/30", className)}>
      <CardContent className="flex h-full min-h-44 flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <span
            aria-hidden
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full [&_svg]:size-4",
              accent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
            )}
          >
            {icon}
          </span>
        </div>

        <div className="flex flex-1 flex-col justify-center gap-2">
          {value === null ? (
            <span className="font-heading text-4xl leading-none text-muted-foreground">—</span>
          ) : (
            <Money value={value} size={size} className={valueClassName} />
          )}
          {extra}
          {action}
        </div>

        {note && (
          <p className="min-h-[4.5rem] border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">{note}</p>
        )}
      </CardContent>
    </Card>
  );
}
