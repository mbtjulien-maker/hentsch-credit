"use client";

import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { CardsSection } from "@/components/dashboard/cards-section";
import { useSectionData } from "@/components/dashboard/use-section-data";
import { api } from "@/lib/api";

export default function CartesPage() {
  const { data: cards, loading, error } = useSectionData((userId) => api.listCards(userId));

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertTitle>Impossible de charger les cartes</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (loading || !cards) {
    return <Skeleton className="h-64 w-full" />;
  }

  return <CardsSection cards={cards} />;
}
