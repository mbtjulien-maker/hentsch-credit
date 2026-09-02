import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.service';
import { KycDocumentsService } from '../kyc-documents/kyc-documents.service';
import { SetKycDocumentVerifiedDto } from '../kyc-documents/dto/set-kyc-document-verified.dto';
import { AdminClientsService } from './admin-clients.service';
import { UpdateClientProfileDto } from './dto/update-client-profile.dto';
import { UpdateAddressesDto } from './dto/update-addresses.dto';
import { UpdateEmploymentDto } from './dto/update-employment.dto';
import { UpdateFinancialsDto } from './dto/update-financials.dto';
import { UpdateIdentityDocumentDto } from './dto/update-identity-document.dto';
import { UpdateAmlProfileDto } from './dto/update-aml-profile.dto';
import { DecideKycDto } from './dto/decide-kyc.dto';
import { CreateNoteDto } from './dto/create-note.dto';

// Fiche client 360 back-office — "noyau essentiel" en base réelle (identité, adresses,
// emploi, finances, notes internes), cf. schema.prisma. Entièrement réservé au rôle
// ADMIN : ce sont des données de gestion interne, jamais exposées au client lui-même
// (qui garde son propre /auth/me + /dashboard/profil, plus restreint).
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/clients')
export class AdminClientsController {
  constructor(
    private readonly adminClientsService: AdminClientsService,
    private readonly kycDocumentsService: KycDocumentsService,
  ) {}

  @Get()
  list() {
    return this.adminClientsService.list();
  }

  @Get(':id')
  getDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminClientsService.getDetail(id);
  }

  @Patch(':id/profile')
  updateProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientProfileDto,
  ) {
    return this.adminClientsService.updateProfile(id, dto);
  }

  @Put(':id/addresses')
  updateAddresses(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressesDto,
  ) {
    return this.adminClientsService.updateAddresses(id, dto);
  }

  @Patch(':id/employment')
  updateEmployment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmploymentDto,
  ) {
    return this.adminClientsService.updateEmployment(id, dto);
  }

  @Patch(':id/financials')
  updateFinancials(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFinancialsDto,
  ) {
    return this.adminClientsService.updateFinancials(id, dto);
  }

  @Patch(':id/identity-document')
  updateIdentityDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIdentityDocumentDto,
  ) {
    return this.adminClientsService.updateIdentityDocument(id, dto);
  }

  @Patch(':id/aml-profile')
  updateAmlProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAmlProfileDto,
  ) {
    return this.adminClientsService.updateAmlProfile(id, dto);
  }

  // "Avis de conformité : Validé / Refusé" (cf. dossier KYC papier §6) — répercute la
  // décision sur User.kycStatus (cf. AdminClientsService.decideKyc).
  @Post(':id/kyc-decision')
  decideKyc(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideKycDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.adminClientsService.decideKyc(id, currentUser.id, dto);
  }

  // Fichiers réellement téléversés par le client (cf. §6 entrée #36 CLAUDE.md) — même
  // service que UserProfileController/KycDocumentsController, jamais une seconde
  // implémentation du stockage/téléchargement.
  @Get(':id/documents')
  listDocuments(@Param('id', ParseUUIDPipe) id: string) {
    return this.kycDocumentsService.list(id);
  }

  @Get(':id/documents/:documentId/download')
  async downloadDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Res() res: Response,
  ) {
    const file = await this.kycDocumentsService.getFile(id, documentId);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(file.fileName)}"`,
    );
    res.send(file.data);
  }

  @Patch(':id/documents/:documentId')
  setDocumentVerified(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() dto: SetKycDocumentVerifiedDto,
  ) {
    return this.kycDocumentsService.setVerified(id, documentId, dto.verified);
  }

  @Delete(':id/documents/:documentId')
  deleteDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    return this.kycDocumentsService.delete(id, documentId);
  }

  @Get(':id/notes')
  listNotes(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminClientsService.listNotes(id);
  }

  @Post(':id/notes')
  addNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateNoteDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.adminClientsService.addNote(id, currentUser.id, dto);
  }
}
