"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { INVESTMENT_NAV } from "@/components/dashboard/investment/investment-nav";

// Barre de navigation locale de l'espace Investissement, affichée en tête de chaque
// sous-page — indispensable sous lg où la sidebar (et ses sous-liens) n'existe pas, et
// utile au-dessus pour situer le client dans la section sans quitter la page.
export function InvestmentSectionNav() {
  const t = useTranslations("Dashboard.investmentSpace");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("navAriaLabel")}
      className="-mx-1 flex gap-1 overflow-x-auto border-b border-border/60 px-1 pb-px"
    >
      {INVESTMENT_NAV.map(({ key, href, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={key}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex shrink-0 items-center gap-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className={cn("size-4", active && "text-primary")} />
            {t(`nav.${key}`)}
            {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
          </Link>
        );
      })}
    </nav>
  );
}
