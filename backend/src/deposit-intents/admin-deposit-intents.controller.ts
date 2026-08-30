import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConfirmDepositDto } from './dto/confirm-deposit.dto';
import { DepositIntentsService } from './deposit-intents.service';

// Validation manuelle des déclarations de dépôt sur adresse mutualisée (cf.
// DepositIntentsService) — réservée au back-office, puisqu'aucun webhook automatique ne
// peut confirmer qu'un client précis a bien envoyé les fonds sur une adresse partagée.
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/deposit-intents')
export class AdminDepositIntentsController {
  constructor(private readonly depositIntentsService: DepositIntentsService) {}

  @Get('pending')
  listPending() {
    return this.depositIntentsService.listPending();
  }

  @Patch(':transactionId/confirm')
  confirm(
    @Param('transactionId', ParseUUIDPipe) transactionId: string,
    @Body() dto: ConfirmDepositDto,
  ) {
    return this.depositIntentsService.confirm(transactionId, dto.referenceTx);
  }

  @Patch(':transactionId/reject')
  reject(@Param('transactionId', ParseUUIDPipe) transactionId: string) {
    return this.depositIntentsService.reject(transactionId);
  }
}
