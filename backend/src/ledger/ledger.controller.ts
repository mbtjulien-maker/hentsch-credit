import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { assertSelfOrAdmin } from '../auth/ownership.util';
import { LedgerService } from './ledger.service';

@UseGuards(JwtAuthGuard)
@Controller('users/:userId/ledger')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get()
  getBalance(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    assertSelfOrAdmin(currentUser, userId);
    return this.ledgerService.getBalanceSummary(userId);
  }
}
