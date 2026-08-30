import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { RawBodyRequest } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { Request } from 'express';

export const WEBHOOK_SIGNATURE_HEADER = 'x-webhook-signature';

// Vérifie la signature HMAC-SHA256 du corps brut de la requête, sur le modèle du
// header `x-alchemy-signature` d'Alchemy Notify : hex(HMAC-SHA256(rawBody, signingKey)).
// Sans cette vérification, n'importe qui pourrait forger un faux dépôt et créditer
// librement son propre compte — ce garde est donc requis, pas une option de confort.
@Injectable()
export class BlockchainWebhookSignatureGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<RawBodyRequest<Request>>();
    const signature = request.header(WEBHOOK_SIGNATURE_HEADER);
    const rawBody = request.rawBody;

    if (!signature || !rawBody) {
      throw new UnauthorizedException('Signature de webhook manquante');
    }

    const secret = this.configService.get<string>(
      'BLOCKCHAIN_WEBHOOK_SIGNING_KEY',
    );
    if (!secret) {
      throw new InternalServerErrorException(
        'Clé de signature webhook non configurée',
      );
    }

    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const providedBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');

    const isValid =
      providedBuffer.length === expectedBuffer.length &&
      timingSafeEqual(providedBuffer, expectedBuffer);

    if (!isValid) {
      throw new UnauthorizedException('Signature de webhook invalide');
    }

    return true;
  }
}
