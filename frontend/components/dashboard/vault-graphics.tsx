// Filigrane coffre-fort grand format — même glyphe que VaultBadgeIcon ci-dessous, agrandi
// et discret, posé en fond (cf. app/dashboard/layout.tsx et app/page.tsx). `className`
// pilote taille/couleur/opacité/rotation depuis l'appelant.
export function VaultWatermarkSvg({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="12" cy="12" r="5" />
      <path d="M12 7v10M7 12h10" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

// Petit glyphe de coffre-fort en SVG pur, utilisé dans le badge dégradé de la carte
// "Gage verrouillé" (cf. balance-cards.tsx).
export function VaultBadgeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className} aria-hidden>
      <rect x="2.5" y="2.5" width="19" height="19" rx="3" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <line x1="12" y1="6.5" x2="12" y2="8.4" />
      <line x1="12" y1="15.6" x2="12" y2="17.5" />
      <line x1="6.5" y1="12" x2="8.4" y2="12" />
      <line x1="15.6" y1="12" x2="17.5" y2="12" />
    </svg>
  );
}
