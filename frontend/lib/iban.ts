// Validation structurelle IBAN/BIC côté client — un simple indice visuel immédiat pour le
// formulaire de retrait SEPA/SWIFT (cf. wallet-actions.tsx), jamais la validation
// définitive : le backend revalide indépendamment via le paquet `validator`
// (`@IsIBAN()`/`@IsBIC()`, cf. backend/src/common/iban.util.ts) et c'est lui qui fait foi.
// Implémenté ici en pur TypeScript plutôt que d'ajouter une dépendance côté frontend pour
// ce seul usage — l'algorithme de contrôle IBAN (ISO 7064 MOD-97-10) est un standard
// public, pas une logique métier propre à ce projet.

const IBAN_LENGTH_BY_COUNTRY: Record<string, number> = {
  AD: 24, AT: 20, BE: 16, BG: 22, CH: 21, CY: 28, CZ: 24, DE: 22, DK: 18,
  EE: 20, ES: 24, FI: 18, FR: 27, GB: 22, GR: 27, HR: 21, HU: 28, IE: 22,
  IS: 26, IT: 27, LI: 21, LT: 20, LU: 20, LV: 21, MC: 27, MT: 31, NL: 18,
  NO: 15, PL: 28, PT: 25, RO: 24, SE: 24, SI: 19, SK: 24, SM: 27,
};

export const SEPA_COUNTRIES: ReadonlySet<string> = new Set(
  Object.keys(IBAN_LENGTH_BY_COUNTRY),
);

function normalize(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

function mod97Checksum(iban: string): number {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const value = char >= "0" && char <= "9" ? char : String(char.charCodeAt(0) - 55);
    for (const digit of value) {
      remainder = (remainder * 10 + Number(digit)) % 97;
    }
  }
  return remainder;
}

export function isValidIban(iban: string): boolean {
  const normalized = normalize(iban);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(normalized)) return false;

  const country = normalized.slice(0, 2);
  const expectedLength = IBAN_LENGTH_BY_COUNTRY[country];
  if (expectedLength && normalized.length !== expectedLength) return false;

  return mod97Checksum(normalized) === 1;
}

export function isValidBic(bic: string): boolean {
  return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(normalize(bic));
}

export function ibanCountryCode(iban: string): string {
  return normalize(iban).slice(0, 2);
}

export function isSepaEligibleIban(iban: string): boolean {
  return isValidIban(iban) && SEPA_COUNTRIES.has(ibanCountryCode(iban));
}
