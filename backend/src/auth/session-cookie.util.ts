import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import {
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
} from './auth.constants';

// Extrait d'AuthController (ex-méthode privée `setSessionCookie`) pour être réutilisable
// par tout endpoit qui pose une session — désormais aussi InviteCodesController.redeem
// (auto-connexion à l'inscription), jamais une seconde implémentation divergente des
// options du cookie (httpOnly/sameSite/secure), même principe que
// KycDocumentsService (§6 CLAUDE.md entrée #36).
export function setSessionCookie(
  res: Response,
  token: string,
  configService: ConfigService,
): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: configService.get('NODE_ENV') === 'production',
    maxAge: SESSION_DURATION_SECONDS * 1000,
    path: '/',
  });
}
