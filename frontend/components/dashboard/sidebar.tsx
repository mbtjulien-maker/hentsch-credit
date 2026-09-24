"use client";

import Image from "next/image";
import NextLink from "next/link";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  Briefcase,
  ClipboardCheck,
  CreditCard,
  FileCheck2,
  HandCoins,
  History,
  LayoutGrid,
  LifeBuoy,
  LineChart,
  LogOut,
  ShieldCheck,
  TrendingUp,
  User,
  UserPlus,
  Wallet,
} from "lucide-react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { INVESTMENT_NAV } from "@/components/dashboard/investment/investment-nav";
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

// Groupes de navigation de l'espace client (retour client : "les choses sont un peu trop
// mélangées") — au lieu d'une liste plate de 11 entrées, quatre familles lisibles : Mon
// argent, Financement, Investissement (section autonome avec ses propres sous-pages) et
// Mon compte. Source unique partagée par la sidebar (avec libellés de groupe et
// sous-liens Investissement) et le repli mobile (à plat, Investissement en un seul lien —
// la section porte sa propre navigation locale, cf. InvestmentSectionNav).
type NavGroup = {
  id: string;
  label?: string;
  // Groupe "Investissement" : mis en avant (liseré or) car c'est un espace à part entière.
  featured?: boolean;
  items: NavSection[];
};

function useClientNavGroups(isBusiness: boolean): NavGroup[] {
  const t = useTranslations("DashboardShell.sidebar");
  const tInvest = useTranslations("Dashboard.investmentSpace");
  return [
    {
      id: "overview",
      items: [
        { href: "/dashboard", label: t("client.home"), icon: LayoutGrid },
        { href: "/dashboard/marche", label: t("client.market"), icon: TrendingUp },
      ],
    },
    {
      id: "money",
      label: t("groups.money"),
      items: [
        { href: "/dashboard/solde", label: t("client.balance"), icon: Wallet },
        { href: "/dashboard/cartes", label: t("client.cards"), icon: CreditCard },
        { href: "/dashboard/historique", label: t("client.history"), icon: History },
      ],
    },
    {
      id: "financing",
      label: t("groups.financing"),
      items: [
        { href: "/dashboard/credit", label: t("client.credit"), icon: HandCoins },
        // Réservé aux comptes BUSINESS (cf. AccountType) — masqué pour un compte
        // particulier, qui n'a de toute façon pas accès au crédit direct (cf.
        // BusinessAccountGuard côté API).
        ...(isBusiness
          ? [{ href: "/dashboard/credit-direct", label: t("client.directCredit"), icon: Briefcase }]
          : []),
      ],
    },
    {
      id: "investing",
      label: t("groups.investing"),
      featured: true,
      // Ouvert à tous les comptes vérifiés (particulier ET business, cf. §2H CLAUDE.md).
      items: INVESTMENT_NAV.map(({ key, href, icon }) => ({
        href,
        label: tInvest(`nav.${key}`),
        icon,
      })),
    },
    {
      id: "account",
      label: t("groups.account"),
      items: [
        { href: "/dashboard/profil", label: t("client.profile"), icon: User },
        { href: "/dashboard/kyc", label: t("client.kyc"), icon: FileCheck2 },
        { href: "/dashboard/support", label: t("client.support"), icon: LifeBuoy },
      ],
    },
  ];
}

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

// Pendant de SidebarLogoutButton pour le repli mobile — même gabarit pilule que NavLink,
// en dernière position de la bande défilante (la sidebar verticale n'existe pas < lg).
function MobileLogoutButton() {
  const tMenu = useTranslations("Dashboard.accountMenu");
  const { logout } = useDashboard();
  return (
    <button
      type="button"
      onClick={() => void logout()}
      className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <LogOut className="size-3.5" />
      {tMenu("logout")}
    </button>
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
        "group relative flex items-center gap-3 rounded-xl py-2 pr-3 pl-3.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      <Icon className={cn("size-4 shrink-0", isActive ? "text-sidebar-primary" : "text-muted-foreground/70 group-hover:text-sidebar-primary/80")} />
      {label}
    </LinkComponent>
  );
}

