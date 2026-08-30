// Formatage — zone admin uniquement. Les exemples du brief sont en euros (marché
// domestique des dossiers de crédit démontrés) ; distinct du ledger interne (toujours
// USD, cf. lib/format.ts) qui reste utilisé par l'espace client.

const eurFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatEur(value: number): string {
  return eurFormatter.format(value);
}

const eurCompactFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatEurCompact(value: number): string {
  return eurCompactFormatter.format(value);
}

export function formatPercentPlain(value: number): string {
  return `${value.toFixed(1).replace(".", ",")}%`;
}

export function initialsFrom(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}
