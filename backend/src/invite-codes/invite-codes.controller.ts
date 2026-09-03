import {
  Body,
  Controller,
  Get,
  Header,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthService } from '../auth/auth.service';
import { setSessionCookie } from '../auth/session-cookie.util';
import { AdminGuard } from '../common/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GenerateInviteCodeDto } from './dto/generate-invite-code.dto';
import { PreviewKycDossierPdfDto } from './dto/preview-kyc-dossier-pdf.dto';
import { RedeemInviteCodeDto } from './dto/redeem-invite-code.dto';
import { ValidateInviteCodeDto } from './dto/validate-invite-code.dto';
import { InviteCodesService } from './invite-codes.service';
import { KycDossierPdfService } from './kyc-dossier-pdf.service';

@Controller()
export class InviteCodesController {
  constructor(
    private readonly inviteCodesService: InviteCodesService,
    private readonly kycDossierPdfService: KycDossierPdfService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  // Back-office — génération à la demande pour une invitation précise (cf. §6 CLAUDE.md
  // entrée #40), jamais un lot automatique.
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('admin/invite-codes')
  generate(@Body() dto: GenerateInviteCodeDto) {
    return this.inviteCodesService.generate(dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/invite-codes')
  listAll() {
    return this.inviteCodesService.listAll();
  }

  // Public — page d'accès "J'ai un code d'invitation" (cf. app/[locale]/inscription).
  // Limite dédiée : un code à 8 caractères aléatoires résiste mal à un essai systématique
  // sans rate-limit, même avec seulement 5 tentatives/minute par IP (même limite que
  // /auth/login, cf. AuthController).
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('invite-codes/validate')
  validate(@Body() dto: ValidateInviteCodeDto) {
    return this.inviteCodesService.validate(dto.code);
  }

  // Étape "Récapitulatif" (cf. §6 CLAUDE.md entrée #40) — régénère le dossier KYC en PDF
  // avec les données réellement saisies par le client, pour relecture AVANT toute
  // création de compte. Peut être appelé autant de fois que le client revient corriger un
  // champ ; ne consomme rien, ne persiste rien.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('invite-codes/preview-pdf')
  @Header('Content-Type', 'application/pdf')
  async previewPdf(@Body() dto: PreviewKycDossierPdfDto, @Res() res: Response) {
    const bytes = await this.kycDossierPdfService.generate(dto);
    res.send(Buffer.from(bytes));
  }

  // Public — dernière étape du parcours d'inscription (cf. §6 CLAUDE.md entrée #40) :
  // crée réellement le compte et connecte immédiatement le client (même mécanisme de
  // cookie de session que /auth/login), qui atterrit directement sur le dashboard avec
  // son KYC en attente plutôt que de devoir se reconnecter juste après inscription.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('invite-codes/redeem')
  async redeem(
    @Body() dto: RedeemInviteCodeDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.inviteCodesService.redeem(dto);
    const token = await this.authService.signToken(user);
    setSessionCookie(res, token, this.configService);
    return {
      id: user.id,
      email: user.email,
      kycStatus: user.kycStatus,
      role: user.role,
      accountType: user.accountType,
      createdAt: user.createdAt,
    };
  }
}
