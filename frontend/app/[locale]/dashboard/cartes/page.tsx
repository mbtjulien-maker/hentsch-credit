import { CardsSection } from "@/components/dashboard/cards-section";

// Système de carte "à venir prochainement" (cf. §6 CLAUDE.md entrée #46) — plus de fetch
// de cartes ici, CardsSection n'affiche plus qu'une mention d'indisponibilité.
export default function CartesPage() {
  return <CardsSection />;
}
