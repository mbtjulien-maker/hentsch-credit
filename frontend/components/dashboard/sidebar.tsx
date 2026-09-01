"use client";

import Image from "next/image";
import NextLink from "next/link";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  Briefcase,
  ClipboardCheck,
  CreditCard,
  HandCoins,
  History,
  LayoutGrid,
  LifeBuoy,
  LineChart,
  ShieldCheck,
  TrendingUp,
  User,
  UserPlus,
  Wallet,
} from "lucide-react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { cn } from "@/lib/utils";

type NavSection = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  // /admin est hors du périmètre i18n (cf. proxy.ts) : le Link localisé de
  // @/i18n/navigation préfixerait cette route d'une langue et casserait le lien
  // (/en/admin n'existe pas). Toute autre section reste true (valeur par défaut).
  localized?: boolean;
};

// Version compacte — utilisée par MobileNav, affichée dans la zone de contenu (repli
// horizontal < lg). Entièrement sur tokens sémantiques : suit déjà le thème actif sans
// changement ici.
function NavLink({ href, label, icon: Icon, isActive, localized = true }: NavSection & { isActive: boolean }) {
  const LinkComponent = localized ? Link : NextLink;
  return (
    <LinkComponent
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </LinkComponent>
  );
}

// Lien de la sidebar verticale — appuyé sur les tokens --sidebar-* (cf. app/globals.css) :
// un fin liseré or à gauche + fond graphite très subtil marquent l'état actif, plutôt
// qu'un bloc plein. Cohérent avec la sidebar de l'espace admin (même logique de liseré),
// pour une identité visuelle continue entre les deux zones sombres de l'application.
function SidebarNavLink({ href, label, icon: Icon, isActive, localized = true }: NavSection & { isActive: boolean }) {
  const LinkComponent = localized ? Link : NextLink;
  return (
    <LinkComponent
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg py-2 pr-3 pl-3.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-sidebar-accent text-sidebar-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      {isActive && (
        <span className="absolute top-1/2 left-0 h-4 w-[2px] -translate-y-1/2 rounded-full bg-sidebar-primary" />
      )}
      <Icon className={cn("size-4 shrink-0", isActive ? "text-sidebar-primary" : "text-muted-foreground/70 group-hover:text-sidebar-primary/80")} />
      {label}
    </LinkComponent>
  );
}

