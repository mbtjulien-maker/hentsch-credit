import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { assertSelfOrAdmin } from '../auth/ownership.util';
import { UpdateOwnAddressesDto } from './dto/update-own-addresses.dto';
import { UpdateOwnEmploymentDto } from './dto/update-own-employment.dto';
import { UpdateOwnProfileDto } from './dto/update-own-profile.dto';
import { UsersService } from './users.service';

// Profil affiché ET modifiable côté client authentifié (cf. app/dashboard/profil),
// distinct de la fiche 360 back-office (AdminClientsModule, réservée aux ADMIN) — même
// source de données (ClientProfile/Address/Employment), mais un sous-ensemble restreint
// des champs (cf. UpdateOwn*Dto, sans `clientType`/`verified` : des classifications
// internes, jamais choisies ou auto-certifiées par le client lui-même). Un client ne peut
// lire/modifier que son propre profil (cf. assertSelfOrAdmin), un ADMIN n'importe lequel
// — pas de KycVerifiedGuard ici : un client doit pouvoir renseigner son profil AVANT
// que son KYC soit vérifié, pas après (l'auto-déclaration est un intrant du contrôle KYC,
// pas une conséquence).
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

  @Patch()
  updateProfile(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateOwnProfileDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    assertSelfOrAdmin(currentUser, userId);
    return this.usersService.updateProfile(userId, dto);
  }

  @Put('addresses')
  updateAddresses(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateOwnAddressesDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    assertSelfOrAdmin(currentUser, userId);
    return this.usersService.updateAddresses(userId, dto);
  }

  @Patch('employment')
  updateEmployment(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateOwnEmploymentDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    assertSelfOrAdmin(currentUser, userId);
    return this.usersService.updateEmployment(userId, dto);
  }
}
