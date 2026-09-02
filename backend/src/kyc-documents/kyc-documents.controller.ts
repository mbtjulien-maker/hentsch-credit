import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import type { AuthenticatedUser } from '../auth/auth.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { assertSelfOrAdmin } from '../auth/ownership.util';
import { UploadKycDocumentDto } from './dto/upload-kyc-document.dto';
import { KycDocumentsService } from './kyc-documents.service';
import { MAX_KYC_FILE_SIZE_BYTES } from './kyc-documents.constants';

// Fichiers réellement téléversés à l'appui du dossier KYC (cf. §6 entrée #36 CLAUDE.md,
// distinct du reste — purement déclaratif — de UserProfileController). Même garde
// d'accès que le reste du profil : un client ne peut agir que sur ses propres documents,
// un admin sur n'importe lequel (cf. assertSelfOrAdmin), pas de KycVerifiedGuard (un
// client doit pouvoir compléter son dossier AVANT que son KYC ne soit vérifié).
@UseGuards(JwtAuthGuard)
@Controller('users/:userId/profile/documents')
export class KycDocumentsController {
  constructor(private readonly kycDocumentsService: KycDocumentsService) {}

  @Get()
  list(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    assertSelfOrAdmin(currentUser, userId);
    return this.kycDocumentsService.list(userId);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_KYC_FILE_SIZE_BYTES } }),
  )
  upload(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UploadKycDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    assertSelfOrAdmin(currentUser, userId);
    return this.kycDocumentsService.upload(userId, dto.category, file);
  }

  @Get(':documentId/download')
  async download(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Res() res: Response,
  ) {
    assertSelfOrAdmin(currentUser, userId);
    const file = await this.kycDocumentsService.getFile(userId, documentId);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(file.fileName)}"`,
    );
    res.send(file.data);
  }

  @Delete(':documentId')
  remove(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    assertSelfOrAdmin(currentUser, userId);
    return this.kycDocumentsService.delete(userId, documentId);
  }
}
