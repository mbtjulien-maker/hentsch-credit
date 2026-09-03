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
