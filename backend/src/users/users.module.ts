import { Module } from '@nestjs/common';
import { UserProfileController } from './user-profile.controller';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController, UserProfileController],
  providers: [UsersService],
  // Réutilisé par InviteCodesModule (§6 CLAUDE.md entrée #40) pour persister
  // ClientProfile/Address/Employment/IdentityDocument/AmlProfile à l'inscription en
  // réutilisant exactement les mêmes méthodes que l'auto-déclaration progressive
  // (UserProfileController) — jamais une seconde implémentation de ces upserts.
  exports: [UsersService],
})
export class UsersModule {}
