import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ADMIN_CARD, ADMIN_DIVIDER, ADMIN_LABEL } from "@/lib/admin-theme";

// Primitives visuelles partagées par tout l'admin — volontairement peu nombreuses et
// génériques (carte, en-tête de section, libellé, métrique) plutôt qu'un système de
// composants parallèle à shadcn/ui : la zone admin a sa propre palette (dark premium)
// mais la même logique de composition que le reste de l'app.

export function AdminCard({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return <div className={cn(ADMIN_CARD, padded && "p-5", className)}>{children}</div>;
}

export function AdminCardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h3 className="text-[13px] font-semibold tracking-[-0.01em] text-foreground">{title}</h3>
        {description && <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function AdminSectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(ADMIN_LABEL, className)}>{children}</div>;
}

export function AdminDivider({ className }: { className?: string }) {
  return <hr className={cn("border-t", ADMIN_DIVIDER, className)} />;
}

// Paire libellé/valeur — brique de base des sections "fiche client" (identité, adresse,
// emploi, finances…). `mono` active tabular-nums pour les montants.
export function AdminField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10.5px] font-medium tracking-[0.02em] text-muted-foreground uppercase">{label}</span>
      <span className={cn("text-[13.5px] text-foreground", mono && "tabular-nums")}>{value}</span>
    </div>
  );
}

// Grand chiffre financier — hiérarchie typographique forte pour tout montant clé (KPI,
// solde, montant demandé…), cf. brief §23. Poids et taille délibérément au-dessus du
// reste de l'UI pour que l'œil aille droit au montant avant le libellé.
export function AdminMetric({
  label,
  value,
  sub,
  accent = "text-foreground",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10.5px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">{label}</span>
      <span className={cn("text-[26px] leading-none font-semibold tracking-[-0.01em] tabular-nums", accent)}>{value}</span>
      {sub && <span className="text-[12px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

export function AdminEmptyState({ icon, title, description }: { icon?: ReactNode; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      {icon}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="max-w-sm text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}
