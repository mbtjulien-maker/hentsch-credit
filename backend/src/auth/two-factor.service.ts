import { Injectable } from '@nestjs/common';
import { generateSecret, generateURI, verify } from 'otplib';
import * as QRCode from 'qrcode';

// TOTP (RFC 6238) via otplib v13 (API fonctionnelle — generateSecret/generateURI/verify,
// pas la classe `authenticator` des versions antérieures d'otplib, dépréciée dans celle-ci)
// — compatible avec n'importe quelle app d'authentification standard (Google
// Authenticator, Authy, 1Password...).
const ISSUER = 'Hentsch Credit';

@Injectable()
export class TwoFactorService {
  generateSecret(): string {
    return generateSecret();
  }

  buildOtpauthUrl(email: string, secret: string): string {
    return generateURI({ issuer: ISSUER, label: email, secret });
  }

  async generateQrCodeDataUrl(otpauthUrl: string): Promise<string> {
    return QRCode.toDataURL(otpauthUrl);
  }

  async verifyToken(token: string, secret: string): Promise<boolean> {
    try {
      const result = await verify({ token, secret });
      return result.valid;
    } catch {
      // otplib lève si le token n'a pas le bon format (pas 6 chiffres, etc.) — un format
      // invalide est un code invalide, pas une erreur serveur à propager.
      return false;
    }
  }
}
