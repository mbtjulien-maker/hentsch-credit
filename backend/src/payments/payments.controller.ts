import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { assertSelfOrAdmin } from '../auth/ownership.util';
import { CreateCardTopupDto } from './dto/create-card-topup.dto';
import { MollieWebhookDto } from './dto/mollie-webhook.dto';
import { MollieService } from './mollie.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly mollieService: MollieService) {}

  @UseGuards(JwtAuthGuard)
  @Post('card-topup')
  createCardTopup(
    @Body() dto: CreateCardTopupDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.mollieService.createCardTopup(currentUser.id, dto.amount);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':paymentId')
  async getStatus(
    @Param('paymentId') paymentId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const result = await this.mollieService.getStatus(paymentId);
    assertSelfOrAdmin(currentUser, result.userId);
    return result;
  }

  // Appelé par Mollie en production (pas de session utilisateur — c'est un callback
  // serveur-à-serveur externe, pas un client authentifié). En mode sandbox (pas de
  // MOLLIE_API_KEY), c'est le bouton "Confirmer" de la page de paiement simulée qui
  // invoque ce même endpoint — aucune divergence de logique entre les deux modes, cf.
  // MollieService.confirmPayment.
  @Post('mollie-webhook')
  @HttpCode(HttpStatus.OK)
  handleWebhook(@Body() dto: MollieWebhookDto) {
    return this.mollieService.confirmPayment(dto.id);
  }
}
