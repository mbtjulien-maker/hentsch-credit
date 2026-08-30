"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AdminCard, AdminCardHeader } from "@/components/admin/admin-ui";
import { DocumentStatusBadge } from "@/components/admin/status-badge";
import { ADMIN_CLIENTS, type DocumentStatus } from "@/lib/admin-mock-data";
import { ADMIN_FOCUS_RING } from "@/lib/admin-theme";
import { cn } from "@/lib/utils";

const STATUS_FILTERS: { value: DocumentStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Tous" },
  { value: "TO_VERIFY", label: "À vérifier" },
  { value: "VERIFIED", label: "Vérifiés" },
  { value: "REJECTED", label: "Refusés" },
  { value: "PENDING", label: "En attente" },
];

// Vue "Documents" — vue transverse de tous les documents déposés, tous clients confondus
// (agrégation de AdminClient.documents), filtrable par statut. Chaque ligne renvoie vers
// l'onglet Documents de la fiche client concernée.
export default function AdminDocumentsPage() {
  const [filter, setFilter] = useState<DocumentStatus | "ALL">("TO_VERIFY");

  const rows = useMemo(
    () =>
      ADMIN_CLIENTS.flatMap((c) => c.documents.map((doc) => ({ client: c, doc }))).filter(
        ({ doc }) => filter === "ALL" || doc.status === filter,
      ),
    [filter],
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[19px] font-semibold tracking-[-0.01em] text-foreground">Documents</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">Gestion documentaire transverse, tous dossiers confondus.</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-md px-2.5 py-1 text-[12.5px] font-medium transition-colors",
              filter === f.value ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
              ADMIN_FOCUS_RING,
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <AdminCard padded={false}>
        <div className="px-5 pt-5">
          <AdminCardHeader title="Documents" description={`${rows.length} documents`} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-foreground/[0.07] text-[10.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
                <th className="px-5 py-2.5 font-medium text-[11px]">Document</th>
                <th className="px-5 py-2.5 font-medium text-[11px]">Catégorie</th>
                <th className="px-5 py-2.5 font-medium text-[11px]">Client</th>
                <th className="px-5 py-2.5 font-medium text-[11px]">Déposé le</th>
                <th className="px-5 py-2.5 font-medium text-[11px]">Statut</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ client, doc }) => (
                <tr key={doc.id} className="border-b border-foreground/[0.05] last:border-b-0 hover:bg-foreground/[0.02]">
                  <td className="px-5 py-2.5 text-foreground">{doc.name}</td>
                  <td className="px-5 py-2.5 text-muted-foreground">{doc.category}</td>
                  <td className="px-5 py-2.5">
                    <Link href={`/admin/clients/${client.id}`} className="text-foreground hover:underline">
                      {client.firstName} {client.lastName}
                    </Link>
                  </td>
                  <td className="px-5 py-2.5 text-muted-foreground">{doc.depositedAt}</td>
                  <td className="px-5 py-2.5">
                    <DocumentStatusBadge status={doc.status} />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    Aucun document dans cette catégorie.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </div>
  );
}
