"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "@/components/dashboard/dashboard-context";

// Garde d'accès à la zone admin — même principe que AuthGate (espace client), avec une
// exigence supplémentaire : rôle ADMIN. Défense en profondeur : l'API rejette de toute
// façon chaque appel back-office pour un compte non-ADMIN (cf. AdminGuard), mais sans ce
// garde un client verrait une coquille d'interface admin vide plutôt qu'une redirection
// propre.
export function AdminAuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { selectedUser, authLoading } = useDashboard();
  const isAdmin = selectedUser?.role === "ADMIN";

  useEffect(() => {
    if (authLoading) return;
    if (!selectedUser) {
      router.replace("/login");
      return;
    }
    if (!isAdmin) {
      router.replace("/dashboard");
    }
  }, [authLoading, selectedUser, isAdmin, router]);

  if (authLoading || !selectedUser || !isAdmin) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-foreground/10 border-t-primary" />
          <p className="text-xs text-muted-foreground">Chargement de l&apos;espace back-office…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
