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
import { ClientWalletsService } from './client-wallets.service';

@UseGuards(JwtAuthGuard)
@Controller('users/:userId/managed-wallet')
export class ClientWalletsController {
  constructor(private readonly clientWalletsService: ClientWalletsService) {}

  @Get()
  get(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    assertSelfOrAdmin(currentUser, userId);
    return this.clientWalletsService.getOrCreate(userId);
  }
}
