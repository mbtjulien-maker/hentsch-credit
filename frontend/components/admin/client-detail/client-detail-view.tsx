"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { IdentityHeader } from "@/components/admin/client-detail/identity-header";
import { QuickActionsPanel } from "@/components/admin/client-detail/quick-actions";
import { OverviewTab } from "@/components/admin/client-detail/overview-tab";
import { PersonalTab } from "@/components/admin/client-detail/personal-tab";
import { FinancialTab } from "@/components/admin/client-detail/financial-tab";
import { DocumentsTab } from "@/components/admin/client-detail/documents-tab";
import { KycTab } from "@/components/admin/client-detail/kyc-tab";
import { RiskDecisionTab } from "@/components/admin/client-detail/risk-decision-tab";
import { ContractTab } from "@/components/admin/client-detail/contract-tab";
import { HistoryTab } from "@/components/admin/client-detail/history-tab";
import { NotesSupportTab } from "@/components/admin/client-detail/notes-support-tab";
import type { AdminClient } from "@/lib/admin-mock-data";
import { ADMIN_FOCUS_RING } from "@/lib/admin-theme";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "overview", label: "Vue d'ensemble" },
  { key: "personal", label: "Personnel" },
  { key: "financial", label: "Financier" },
  { key: "documents", label: "Documents" },
  { key: "kyc", label: "KYC" },
  { key: "risk", label: "Risque & Décision" },
  { key: "contract", label: "Contrat" },
  { key: "history", label: "Historique" },
  { key: "notes", label: "Notes & Support" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// Bande d'onglets défilable — 9 sections ne tiennent pas toujours sur une largeur
// d'écran modeste (fenêtre non maximisée, laptop 13"). `overflow-x-auto` seul masquait
// silencieusement les derniers onglets (dont "Contrat") sans aucun indice qu'il y avait
// plus de contenu à faire défiler — bug réel remonté par l'utilisateur. Cette version
// affiche un dégradé de bord + une flèche cliquable dès qu'il reste du contenu caché de
// ce côté, et fait défiler automatiquement l'onglet actif dans la vue.
function TabStrip({ tab, onSelect }: { tab: TabKey; onSelect: (key: TabKey) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateScrollState() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(el);
    el.addEventListener("scroll", updateScrollState, { passive: true });
    return () => {
      resizeObserver.disconnect();
      el.removeEventListener("scroll", updateScrollState);
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    const active = el?.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [tab]);

  function scrollBy(amount: number) {
    scrollRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  }

  return (
    <div className="relative border-b border-foreground/[0.07]">
      <div ref={scrollRef} className="flex gap-5 overflow-x-auto scroll-smooth">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            data-active={tab === t.key}
            onClick={() => onSelect(t.key)}
            className={cn(
              "relative shrink-0 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors",
              ADMIN_FOCUS_RING,
              tab === t.key ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            <span
              className={cn(
                "absolute inset-x-0 -bottom-px h-[2px] rounded-full transition-colors",
                tab === t.key ? "bg-primary" : "bg-transparent",
              )}
            />
          </button>
        ))}
      </div>

      {canScrollLeft && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-background to-transparent" />
          <button
            type="button"
            aria-label="Défiler vers les onglets précédents"
            onClick={() => scrollBy(-160)}
            className={cn(
              "absolute top-1/2 left-0 flex size-6 -translate-y-1/2 items-center justify-center rounded-full border border-foreground/[0.1] bg-card text-foreground shadow-md transition-colors hover:bg-foreground/[0.08]",
              ADMIN_FOCUS_RING,
            )}
          >
            <ChevronLeft className="size-3.5" />
          </button>
        </>
      )}

      {canScrollRight && (
        <>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent" />
          <button
            type="button"
            aria-label="Défiler vers les onglets suivants"
            onClick={() => scrollBy(160)}
            className={cn(
              "absolute top-1/2 right-0 flex size-6 -translate-y-1/2 items-center justify-center rounded-full border border-foreground/[0.1] bg-card text-foreground shadow-md transition-colors hover:bg-foreground/[0.08]",
              ADMIN_FOCUS_RING,
            )}
          >
            <ChevronRight className="size-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

// Coquille de la fiche client 360 — en-tête d'identité persistant + colonne centrale à
// onglets (regroupe les 18 sections du brief sans jamais les cacher derrière une
// simplification) + colonne d'actions rapides toujours visible. Onglets construits ici
// (pas via components/ui/tabs.tsx, dont la palette est celle du thème client clair) pour
// rester cohérent avec la palette "Dark Premium Fintech" de tout l'admin.
export function ClientDetailView({
  client,
  onClientUpdated,
}: {
  client: AdminClient;
  // Renseigné uniquement par la page qui a chargé une vraie fiche (cf.
  // app/admin/clients/[id]/page.tsx) — permet aux formulaires d'édition (Personnel,
  // Financier) de remonter la fiche fraîchement enregistrée sans recharger la page.
  // Absent pour une fiche de démonstration : les onglets n'affichent alors aucune action
  // d'édition (cf. PersonalTab/FinancialTab, conditionnées sur client.userId).
  onClientUpdated?: (client: AdminClient) => void;
}) {
  const [tab, setTab] = useState<TabKey>("overview");

  return (
    <div className="flex flex-col gap-5">
      <IdentityHeader client={client} />

      <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <TabStrip tab={tab} onSelect={setTab} />

          {tab === "overview" && <OverviewTab client={client} />}
          {tab === "personal" && <PersonalTab client={client} onClientUpdated={onClientUpdated} />}
          {tab === "financial" && <FinancialTab client={client} onClientUpdated={onClientUpdated} />}
          {tab === "documents" && <DocumentsTab client={client} />}
          {tab === "kyc" && <KycTab client={client} onClientUpdated={onClientUpdated} />}
          {tab === "risk" && <RiskDecisionTab client={client} />}
          {tab === "contract" && <ContractTab client={client} />}
          {tab === "history" && <HistoryTab client={client} />}
          {tab === "notes" && <NotesSupportTab client={client} />}
        </div>

        <div className="lg:sticky lg:top-[4.75rem] lg:self-start">
          <QuickActionsPanel client={client} />
        </div>
      </div>
    </div>
  );
}
