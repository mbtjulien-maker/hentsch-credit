import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { assertSelfOrAdmin } from '../auth/ownership.util';
import { KycVerifiedGuard } from '../common/guards/kyc-verified.guard';
import { CreateDepositAddressDto } from './dto/create-deposit-address.dto';
import { WalletService } from './wallet.service';

@UseGuards(JwtAuthGuard)
@Controller('wallets')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  // Bloque la génération de wallet tant que le KYC n'est pas VERIFIED (cf. CLAUDE.md §5,
  // KycVerifiedGuard).
  @UseGuards(KycVerifiedGuard)
  @Post('deposit-address')
  createDepositAddress(
    @Body() dto: CreateDepositAddressDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.walletService.createDepositAddress(
      currentUser.id,
      dto.chain,
      dto.currency,
    );
  }

  @Get(':userId')
  listWallets(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    assertSelfOrAdmin(currentUser, userId);
    return this.walletService.listWallets(userId);
  }
}
