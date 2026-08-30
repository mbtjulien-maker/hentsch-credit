import { Module } from '@nestjs/common';
import { UserProfileController } from './user-profile.controller';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController, UserProfileController],
  providers: [UsersService],
})
export class UsersModule {}
