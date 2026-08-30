import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { AccountRequestsService } from './account-requests.service';
import { CreateAccountRequestDto } from './dto/create-account-request.dto';

@Controller('account-requests')
export class AccountRequestsController {
  constructor(
    private readonly accountRequestsService: AccountRequestsService,
  ) {}

  // Public — c'est le point d'entrée pour quelqu'un qui n'a justement pas encore de
  // compte (cf. app/page.tsx, formulaire "Demander l'ouverture d'un compte").
  @Post()
  create(@Body() dto: CreateAccountRequestDto) {
    return this.accountRequestsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('pending')
  listPending() {
    return this.accountRequestsService.listPending();
  }

  // Places clientes occupées/restantes (cf. MAX_CLIENT_ACCOUNTS) — affiché côté admin
  // avant d'approuver une demande, pour que le plafond ne soit pas une surprise.
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('capacity')
  getCapacity() {
    return this.accountRequestsService.getCapacity();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post(':id/approve')
  approve(@Param('id', ParseUUIDPipe) id: string) {
    return this.accountRequestsService.approve(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post(':id/reject')
  reject(@Param('id', ParseUUIDPipe) id: string) {
    return this.accountRequestsService.reject(id);
  }
}
