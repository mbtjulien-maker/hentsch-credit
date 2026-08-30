import {
  ExecutionContext,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac } from 'crypto';
import { BlockchainWebhookSignatureGuard } from './blockchain-webhook-signature.guard';

const SECRET = 'test-signing-key';

function sign(body: string): string {
  return createHmac('sha256', SECRET).update(body).digest('hex');
}

function buildContext(options: {
  signature?: string;
  rawBody?: Buffer;
}): ExecutionContext {
  const request = {
    header: (name: string) =>
      name.toLowerCase() === 'x-webhook-signature'
        ? options.signature
        : undefined,
    rawBody: options.rawBody,
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('BlockchainWebhookSignatureGuard', () => {
  let configService: { get: jest.Mock };
  let guard: BlockchainWebhookSignatureGuard;

  beforeEach(() => {
    configService = { get: jest.fn().mockReturnValue(SECRET) };
    guard = new BlockchainWebhookSignatureGuard(configService as never);
  });

  it('allows a request with a valid HMAC signature', () => {
    const rawBody = Buffer.from('{"foo":"bar"}');
    const context = buildContext({
      signature: sign(rawBody.toString()),
      rawBody,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects a request missing the signature header', () => {
    const context = buildContext({ rawBody: Buffer.from('{}') });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects a request missing the raw body', () => {
    const context = buildContext({ signature: 'abcd' });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects a request with a tampered/incorrect signature', () => {
    const rawBody = Buffer.from('{"foo":"bar"}');
    const context = buildContext({
      signature: sign('{"foo":"tampered"}'),
      rawBody,
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects a signature of a different length without crashing (timingSafeEqual guard)', () => {
    const rawBody = Buffer.from('{"foo":"bar"}');
    const context = buildContext({ signature: 'ab', rawBody });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('throws InternalServerErrorException when the signing key is not configured', () => {
    configService.get.mockReturnValue(undefined);
    const rawBody = Buffer.from('{}');
    const context = buildContext({ signature: 'abcd', rawBody });

    expect(() => guard.canActivate(context)).toThrow(
      InternalServerErrorException,
    );
  });
});
