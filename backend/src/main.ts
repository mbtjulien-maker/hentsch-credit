import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody: true est requis pour vérifier la signature HMAC des webhooks blockchain
  // (BlockchainWebhookSignatureGuard) sur le corps brut, avant toute désérialisation JSON.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  // En-têtes de sécurité standard (HSTS, X-Content-Type-Options, X-Frame-Options,
  // Referrer-Policy…) — API pure consommée par le frontend Next.js, jamais de rendu HTML
  // ici, donc pas de CSP dédiée à composer (contentSecurityPolicy désactivé : celle par
  // défaut de helmet cible des pages servies par ce process, pas notre cas).
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    // credentials: true est requis pour que le navigateur envoie/accepte le cookie de
    // session httpOnly cross-origin (frontend Next.js sur un port différent) — cf.
    // AuthController et lib/api.ts (fetch avec credentials: 'include').
    origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3001',
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((error: unknown) => {
  console.error('Échec du démarrage du serveur :', error);
  process.exit(1);
});
