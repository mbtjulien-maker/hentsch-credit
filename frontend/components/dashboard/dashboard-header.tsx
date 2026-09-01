"use client";

import { Landmark } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AccountMenu } from "@/components/dashboard/account-menu";
import { MobileNav } from "@/components/dashboard/sidebar";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { LanguageSwitcher } from "@/components/marketing/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

// Barre supérieure : contexte de session (compte connecté + statut KYC), pas de la
// navigation — celle-ci vit désormais dans la sidebar (cf. sidebar.tsx). La marque ne
// réapparaît ici qu'en dessous de `lg`, quand la sidebar est masquée.
export function DashboardHeader() {
  const t = useTranslations("DashboardShell.sidebar");
  const { selectedUser } = useDashboard();

  return (
    <header className="sticky top-0 z-20 -mx-4 flex flex-col gap-3 border-b border-border bg-background/80 px-4 pt-4 pb-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/dashboard" className="flex items-center gap-3 lg:hidden">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Landmark className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-none">Hentsch Credit</h1>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <AccountMenu />
        </div>
      </div>
      {selectedUser && <MobileNav />}
    </header>
  );
}
