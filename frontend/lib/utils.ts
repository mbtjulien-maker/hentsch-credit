import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Style des cartes principales du dashboard (Solde, Gage, Ligne de crédit, Demander un
// crédit) — blanc plein sur fond gris #F8FAFC en clair ; graphite/obsidienne à bordure
// champagne très fine sous .dark (cf. app/dashboard/layout.tsx, palette "Dark Luxury
// Fintech" définie dans app/globals.css). Tokens sémantiques (bg-card/border/text-
// card-foreground) plutôt que hex directs : c'est justement ce qui permet à cette classe
// de basculer automatiquement avec le thème, sans doublon de règles. Utilités Tailwind
// directes (pas une classe custom en @layer components) pour que twMerge résolve
// correctement le conflit avec `bg-card`/`rounded-xl` déjà posés par défaut sur <Card>.
export const GLASS_CARD_BASE_CLASS =
  "rounded-2xl border border-border bg-card text-card-foreground"

// Variante avec interaction survol en CSS pur (transform/box-shadow/border-color natifs,
// aucune dépendance JS d'animation) — profondeur discrète au survol. Lift plus contenu et
// halo de bordure champagne (au lieu du bleu) sous .dark : une institution premium reste
// sobre dans ses micro-interactions.
export const GLASS_CARD_CLASS = `${GLASS_CARD_BASE_CLASS} transition-colors duration-200 hover:border-primary/40`
