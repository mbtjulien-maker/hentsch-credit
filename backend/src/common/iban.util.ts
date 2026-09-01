import isIBAN from 'validator/lib/isIBAN';
import isBIC from 'validator/lib/isBIC';

// Validation structurelle IBAN/BIC via `validator` (déjà une dépendance transitive de
// class-validator — cf. @IsIBAN()/@IsBIC() dans RequestWithdrawalDto — formalisée en
// dépendance directe ici) : format précis par pays + clé de contrôle IBAN (ISO 7064
// MOD-97-10). Ceci confirme qu'un IBAN est bien formé (pays valide, structure et longueur
// correctes pour ce pays, clé de contrôle cohérente), PAS que le compte existe réellement
// ni qu'il appartient au titulaire déclaré. Une vérification réelle de propriété de compte
// nécessiterait un service tiers (ex. GoCardless Bank Account Data, ex-Nordigen) — non
// branché ici, cohérent avec le reste du retrait (cf. WithdrawalService : aucun rail
// bancaire réel n'est branché non plus).
export { isIBAN, isBIC };

// Pays de la zone SEPA (virement SEPA credit transfer) — l'UE/EEE plus quelques
// territoires associés (Suisse, Royaume-Uni, Monaco, Saint-Marin, Andorre). Un IBAN hors
// de cette liste ne peut pas être utilisé pour un retrait SEPA (cf. WithdrawalService),
// uniquement SWIFT.
export const SEPA_COUNTRIES: ReadonlySet<string> = new Set([
  'AD',
  'AT',
  'BE',
  'BG',
  'CH',
  'CY',
  'CZ',
  'DE',
  'DK',
  'EE',
  'ES',
  'FI',
  'FR',
  'GB',
  'GR',
  'HR',
  'HU',
  'IE',
  'IS',
  'IT',
  'LI',
  'LT',
  'LU',
  'LV',
  'MC',
  'MT',
  'NL',
  'NO',
  'PL',
  'PT',
  'RO',
  'SE',
  'SI',
  'SK',
  'SM',
]);

export function ibanCountryCode(iban: string): string {
  return iban.replace(/\s+/g, '').toUpperCase().slice(0, 2);
}

export function isSepaEligibleIban(iban: string): boolean {
  return isIBAN(iban) && SEPA_COUNTRIES.has(ibanCountryCode(iban));
}