// Déconnexion — même gabarit visuel que SidebarNavLink (icône + libellé, même
// espacement) pour rester cohérente avec les autres sections plutôt que ressortir comme
// un contrôle à part (retour client : "le bouton déconnexion doit venir en bas à gauche
// avec les autres sections", au lieu de la barre supérieure où il vivait jusqu'ici).
function SidebarLogoutButton() {
  const tMenu = useTranslations("Dashboard.accountMenu");
  const { logout } = useDashboard();
  return (
    <button
      type="button"
      onClick={() => void logout()}
      className="group flex w-full items-center gap-3 rounded-lg py-2 pr-3 pl-3.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
    >
      <LogOut className="size-4 shrink-0 text-muted-foreground/70 group-hover:text-sidebar-primary/80" />
      {tMenu("logout")}
    </button>
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

  const groups = useClientNavGroups(isBusiness);

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
          <p className="font-heading text-[15px] leading-none font-semibold tracking-[-0.01em] text-sidebar-foreground">Hentsch Credit</p>
          <p className="mt-1.5 text-[11px] tracking-[0.04em] text-muted-foreground uppercase">{t("subtitle")}</p>
        </div>
      </Link>

      <nav aria-label={t("clientNavAriaLabel")} className="flex flex-col gap-5">
        {groups.map((group) => (
          <div
            key={group.id}
            className={cn(
              "flex flex-col gap-1",
              group.featured && "rounded-xl border border-sidebar-primary/25 bg-sidebar-accent/30 p-1.5",
            )}
          >
            {group.label && (
              <span
                className={cn(
                  "px-3.5 pb-1 text-xs font-medium",
                  group.featured ? "text-sidebar-primary" : "text-muted-foreground",
                )}
              >
                {group.label}
              </span>
            )}
            {group.items.map((section) => (
              <SidebarNavLink key={section.href} {...section} isActive={pathname === section.href} />
            ))}
          </div>
        ))}
      </nav>

      {/* Pousse tout ce qui suit (back-office éventuel + déconnexion) en bas de la
          sidebar, quel que soit le rôle du compte — la déconnexion doit toujours rester
          la dernière section, jamais isolée dans la barre supérieure (retour client). */}
      <div className="mt-auto flex flex-col gap-1">
        {isAdmin && (
          <nav
            aria-label={t("backofficeNavAriaLabel")}
            className="flex flex-col gap-1 border-t border-sidebar-border pt-5 pb-1"
          >
            <span className="px-3.5 pb-1 text-xs font-medium text-muted-foreground">
              {t("backoffice.label")}
            </span>
            {BACKOFFICE_SECTIONS.map((section) => (
              <SidebarNavLink key={section.href} {...section} isActive={pathname === section.href} />
            ))}
          </nav>
        )}
        <div className="border-t border-sidebar-border pt-1">
          <SidebarLogoutButton />
        </div>
      </div>
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

  // À plat sur mobile : Investissement en UN seul lien (la section a sa propre barre de
  // navigation locale), tous les autres groupes dépliés dans l'ordre de la sidebar.
  const groups = useClientNavGroups(isBusiness);
  const tInvest = useTranslations("Dashboard.investmentSpace");
  const CLIENT_SECTIONS: NavSection[] = groups.flatMap((group) =>
    group.id === "investing"
      ? [{ href: "/dashboard/investissement", label: tInvest("title"), icon: LineChart }]
      : group.items,
  );
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
        <NavLink
          key={section.href}
          {...section}
          isActive={
            section.href === "/dashboard/investissement"
              ? pathname.startsWith("/dashboard/investissement")
              : pathname === section.href
          }
        />
      ))}
      <MobileLogoutButton />
    </nav>
  );
}
