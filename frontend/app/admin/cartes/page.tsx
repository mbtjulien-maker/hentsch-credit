import Link from "next/link";
import { CreditCard as CardIcon } from "lucide-react";
import { AdminCard } from "@/components/admin/admin-ui";
import { StatusPill } from "@/components/admin/status-badge";
import { ADMIN_CLIENTS } from "@/lib/admin-mock-data";
import { formatEur } from "@/lib/admin-format";

// Vue "Cartes" — cartes virtuelles/physiques associées à la ligne de crédit de chaque
// client. Le brief ne détaille pas cette section au même niveau que la fiche client
// (§4-21) : construite comme une liste réelle mais plus légère, dérivée du dossier de
// crédit de chaque client (limite = ligne accordée) plutôt que d'un modèle de données
// séparé. Émission réelle : intégration Stripe Issuing / Marqeta (cf. CLAUDE.md §3).
export default function AdminCardsPage() {
  const cards = ADMIN_CLIENTS.map((c, i) => {
    const last4 = String(1000 + i * 137).slice(-4);
    const limit = Math.round((c.creditRequest.amountRequested / 5) / 10) * 10;
    const active = c.accountStatus === "ACTIVE" && c.kycStatus === "VERIFIED";
    return { client: c, last4, limit, active };
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-foreground">Cartes</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {cards.length} cartes émises ou en cours d&apos;émission, plafond dérivé de la ligne de crédit accordée.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ client, last4, limit, active }) => (
          <AdminCard key={client.id} className="p-4">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex size-8 items-center justify-center rounded-md bg-foreground/[0.05] text-primary">
                <CardIcon className="size-4" />
              </div>
              <StatusPill tone={active ? "green" : "neutral"} label={active ? "Active" : "Suspendue"} />
            </div>
            <p className="font-mono text-[14px] tracking-[0.08em] text-foreground">•••• •••• •••• {last4}</p>
            <Link href={`/admin/clients/${client.id}`} className="mt-2 block text-[12.5px] text-muted-foreground hover:text-foreground hover:underline">
              {client.firstName} {client.lastName}
            </Link>
            <div className="mt-3.5 flex items-center justify-between border-t border-foreground/[0.06] pt-3">
              <span className="text-[10.5px] font-medium tracking-[0.02em] text-muted-foreground uppercase">Plafond mensuel</span>
              <span className="text-[13px] font-medium tabular-nums text-foreground">{formatEur(limit)}</span>
            </div>
          </AdminCard>
        ))}
      </div>
    </div>
  );
}
