import {
  generateTemporaryPassword,
  hashPassword,
  verifyPassword,
} from './password.util';

describe('password.util', () => {
  it('hashes a password and verifies the same plaintext against it', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');

    expect(hash).not.toBe('correct-horse-battery-staple');
    await expect(
      verifyPassword('correct-horse-battery-staple', hash),
    ).resolves.toBe(true);
  });

  it('rejects a wrong plaintext against a valid hash', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');

    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });

  it('produces a different hash each time (random salt)', async () => {
    const [a, b] = await Promise.all([
      hashPassword('same-password'),
      hashPassword('same-password'),
    ]);

    expect(a).not.toBe(b);
  });

  describe('generateTemporaryPassword', () => {
    it('generates a sufficiently long, URL-safe, non-repeating password', () => {
      const a = generateTemporaryPassword();
      const b = generateTemporaryPassword();

      expect(a).not.toBe(b);
      expect(a.length).toBeGreaterThanOrEqual(20);
      expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });
});
