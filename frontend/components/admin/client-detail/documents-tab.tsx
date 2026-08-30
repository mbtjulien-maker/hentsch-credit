import { Download, Eye, FileText, RefreshCw, Send } from "lucide-react";
import { AdminCard, AdminCardHeader, AdminEmptyState } from "@/components/admin/admin-ui";
import { DocumentStatusBadge } from "@/components/admin/status-badge";
import { ADMIN_BTN_SECONDARY, ADMIN_FOCUS_RING } from "@/lib/admin-theme";
import type { AdminClient, AdminDocument } from "@/lib/admin-mock-data";
import { cn } from "@/lib/utils";

const CATEGORIES: AdminDocument["category"][] = ["Identité", "Domicile", "Revenus", "Banque", "Crédit"];

function DocumentRow({ doc }: { doc: AdminDocument }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-foreground/[0.06] px-5 py-2.5 first:border-t-0">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-foreground/[0.04] text-muted-foreground">
          <FileText className="size-[15px]" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] text-foreground">{doc.name}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {doc.type} · {doc.size} · déposé le {doc.depositedAt}
            {doc.verifiedBy && ` · vérifié par ${doc.verifiedBy} le ${doc.verifiedAt}`}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <DocumentStatusBadge status={doc.status} />
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            aria-label="Voir"
            className={cn("flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground", ADMIN_FOCUS_RING)}
          >
            <Eye className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label="Télécharger"
            className={cn("flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground", ADMIN_FOCUS_RING)}
          >
            <Download className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label="Remplacer"
            className={cn("flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground", ADMIN_FOCUS_RING)}
          >
            <RefreshCw className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Onglet "Documents" — section 11 du brief : gestion documentaire réelle, regroupée par
// catégorie métier (identité / domicile / revenus / banque / crédit), chaque document
// portant sa propre traçabilité de vérification.
export function DocumentsTab({ client }: { client: AdminClient }) {
  return (
    <div className="flex flex-col gap-5">
      {CATEGORIES.map((category) => {
        const docs = client.documents.filter((d) => d.category === category);
        if (docs.length === 0) return null;
        return (
          <AdminCard key={category} padded={false}>
            <div className="px-5 pt-4 pb-1">
              <AdminCardHeader title={category.toUpperCase()} description={`${docs.length} document${docs.length > 1 ? "s" : ""}`} />
            </div>
            <div>
              {docs.map((doc) => (
                <DocumentRow key={doc.id} doc={doc} />
              ))}
            </div>
          </AdminCard>
        );
      })}

      {client.documents.length === 0 && (
        <AdminCard>
          <AdminEmptyState icon={<FileText className="size-8 text-muted-foreground" />} title="Aucun document déposé" />
        </AdminCard>
      )}

      <button type="button" className={cn(ADMIN_BTN_SECONDARY, "self-start")}>
        <Send className="size-3.5 text-primary" />
        Demander un nouveau document
      </button>
    </div>
  );
}
