import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { UsersService } from './users.service';

// Lister tous les comptes est une capacité back-office (ex: futur écran de gestion des
// clients) — réservée aux ADMIN. Ne sert plus de sélecteur de démonstration côté
// dashboard (cf. TODO historique) : chaque client authentifié ne voit que son propre
// compte, via /auth/me.
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list() {
    return this.usersService.list();
  }
}
