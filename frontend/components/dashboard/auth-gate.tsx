"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard } from "@/components/dashboard/dashboard-context";

// Protège l'espace client : redirige vers /login tant qu'aucune session valide n'est
// chargée. Défense en profondeur en plus des gardes côté API (JwtAuthGuard) — sans ça,
// un visiteur non connecté verrait un dashboard vide/cassé plutôt qu'un écran de
// connexion.
export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { selectedUser, authLoading } = useDashboard();

  useEffect(() => {
    if (!authLoading && !selectedUser) {
      router.replace("/login");
    }
  }, [authLoading, selectedUser, router]);

  if (authLoading || !selectedUser) {
    return (
      <div className="flex min-h-[60vh] w-full items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  return <>{children}</>;
}
