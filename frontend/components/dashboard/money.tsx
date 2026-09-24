import { cn } from "@/lib/utils";

const numberFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const SIZE_CLASSES = {
  // Chiffre phare (valeur du portefeuille)
  hero: { integer: "text-5xl", decimals: "text-2xl", currency: "text-sm" },
  // Carte de solde
  lg: { integer: "text-4xl", decimals: "text-xl", currency: "text-xs" },
  // Tuile secondaire
  md: { integer: "text-2xl", decimals: "text-base", currency: "text-[11px]" },
} as const;

// Montant en trois niveaux de lecture : la partie entière porte l'information (grande,
// en Rajdhani), les centimes et le code de devise restent lisibles mais en retrait. Le
// "$US" collé au chiffre du formateur français alourdissait chaque solde ; ici la devise
// est un code ISO discret, aligné sur la ligne de base. Espaces des milliers remplacés par
// une espace insécable ordinaire (Rajdhani n'a pas U+202F, cf. lib/format.ts).
export function Money({
  value,
  currency = "USD",
  size = "lg",
  className,
}: {
  value: string | number;
  currency?: string;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}) {
  const parts = numberFormatter.formatToParts(Number(value));
  const sign = parts.find((p) => p.type === "minusSign")?.value ?? "";
  const integer = parts
    .filter((p) => p.type === "integer" || p.type === "group")
    .map((p) => p.value)
    .join("")
    .replace(/[  ]/g, " ");
  const fraction = parts.find((p) => p.type === "fraction")?.value ?? "00";
  const s = SIZE_CLASSES[size];

  return (
    <span
      className={cn("inline-flex flex-wrap items-baseline gap-x-1.5 font-heading leading-none", className)}
      aria-label={`${sign}${integer},${fraction} ${currency}`}
    >
      <span aria-hidden className="inline-flex items-baseline">
        <span className={cn("font-semibold tracking-tight", s.integer)}>
          {sign}
          {integer}
        </span>
        <span className={cn("font-medium text-muted-foreground", s.decimals)}>,{fraction}</span>
      </span>
      <span
        aria-hidden
        className={cn("font-medium tracking-[0.08em] text-muted-foreground uppercase", s.currency)}
      >
        {currency}
      </span>
    </span>
  );
}
