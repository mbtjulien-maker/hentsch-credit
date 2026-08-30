import { generate } from 'otplib';
import { TwoFactorService } from './two-factor.service';

describe('TwoFactorService', () => {
  let service: TwoFactorService;

  beforeEach(() => {
    service = new TwoFactorService();
  });

  describe('generateSecret', () => {
    it('returns a non-empty base32 secret, different on each call', () => {
      const a = service.generateSecret();
      const b = service.generateSecret();

      expect(a).toBeTruthy();
      expect(a).toMatch(/^[A-Z2-7]+$/); // base32 alphabet
      expect(a).not.toBe(b);
    });
  });

  describe('buildOtpauthUrl', () => {
    it('builds an otpauth:// URI carrying the issuer, label and secret', () => {
      const url = service.buildOtpauthUrl(
        'admin@hhentsch.com',
        'ABCDEFGHIJKLMNOP',
      );

      expect(url).toMatch(/^otpauth:\/\/totp\//);
      expect(url).toContain('Hentsch%20Credit');
      expect(url).toContain('admin%40hhentsch.com');
      expect(url).toContain('secret=ABCDEFGHIJKLMNOP');
    });
  });

  describe('verifyToken', () => {
    it('accepts a token generated from the same secret for the current time step', async () => {
      const secret = service.generateSecret();
      const token = await generate({ secret });

      const valid = await service.verifyToken(token, secret);

      expect(valid).toBe(true);
    });

    it('rejects a token generated from a different secret', async () => {
      const secret = service.generateSecret();
      const otherSecret = service.generateSecret();
      const token = await generate({ secret: otherSecret });

      const valid = await service.verifyToken(token, secret);

      expect(valid).toBe(false);
    });

    it('rejects a malformed token instead of throwing', async () => {
      const secret = service.generateSecret();

      const valid = await service.verifyToken('not-a-code', secret);

      expect(valid).toBe(false);
    });
  });
});
