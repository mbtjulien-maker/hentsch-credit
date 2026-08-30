import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.service';
import { AdminClientsService } from './admin-clients.service';
import { UpdateClientProfileDto } from './dto/update-client-profile.dto';
import { UpdateAddressesDto } from './dto/update-addresses.dto';
import { UpdateEmploymentDto } from './dto/update-employment.dto';
import { UpdateFinancialsDto } from './dto/update-financials.dto';
import { CreateNoteDto } from './dto/create-note.dto';

// Fiche client 360 back-office — "noyau essentiel" en base réelle (identité, adresses,
// emploi, finances, notes internes), cf. schema.prisma. Entièrement réservé au rôle
// ADMIN : ce sont des données de gestion interne, jamais exposées au client lui-même
// (qui garde son propre /auth/me + /dashboard/profil, plus restreint).
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/clients')
export class AdminClientsController {
  constructor(private readonly adminClientsService: AdminClientsService) {}

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
