"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  ClipboardCheck,
  FilePlus,
  LogOut,
  MessageSquare,
  Plus,
  Search,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { ADMIN_CARD_RAISED, ADMIN_DIVIDER, ADMIN_FOCUS_RING } from "@/lib/admin-theme";
import { ADMIN_CLIENTS } from "@/lib/admin-mock-data";
import { ThemeToggle } from "@/components/theme-toggle";

// Hook minimal "fermer au clic extérieur" — la zone admin n'a pas de composant
// dropdown-menu partagé (cf. components/ui/*, absent) ; plutôt que d'en importer un pour
// trois usages, un utilitaire local suffit et reste lisible.
function useClickOutside<T extends HTMLElement>(onOutside: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onOutside]);
  return ref;
}

const NOTIFICATIONS = [
  { id: "n1", title: "Nouveau dossier CR-2026-008921", detail: "Jean Dupont, en analyse", time: "il y a 12 min" },
  { id: "n2", title: "Document en attente de vérification", detail: "Chiara Bianchi, devis travaux", time: "il y a 1 h" },
  { id: "n3", title: "Alerte KYC", detail: "Marc Lefevre, document refusé", time: "il y a 3 h" },
];

const MESSAGES = [
  { id: "m1", from: "Support client", detail: "3 tickets ouverts nécessitent une réponse", time: "09:40" },
  { id: "m2", from: "Conformité", detail: "Révision KYC hebdomadaire disponible", time: "08:15" },
];

function IconPopoverButton({
  icon: Icon,
  badge,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground",
          ADMIN_FOCUS_RING,
        )}
      >
        <Icon className="size-[17px]" />
        {!!badge && badge > 0 && (
          <span className="absolute top-1 right-1 flex size-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground">
            {badge}
          </span>
        )}
      </button>
      {open && (
        <div className={cn(ADMIN_CARD_RAISED, "absolute right-0 z-30 mt-2 w-80 overflow-hidden p-0")}>{children}</div>
      )}
    </div>
  );
}

function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));

  const results =
    query.trim().length > 0
      ? ADMIN_CLIENTS.filter((c) => {
          const haystack = `${c.firstName} ${c.lastName} ${c.id} ${c.creditRequest.id}`.toLowerCase();
          return haystack.includes(query.toLowerCase());
        }).slice(0, 6)
      : [];

  return (
    <div className="relative w-full max-w-md" ref={ref}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-[15px] -translate-y-1/2 text-muted-foreground" />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Rechercher un client, un dossier, un document…"
        className={cn(
          "w-full rounded-md border border-foreground/[0.08] bg-foreground/[0.03] py-[7px] pr-3 pl-9 text-[13px] text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/40",
          ADMIN_FOCUS_RING,
        )}
      />
      {open && results.length > 0 && (
        <div className={cn(ADMIN_CARD_RAISED, "absolute left-0 z-30 mt-2 w-full overflow-hidden p-0")}>
          {results.map((c) => (
            <Link
              key={c.id}
              href={`/admin/clients/${c.id}`}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center justify-between gap-3 px-4 py-2.5 text-[13px] hover:bg-foreground/[0.04]",
                "border-b",
                ADMIN_DIVIDER,
                "last:border-b-0",
              )}
            >
              <span className="text-foreground">
                {c.firstName} {c.lastName}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">{c.id}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function NewActionMenu() {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));

  const actions = [
    { icon: UserPlus, label: "Nouveau client", href: "/admin/clients" },
    { icon: FilePlus, label: "Nouveau dossier de crédit", href: "/admin/credits/demandes" },
    { icon: ClipboardCheck, label: "Nouvelle vérification KYC", href: "/admin/kyc" },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 rounded-md bg-primary px-3 py-[7px] text-[13px] font-medium text-primary-foreground transition-colors hover:bg-chart-2",
          ADMIN_FOCUS_RING,
        )}
      >
        <Plus className="size-3.5" />
        Nouvelle action
        <ChevronDown className="size-3.5" />
      </button>
      {open && (
        <div className={cn(ADMIN_CARD_RAISED, "absolute right-0 z-30 mt-2 w-64 overflow-hidden p-1.5")}>
          {actions.map((a) => (
            <Link
              key={a.label}
              href={a.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-foreground transition-colors hover:bg-foreground/[0.05]"
            >
              <a.icon className="size-4 text-primary" />
              {a.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminTopbar() {
  const { selectedUser, logout } = useDashboard();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useClickOutside<HTMLDivElement>(() => setProfileOpen(false));

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-4 border-b border-foreground/[0.07] bg-background/95 px-5 backdrop-blur-md">
      <GlobalSearch />

      <div className="ml-auto flex items-center gap-1.5">
        <NewActionMenu />

        <div className="mx-1.5 h-5 w-px bg-foreground/[0.08]" />

        <ThemeToggle className="size-8 rounded-md border-none bg-transparent hover:bg-foreground/[0.05]" />

        <IconPopoverButton icon={Bell} badge={NOTIFICATIONS.length} label="Notifications">
          <div className="border-b border-foreground/[0.07] px-4 py-3">
            <p className="text-[13px] font-semibold text-foreground">Notifications</p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {NOTIFICATIONS.map((n) => (
              <div key={n.id} className="border-b border-foreground/[0.05] px-4 py-3 last:border-b-0">
                <p className="text-[13px] text-foreground">{n.title}</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">{n.detail}</p>
                <p className="mt-1 text-[10.5px] text-muted-foreground">{n.time}</p>
              </div>
            ))}
          </div>
        </IconPopoverButton>

        <IconPopoverButton icon={MessageSquare} badge={MESSAGES.length} label="Messages">
          <div className="border-b border-foreground/[0.07] px-4 py-3">
            <p className="text-[13px] font-semibold text-foreground">Messages</p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {MESSAGES.map((m) => (
              <div key={m.id} className="border-b border-foreground/[0.05] px-4 py-3 last:border-b-0">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-medium text-foreground">{m.from}</p>
                  <p className="text-[10.5px] text-muted-foreground">{m.time}</p>
                </div>
                <p className="mt-0.5 text-[12px] text-muted-foreground">{m.detail}</p>
              </div>
            ))}
          </div>
        </IconPopoverButton>

        <div className="mx-1.5 h-5 w-px bg-foreground/[0.08]" />

        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            className={cn(
              "flex items-center gap-2.5 rounded-md py-1 pr-2 pl-1 transition-colors hover:bg-foreground/[0.05]",
              ADMIN_FOCUS_RING,
            )}
          >
            <div className="flex size-7 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
              {(selectedUser?.email ?? "A").slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-[12.5px] leading-none font-medium text-foreground">{selectedUser?.email ?? "Administrateur"}</p>
              <p className="mt-1 text-[10.5px] leading-none text-muted-foreground">Administrateur</p>
            </div>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </button>
          {profileOpen && (
            <div className={cn(ADMIN_CARD_RAISED, "absolute right-0 z-30 mt-2 w-56 overflow-hidden p-1.5")}>
              <Link
                href="/dashboard"
                onClick={() => setProfileOpen(false)}
                className="block rounded-md px-3 py-2 text-[13px] text-foreground transition-colors hover:bg-foreground/[0.05]"
              >
                Retour à l&apos;espace client
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="size-4" />
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
