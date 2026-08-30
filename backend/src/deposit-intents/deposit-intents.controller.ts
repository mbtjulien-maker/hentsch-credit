import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AcceptedCurrency, Chain } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { assertSelfOrAdmin } from '../auth/ownership.util';
import { DeclareDepositDto } from './dto/declare-deposit.dto';
import { DepositIntentsService } from './deposit-intents.service';

// Consultation de l'adresse "pool" pour un actif donné (cf. ManagedDepositAddress) —
// n'importe quel utilisateur authentifié peut la lire (elle n'est pas propre à un
// client) ; le frontend ne l'affiche qu'au moment où le client s'apprête à déposer.
@UseGuards(JwtAuthGuard)
@Controller('managed-deposit-addresses')
export class ManagedDepositAddressesController {
  constructor(private readonly depositIntentsService: DepositIntentsService) {}

  @Get(':currency')
  getManagedAddress(
    @Param('currency', new ParseEnumPipe(AcceptedCurrency))
    currency: AcceptedCurrency,
    @Query('chain', new DefaultValuePipe('ETHEREUM'), new ParseEnumPipe(Chain))
    chain: Chain,
  ) {
    return this.depositIntentsService.getManagedAddress(chain, currency);
  }
}

@UseGuards(JwtAuthGuard)
@Controller('users/:userId/deposit-intents')
export class DepositIntentsController {
  constructor(private readonly depositIntentsService: DepositIntentsService) {}

  @Post()
  declare(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: DeclareDepositDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    assertSelfOrAdmin(currentUser, userId);
    return this.depositIntentsService.declare(userId, dto);
  }
}
