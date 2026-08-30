import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { assertSelfOrAdmin } from '../auth/ownership.util';
import { UsersService } from './users.service';

// Profil affiché côté client authentifié (cf. app/dashboard/profil), distinct de la
// fiche 360 back-office (AdminClientsModule, réservée aux ADMIN) — même source de
// données (ClientProfile/Address/Employment), lecture seule ici, un client ne peut lire
// que son propre profil (cf. assertSelfOrAdmin), un ADMIN peut lire n'importe lequel.
@UseGuards(JwtAuthGuard)
@Controller('users/:userId/profile')
export class UserProfileController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getProfile(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    assertSelfOrAdmin(currentUser, userId);
    return this.usersService.getProfile(userId);
  }
}
