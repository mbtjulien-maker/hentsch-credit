import { VatVerificationUnavailableException } from '../common/exceptions/vat-verification.exceptions';
import { VatVerificationService } from './vat-verification.service';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: () => Promise.resolve(body) } as Response;
}

// Même extraction typée que stock-market-data.service.spec.ts : fetch() accepte
// RequestInfo | URL, notre service n'appelle jamais qu'avec une chaîne.
function urlOf(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

describe('VatVerificationService', () => {
  let service: VatVerificationService;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    service = new VatVerificationService();
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('returns valid with the real registered name/address for a genuinely valid VAT number', async () => {
    // Réponse réelle observée en direct contre l'API VIES pour IE6388047V (Google
    // Ireland Limited, cf. §6 CLAUDE.md).
    let calledUrl = '';
    fetchSpy.mockImplementation((input: Parameters<typeof fetch>[0]) => {
      calledUrl = urlOf(input);
      return Promise.resolve(
        jsonResponse({
          isValid: true,
          userError: 'VALID',
          name: 'GOOGLE IRELAND LIMITED',
          address: '3RD FLOOR, GORDON HOUSE, BARROW STREET, DUBLIN 4',
        }),
      );
    });

    const result = await service.checkVat('IE', '6388047V');

    expect(result).toEqual({
      valid: true,
      name: 'GOOGLE IRELAND LIMITED',
      address: '3RD FLOOR, GORDON HOUSE, BARROW STREET, DUBLIN 4',
    });
    expect(calledUrl).toBe(
      'https://ec.europa.eu/taxation_customs/vies/rest-api/ms/IE/vat/6388047V',
    );
  });

  it('returns valid=true with null name/address when the member state provides none (allowed by VIES)', async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse({
        isValid: true,
        userError: 'VALID',
        name: '---',
        address: '',
      }),
    );

    const result = await service.checkVat('DE', '123456789');

    expect(result).toEqual({ valid: true, name: null, address: null });
  });

  it('returns valid=false for a genuinely invalid VAT number, never an exception', async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse({
        isValid: false,
        userError: 'INVALID',
        name: '---',
        address: '---',
      }),
    );

    const result = await service.checkVat('FR', '12345678901');

    expect(result).toEqual({ valid: false, name: null, address: null });
  });

  it.each([
    'MS_UNAVAILABLE',
    'MS_MAX_CONCURRENT_REQ',
    'GLOBAL_MAX_CONCURRENT_REQ',
    'TIMEOUT',
  ])(
    'treats userError=%s as a service outage, never as "invalid"',
    async (userError) => {
      fetchSpy.mockResolvedValue(jsonResponse({ isValid: false, userError }));

      await expect(service.checkVat('FR', '32439351354')).rejects.toThrow(
        VatVerificationUnavailableException,
      );
    },
  );

  it('degrades gracefully on a network error', async () => {
    fetchSpy.mockRejectedValue(new Error('network down'));

    await expect(service.checkVat('DE', '123456789')).rejects.toThrow(
      VatVerificationUnavailableException,
    );
  });

  it('degrades gracefully on a non-2xx HTTP response', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({}, false, 500));

    await expect(service.checkVat('IT', '12345678901')).rejects.toThrow(
      VatVerificationUnavailableException,
    );
  });
});
