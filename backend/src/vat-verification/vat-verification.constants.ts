// États membres couverts par VIES (Système d'échange d'informations en matière de TVA de
// la Commission européenne) — la seule vérification d'entreprise réellement gratuite et
// sans clé API qui couvre toute l'Europe (contrairement à un registre national comme le
// SIRET français, propre à un seul pays). Codes ISO à 2 lettres, avec les deux
// exceptions réelles du système : EL (pas GR) pour la Grèce, XI pour l'Irlande du Nord
// (régime particulier post-Brexit, toujours couverte par VIES).
export const VIES_COUNTRY_CODES = [
  'AT',
  'BE',
  'BG',
  'CY',
  'CZ',
  'DE',
  'DK',
  'EE',
  'EL',
  'ES',
  'FI',
  'FR',
  'HR',
  'HU',
  'IE',
  'IT',
  'LT',
  'LU',
  'LV',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SE',
  'SI',
  'SK',
  'XI',
] as const;

export type ViesCountryCode = (typeof VIES_COUNTRY_CODES)[number];

export const VIES_API_BASE =
  'https://ec.europa.eu/taxation_customs/vies/rest-api';

// `userError` de la réponse VIES réellement observés en le testant en direct contre
// l'API (cf. §6 CLAUDE.md) : "INVALID"/"VALID" sont les deux issues normales
// (numéro inexistant vs existant) — tout le reste signale une panne du service (le nœud
// national d'un État membre, en particulier la France, est notoirement instable) et doit
// être traité comme une indisponibilité temporaire, jamais comme "numéro invalide".
export const VIES_INVALID_ERROR = 'INVALID';
export const VIES_VALID_ERROR = 'VALID';