// Barre latérale — desktop/tablette large uniquement (lg+). Chrome "sidebar noire
// élégante" : obsidian quasi-noir (--sidebar, plus sombre que le fond du contenu),
// bordure champagne très fine, marque en aplat or (plus de dégradé cyan→fuchsia). Puis
// une section "Back-office" nettement séparée pour la file de validation des demandes.
export function Sidebar() {
  const t = useTranslations("DashboardShell.sidebar");
  const pathname = usePathname();
  const { selectedUser } = useDashboard();
  const isAdmin = selectedUser?.role === "ADMIN";
  const isBusiness = selectedUser?.accountType === "BUSINESS";

  // Pages client — usage courant du compte. Chaque entrée est une route dédiée
  // (cf. app/[locale]/dashboard/*/page.tsx), pas une simple ancre : navigation réelle.
  const CLIENT_SECTIONS: NavSection[] = [
    { href: "/dashboard", label: t("client.home"), icon: LayoutGrid },
    { href: "/dashboard/solde", label: t("client.balance"), icon: Wallet },
    { href: "/dashboard/marche", label: t("client.market"), icon: TrendingUp },
    { href: "/dashboard/credit", label: t("client.credit"), icon: HandCoins },
    // Ouvert à tous les comptes vérifiés (particulier ET business, cf. §2H CLAUDE.md) —
    // contrairement au crédit direct ci-dessous, aucun masquage par accountType.
    { href: "/dashboard/investissement", label: t("client.investment"), icon: LineChart },
    // Réservé aux comptes BUSINESS (cf. AccountType) — masqué pour un compte particulier,
    // qui n'a de toute façon pas accès au crédit direct (cf. BusinessAccountGuard côté API).
    ...(isBusiness
      ? [{ href: "/dashboard/credit-direct", label: t("client.directCredit"), icon: Briefcase }]
      : []),
    { href: "/dashboard/cartes", label: t("client.cards"), icon: CreditCard },
    { href: "/dashboard/historique", label: t("client.history"), icon: History },
    { href: "/dashboard/profil", label: t("client.profile"), icon: User },
    { href: "/dashboard/support", label: t("client.support"), icon: LifeBuoy },
  ];

  // Vue de validation des demandes de crédit — back-office, pas un usage client courant.
  // Masquée pour tout compte qui n'a pas le rôle ADMIN (cf. AdminGuard côté API — ce n'est
  // pas qu'un masquage cosmétique, l'API rejette de toute façon ces appels pour un client).
  const BACKOFFICE_SECTIONS: NavSection[] = [
    { href: "/dashboard/demandes-credit", label: t("backoffice.creditRequests"), icon: ClipboardCheck },
    { href: "/dashboard/demandes-comptes", label: t("backoffice.accountRequests"), icon: UserPlus },
    { href: "/admin", label: t("backoffice.adminArea"), icon: ShieldCheck, localized: false },
  ];

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-8 overflow-y-auto border-r border-sidebar-border bg-sidebar px-4 py-7 lg:flex">
      <Link href="/dashboard" className="flex items-center gap-3">
        <Image src="/brand/hentsch-mark.png" alt="" width={500} height={500} className="size-10 rounded-lg" />
        <div>
          <h1 className="text-[15px] leading-none font-semibold tracking-[-0.01em] text-sidebar-foreground">Hentsch Credit</h1>
          <p className="mt-1.5 text-[11px] tracking-[0.04em] text-muted-foreground uppercase">{t("subtitle")}</p>
        </div>
      </Link>

      <nav aria-label={t("clientNavAriaLabel")} className="flex flex-col gap-1">
        {CLIENT_SECTIONS.map((section) => (
          <SidebarNavLink key={section.href} {...section} isActive={pathname === section.href} />
        ))}
      </nav>

      {isAdmin && (
        <nav
          aria-label={t("backofficeNavAriaLabel")}
          className="mt-auto flex flex-col gap-1 border-t border-sidebar-border pt-5"
        >
          <span className="px-3.5 pb-1 text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            {t("backoffice.label")}
          </span>
          {BACKOFFICE_SECTIONS.map((section) => (
            <SidebarNavLink key={section.href} {...section} isActive={pathname === section.href} />
          ))}
        </nav>
      )}
    </aside>
  );
}

// Repli mobile/tablette étroite (< lg) : la sidebar verticale n'a pas la place de
// s'afficher, on retombe sur une bande horizontale défilable dans la zone de contenu —
// toutes les sections à plat (client + back-office).
export function MobileNav() {
  const t = useTranslations("DashboardShell.sidebar");
  const pathname = usePathname();
  const { selectedUser } = useDashboard();
  const isAdmin = selectedUser?.role === "ADMIN";
  const isBusiness = selectedUser?.accountType === "BUSINESS";

  const CLIENT_SECTIONS: NavSection[] = [
    { href: "/dashboard", label: t("client.home"), icon: LayoutGrid },
    { href: "/dashboard/solde", label: t("client.balance"), icon: Wallet },
    { href: "/dashboard/marche", label: t("client.market"), icon: TrendingUp },
    { href: "/dashboard/credit", label: t("client.credit"), icon: HandCoins },
    { href: "/dashboard/investissement", label: t("client.investment"), icon: LineChart },
    ...(isBusiness
      ? [{ href: "/dashboard/credit-direct", label: t("client.directCredit"), icon: Briefcase }]
      : []),
    { href: "/dashboard/cartes", label: t("client.cards"), icon: CreditCard },
    { href: "/dashboard/historique", label: t("client.history"), icon: History },
    { href: "/dashboard/profil", label: t("client.profile"), icon: User },
    { href: "/dashboard/support", label: t("client.support"), icon: LifeBuoy },
  ];
  const BACKOFFICE_SECTIONS: NavSection[] = [
    { href: "/dashboard/demandes-credit", label: t("backoffice.creditRequests"), icon: ClipboardCheck },
    { href: "/dashboard/demandes-comptes", label: t("backoffice.accountRequests"), icon: UserPlus },
    { href: "/admin", label: t("backoffice.adminArea"), icon: ShieldCheck, localized: false },
  ];
  const allSections = isAdmin ? [...CLIENT_SECTIONS, ...BACKOFFICE_SECTIONS] : CLIENT_SECTIONS;

  return (
    <nav
      aria-label={t("mobileNavAriaLabel")}
      className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:hidden"
    >
      {allSections.map((section) => (
        <NavLink key={section.href} {...section} isActive={pathname === section.href} />
      ))}
    </nav>
  );
}
