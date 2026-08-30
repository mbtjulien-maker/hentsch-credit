"use client";

import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useDashboard } from "@/components/dashboard/dashboard-context";

// Erreur de fond commune à toutes les pages : si la session elle-même ne charge pas
// (panne réseau/serveur — pas un simple "non connecté", cf. DashboardProvider), aucune
// section ne pourra fonctionner peu importe la route affichée.
export function AuthLoadError() {
  const { authError } = useDashboard();
  if (!authError) return null;

  return (
    <Alert variant="destructive">
      <AlertTriangle className="size-4" />
      <AlertTitle>Impossible de vérifier votre session</AlertTitle>
      <AlertDescription>{authError}</AlertDescription>
    </Alert>
  );
}
