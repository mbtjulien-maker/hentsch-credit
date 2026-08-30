"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, UserX } from "lucide-react";
import { ClientDetailView } from "@/components/admin/client-detail/client-detail-view";
import { getAdminClient, type AdminClient } from "@/lib/admin-mock-data";
import { api, ApiError } from "@/lib/api";

// Un identifiant réel (UUID, cf. backend/src/admin-clients) déclenche un vrai appel API ;
// un code de démonstration ("CL-004582", cf. lib/admin-mock-data.ts) reste résolu
// localement — les deux routes cohabitent tant que seule la fiche client 360 est
// reconnectée à la vraie base (cf. app/admin/clients/page.tsx, qui ne lie plus que des
// UUID réels, mais d'autres écrans admin — dashboard, crédits, comptes… — renvoient
// encore vers des codes de démonstration).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Fiche client 360 — cf. brief UI/UX admin §4-21. Même convention que les autres routes
// dynamiques de l'app (useParams côté client, cf. paiement-simule/[paymentId]) plutôt que
// des PageProps serveur.
export default function AdminClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const isReal = UUID_RE.test(id);

  const [realClient, setRealClient] = useState<AdminClient | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReal) return;
    let ignore = false;
    api
      .getAdminClientDetail(id)
      .then((data) => {
        if (!ignore) {
          setRealClient(data);
          setLoadedId(id);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
      });
    return () => {
      ignore = true;
    };
  }, [id, isReal]);

  const client = isReal ? realClient : getAdminClient(id);
  const loading = isReal && loadedId !== id && !error;

  if (isReal && loading) {
    return <p className="py-20 text-center text-sm text-muted-foreground">Chargement du dossier…</p>;
  }

  if (isReal && error) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <AlertTriangle className="size-8 text-destructive" />
        <p className="text-sm font-medium text-foreground">Impossible de charger ce dossier</p>
        <p className="text-xs text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <UserX className="size-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Client introuvable</p>
        <p className="text-xs text-muted-foreground">Aucun client ne correspond à l&apos;identifiant « {id} ».</p>
        <Link href="/admin/clients" className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
          <ArrowLeft className="size-3.5" />
          Retour à la liste des clients
        </Link>
      </div>
    );
  }

  return <ClientDetailView client={client} onClientUpdated={isReal ? setRealClient : undefined} />;
}
