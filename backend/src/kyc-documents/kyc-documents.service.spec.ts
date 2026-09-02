import { BadRequestException, NotFoundException } from '@nestjs/common';
import { KycDocumentsService } from './kyc-documents.service';

function buildFile(
  overrides: Partial<{
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
  }> = {},
) {
  return {
    originalname: 'piece-identite.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('contenu-de-test'),
    ...overrides,
  };
}

describe('KycDocumentsService', () => {
  let prisma: {
    kycDocument: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let service: KycDocumentsService;

  beforeEach(() => {
    prisma = {
      kycDocument: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new KycDocumentsService(prisma as never);
  });

  describe('list', () => {
    it('returns metadata only, never the binary content', async () => {
      prisma.kycDocument.findMany.mockResolvedValue([
        {
          id: 'doc-1',
          category: 'PROOF_OF_ADDRESS',
          fileName: 'facture.pdf',
          mimeType: 'application/pdf',
          fileSize: 2048,
          uploadedAt: new Date('2026-09-02T10:00:00Z'),
          verified: false,
          verifiedAt: null,
        },
      ]);

      const result = await service.list('user-1');

      expect(prisma.kycDocument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          select: expect.not.objectContaining({ data: true }),
        }),
      );
      expect(result[0].fileName).toBe('facture.pdf');
    });
  });

  // Contraintes de format/taille (cf. §6 entrée #36 CLAUDE.md) — validées côté service,
  // pas seulement par les limites Multer, pour un message d'erreur exploitable.
  describe('upload', () => {
    it('rejects an unsupported mime type', async () => {
      await expect(
        service.upload(
          'user-1',
          'PROOF_OF_ADDRESS',
          buildFile({ mimetype: 'application/zip' }),
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.kycDocument.upsert).not.toHaveBeenCalled();
    });

    it('rejects a file larger than the size limit', async () => {
      await expect(
        service.upload(
          'user-1',
          'PROOF_OF_ADDRESS',
          buildFile({ size: 6 * 1024 * 1024 }),
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.kycDocument.upsert).not.toHaveBeenCalled();
    });

    it('upserts the document for the (userId, category) pair, forcing verified to false', async () => {
      prisma.kycDocument.upsert.mockResolvedValue({});
      prisma.kycDocument.findMany.mockResolvedValue([]);

      await service.upload('user-1', 'PROOF_OF_ADDRESS', buildFile());

      expect(prisma.kycDocument.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_category: { userId: 'user-1', category: 'PROOF_OF_ADDRESS' },
          },
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          create: expect.objectContaining({ verified: false }),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          update: expect.objectContaining({ verified: false }),
        }),
      );
    });
  });

  describe('getFile', () => {
    it('throws NotFoundException when the document belongs to a different user', async () => {
      prisma.kycDocument.findUnique.mockResolvedValue({
        userId: 'someone-else',
        fileName: 'x.pdf',
        mimeType: 'application/pdf',
        data: Buffer.from(''),
      });

      await expect(service.getFile('user-1', 'doc-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the file when it belongs to the requesting user', async () => {
      prisma.kycDocument.findUnique.mockResolvedValue({
        userId: 'user-1',
        fileName: 'x.pdf',
        mimeType: 'application/pdf',
        data: Buffer.from('abc'),
      });

      const file = await service.getFile('user-1', 'doc-1');
      expect(file.fileName).toBe('x.pdf');
    });
  });

  describe('setVerified', () => {
    it('stamps verifiedAt when validating, clears it when un-validating', async () => {
      prisma.kycDocument.findUnique.mockResolvedValue({ userId: 'user-1' });
      prisma.kycDocument.update.mockResolvedValue({});
      prisma.kycDocument.findMany.mockResolvedValue([]);

      await service.setVerified('user-1', 'doc-1', true);

      const calls = prisma.kycDocument.update.mock.calls as unknown as Array<
        [{ data: { verified: boolean; verifiedAt: Date | null } }]
      >;
      expect(calls[0][0].data.verified).toBe(true);
      expect(calls[0][0].data.verifiedAt).toBeInstanceOf(Date);
    });
  });
});
