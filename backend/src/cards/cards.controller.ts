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
import { CardsService } from './cards.service';

@UseGuards(JwtAuthGuard)
@Controller('users/:userId/cards')
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Get()
  list(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    assertSelfOrAdmin(currentUser, userId);
    return this.cardsService.listForUser(userId);
  }
}
