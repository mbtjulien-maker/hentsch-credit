import {
  ibanCountryCode,
  isBIC,
  isIBAN,
  isSepaEligibleIban,
} from './iban.util';

describe('iban.util', () => {
  describe('isIBAN (re-exported from validator, sanity-checked here)', () => {
    it('accepts well-known valid IBANs (official examples)', () => {
      expect(isIBAN('FR7630006000011234567890189')).toBe(true);
      expect(isIBAN('DE89370400440532013000')).toBe(true);
      expect(isIBAN('GB29NWBK60161331926819')).toBe(true);
      expect(isIBAN('NL91ABNA0417164300')).toBe(true);
    });

    it('rejects an IBAN with a wrong check digit', () => {
      expect(isIBAN('FR7630006000011234567890188')).toBe(false);
    });

    it('rejects garbage input', () => {
      expect(isIBAN('not an iban')).toBe(false);
      expect(isIBAN('')).toBe(false);
    });
  });

  describe('isBIC (re-exported from validator, sanity-checked here)', () => {
    it('accepts 8-character and 11-character BICs', () => {
      expect(isBIC('BNPAFRPP')).toBe(true);
      expect(isBIC('BNPAFRPPXXX')).toBe(true);
    });

    it('rejects malformed BICs', () => {
      expect(isBIC('BNPA1RPP')).toBe(false); // digit in bank code
      expect(isBIC('BNPAFRP')).toBe(false); // wrong length
      expect(isBIC('')).toBe(false);
    });
  });

  describe('ibanCountryCode / isSepaEligibleIban', () => {
    it('extracts the ISO country code', () => {
      expect(ibanCountryCode('fr7630006000011234567890189')).toBe('FR');
    });

    it('flags a valid SEPA-zone IBAN as SEPA-eligible', () => {
      expect(isSepaEligibleIban('FR7630006000011234567890189')).toBe(true);
      expect(isSepaEligibleIban('DE89370400440532013000')).toBe(true);
    });

    it('flags a valid but non-SEPA IBAN as not SEPA-eligible', () => {
      // Brazil is a real IBAN-using country outside the SEPA zone.
      expect(isIBAN('BR9700360305000010009795493P1')).toBe(true);
      expect(isSepaEligibleIban('BR9700360305000010009795493P1')).toBe(false);
    });

    it('is never SEPA-eligible when the IBAN itself is invalid', () => {
      expect(isSepaEligibleIban('FR7630006000011234567890188')).toBe(false);
    });
  });
});
