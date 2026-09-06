import { IsIn, Matches } from 'class-validator';
import { VIES_COUNTRY_CODES } from '../vat-verification.constants';
import type { ViesCountryCode } from '../vat-verification.constants';

export class CheckVatDto {
  @IsIn(VIES_COUNTRY_CODES)
  countryCode: ViesCountryCode;

  // Chiffres/lettres uniquement (le préfixe pays et les espaces/tirets de saisie sont
  // retirés côté frontend avant l'appel) — un format volontairement permissif, VIES
  // lui-même reste l'autorité qui tranche la validité réelle du numéro.
  @Matches(/^[A-Za-z0-9]{2,12}$/)
  vatNumber: string;
}
