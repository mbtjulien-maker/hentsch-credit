import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { KycDocumentCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ACCEPTED_KYC_MIME_TYPES,
  MAX_KYC_FILE_SIZE_BYTES,
} from './kyc-documents.constants';

export interface KycDocumentSummary {
  id: string;
  category: KycDocumentCategory;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
  verified: boolean;
  verifiedAt: string | null;
}

export interface KycDocumentFile {
  fileName: string;
  mimeType: string;
  // Uint8Array plutôt que Buffer : c'est le type réellement renvoyé par Prisma pour une
  // colonne Bytes (cf. KycDocument.data) sur cette version — Buffer.from(...) en fait un
  // vrai Buffer Node si un appelant en a besoin, jamais l'inverse nécessaire ici (Express
  // res.send() accepte les deux indifféremment).
  data: Uint8Array;
}

// Fichiers réellement téléversés à l'appui du dossier KYC (cf. §6 entrée #36 CLAUDE.md)
// — contrairement à IdentityDocument/AmlProfile (purement déclaratifs), ce service
// stocke et sert le VRAI contenu binaire, en base (aucun service de stockage tiers
// branché sur ce projet, cf. commentaire du modèle KycDocument). Partagé par
// UserProfileController (client, self-service) et AdminClientsController (back-office,
// même service — jamais deux implémentations parallèles).
@Injectable()
export class KycDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<KycDocumentSummary[]> {
    const docs = await this.prisma.kycDocument.findMany({
      where: { userId },
      select: {
        id: true,
        category: true,
        fileName: true,
        mimeType: true,
        fileSize: true,
        uploadedAt: true,
        verified: true,
        verifiedAt: true,
      },
      orderBy: { category: 'asc' },
    });
    return docs.map((d) => ({
      ...d,
      uploadedAt: d.uploadedAt.toISOString(),
      verifiedAt: d.verifiedAt?.toISOString() ?? null,
    }));
  }

  // Un seul fichier par (userId, category) — cf. @@unique sur KycDocument : un nouvel
  // envoi remplace le précédent (upsert), jamais une accumulation de versions, et remet
  // `verified` à false comme le reste de l'auto-déclaration KYC (même principe que
  // Address.verified/Employment.verified : une pièce qui change n'est plus celle qu'un
  // conseiller a certifiée).
  async upload(
    userId: string,
    category: KycDocumentCategory,
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
  ): Promise<KycDocumentSummary[]> {
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu.');
    }
    if (
      !ACCEPTED_KYC_MIME_TYPES.includes(
        file.mimetype as (typeof ACCEPTED_KYC_MIME_TYPES)[number],
      )
    ) {
      throw new BadRequestException(
        `Format de fichier non accepté (${file.mimetype}) — seuls JPEG, PNG et PDF sont acceptés.`,
      );
    }
    if (file.size > MAX_KYC_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `Fichier trop volumineux (${(file.size / (1024 * 1024)).toFixed(1)} Mo) — la limite est de ${MAX_KYC_FILE_SIZE_BYTES / (1024 * 1024)} Mo.`,
      );
    }

    const data = {
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      // Copie en Uint8Array<ArrayBuffer> explicite : le buffer fourni par Multer est
      // typé Buffer<ArrayBufferLike>, dont Prisma (colonne Bytes) n'accepte pas la
      // variante SharedArrayBuffer — new Uint8Array(...) garantit un ArrayBuffer réel.
      data: new Uint8Array(file.buffer),
      verified: false,
      verifiedAt: null,
    };
    await this.prisma.kycDocument.upsert({
      where: { userId_category: { userId, category } },
      create: { userId, category, ...data },
      update: data,
    });
    return this.list(userId);
  }

  async getFile(userId: string, documentId: string): Promise<KycDocumentFile> {
    const doc = await this.prisma.kycDocument.findUnique({
      where: { id: documentId },
      select: { userId: true, fileName: true, mimeType: true, data: true },
    });
    // Comparé au userId attendu (celui du chemin, déjà vérifié par assertSelfOrAdmin /
    // AdminGuard côté contrôleur) plutôt que par un simple `findFirst({ where: { id,
    // userId } })` équivalent — même résultat, mais ce message d'erreur distingue "aucun
    // document" de "ce document existe mais n'est pas le vôtre" dans les logs serveur.
    if (!doc || doc.userId !== userId) {
      throw new NotFoundException('Document introuvable.');
    }
    return { fileName: doc.fileName, mimeType: doc.mimeType, data: doc.data };
  }

  async delete(
    userId: string,
    documentId: string,
  ): Promise<KycDocumentSummary[]> {
    const doc = await this.prisma.kycDocument.findUnique({
      where: { id: documentId },
      select: { userId: true },
    });
    if (!doc || doc.userId !== userId) {
      throw new NotFoundException('Document introuvable.');
    }
    await this.prisma.kycDocument.delete({ where: { id: documentId } });
    return this.list(userId);
  }

  // Réservé admin (cf. AdminClientsController) — certifie un document déjà téléversé,
  // même principe que IdentityDocument.verified.
  async setVerified(
    userId: string,
    documentId: string,
    verified: boolean,
  ): Promise<KycDocumentSummary[]> {
    const doc = await this.prisma.kycDocument.findUnique({
      where: { id: documentId },
      select: { userId: true },
    });
    if (!doc || doc.userId !== userId) {
      throw new NotFoundException('Document introuvable.');
    }
    await this.prisma.kycDocument.update({
      where: { id: documentId },
      data: { verified, verifiedAt: verified ? new Date() : null },
    });
    return this.list(userId);
  }
}
