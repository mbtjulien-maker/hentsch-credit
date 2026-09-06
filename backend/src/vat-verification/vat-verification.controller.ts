import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CheckVatDto } from './dto/check-vat.dto';
import { VatVerificationService } from './vat-verification.service';

// Réservé aux comptes authentifiés (utilisé depuis le dossier KYC/profil, jamais une
// page publique) — limite dédiée (10/min, plus stricte que le défaut 120/min) : VIES
// applique lui-même un quota par IP source, mieux vaut que notre propre limite se
// déclenche avant que le serveur entier ne se fasse temporairement bannir par VIES.
@UseGuards(JwtAuthGuard)
@Controller('vat-verification')
export class VatVerificationController {
  constructor(
    private readonly vatVerificationService: VatVerificationService,
  ) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('check')
  check(@Body() dto: CheckVatDto) {
    return this.vatVerificationService.checkVat(dto.countryCode, dto.vatNumber);
  }
}
