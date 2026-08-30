"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  ChevronDown,
  ClipboardList,
  Cpu,
  CreditCard,
  FileText,
  Gauge,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  Receipt,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_FOCUS_RING } from "@/lib/admin-theme";

type LeafItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const TOP_ITEMS: LeafItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/comptes", label: "Comptes", icon: Banknote },
  { href: "/admin/cartes", label: "Cartes", icon: CreditCard },
];

const CREDIT_SUBITEMS: LeafItem[] = [
  { href: "/admin/credits/demandes", label: "Demandes de crédit", icon: ClipboardList },
  { href: "/admin/credits/dossiers", label: "Dossiers en cours", icon: FileText },
  { href: "/admin/credits/actifs", label: "Crédits actifs", icon: Receipt },
  { href: "/admin/credits/clotures", label: "Crédits clôturés", icon: FileText },
];

const BOTTOM_ITEMS: LeafItem[] = [
  { href: "/admin/deposit-intents", label: "Dépôts à valider", icon: Inbox },
  { href: "/admin/transactions", label: "Transactions", icon: Receipt },
  { href: "/admin/documents", label: "Documents", icon: FileText },
  { href: "/admin/kyc", label: "KYC / Conformité", icon: ShieldCheck },
  { href: "/admin/risque", label: "Risque & Scoring", icon: Gauge },
  { href: "/admin/support", label: "Support", icon: LifeBuoy },
  { href: "/admin/algorithme", label: "Algorithme de crédit", icon: Cpu },
  { href: "/admin/parametres", label: "Paramètres", icon: Settings },
];

const ALL_ITEMS: LeafItem[] = [...TOP_ITEMS, ...CREDIT_SUBITEMS, ...BOTTOM_ITEMS];

function NavItem({ href, label, icon: Icon, active }: LeafItem & { active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-md py-1.5 pr-3 pl-3 text-[13px] font-medium transition-colors",
        active ? "bg-foreground/[0.05] text-foreground" : "text-muted-foreground hover:bg-foreground/[0.02] hover:text-foreground",
        ADMIN_FOCUS_RING,
      )}
    >
      {active && <span className="absolute top-1/2 left-0 h-3.5 w-[2px] -translate-y-1/2 rounded-full bg-primary" />}
      <Icon className={cn("size-[15px] shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-primary/80")} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const creditActive = pathname.startsWith("/admin/credits");
  const [creditsOpen, setCreditsOpen] = useState<boolean>(true);

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r border-foreground/[0.07] bg-card px-3 py-5 lg:flex">
      <Link href="/admin" className={cn("flex items-center gap-2.5 rounded-md px-2 py-1", ADMIN_FOCUS_RING)}>
        <Image src="/brand/hentsch-mark.png" alt="" width={500} height={500} className="size-8 rounded-md" />
        <div>
          <h1 className="text-[13px] leading-none font-semibold tracking-[-0.01em] text-foreground">Hentsch Credit</h1>
          <p className="mt-1 text-[10.5px] tracking-[0.02em] text-muted-foreground uppercase">Back-office</p>
        </div>
      </Link>

      <nav aria-label="Navigation principale" className="flex flex-col gap-0.5">
        {TOP_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} active={pathname === item.href} />
        ))}

        <button
          type="button"
          onClick={() => setCreditsOpen((v) => !v)}
          aria-expanded={creditsOpen}
          className={cn(
            "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
            creditActive ? "text-foreground" : "text-muted-foreground hover:bg-foreground/[0.02] hover:text-foreground",
            ADMIN_FOCUS_RING,
          )}
        >
          <Receipt className={cn("size-[15px] shrink-0", creditActive ? "text-primary" : "text-muted-foreground")} />
          <span>Crédits</span>
          <ChevronDown className={cn("ml-auto size-3.5 text-muted-foreground transition-transform", creditsOpen && "rotate-180")} />
        </button>
        {creditsOpen && (
          <div className="ml-3.5 flex flex-col gap-0.5 border-l border-foreground/[0.07] pl-3">
            {CREDIT_SUBITEMS.map((item) => (
              <NavItem key={item.href} {...item} active={pathname === item.href} />
            ))}
          </div>
        )}

        <div className={cn("my-2 border-t", "border-foreground/[0.06]")} />

        {BOTTOM_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} active={pathname === item.href} />
        ))}
      </nav>

      <div className="mt-auto rounded-md border border-foreground/[0.06] px-3 py-2.5">
        <p className="text-[11px] font-medium text-muted-foreground">Environnement de démonstration</p>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
          Données clients fictives, à des fins de présentation de l&apos;interface.
        </p>
      </div>
    </aside>
  );
}

// Repli tablette/mobile (< lg) : la sidebar verticale n'a pas la place de s'afficher (cf.
// brief §24, "doit fonctionner sur tablette", desktop-priority) — bande horizontale
// défilable, toutes destinations à plat, sous la topbar.
export function AdminMobileNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigation back-office (mobile/tablette)"
      className="flex gap-1 overflow-x-auto border-b border-foreground/[0.07] bg-card px-3 py-2 lg:hidden"
    >
      {ALL_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
              active ? "bg-foreground/[0.08] text-foreground" : "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground",
            )}
          >
            <item.icon className={cn("size-3.5", active && "text-primary")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
