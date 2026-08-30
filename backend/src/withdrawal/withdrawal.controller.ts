import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestWithdrawalDto } from './dto/request-withdrawal.dto';
import { WithdrawalService } from './withdrawal.service';

@UseGuards(JwtAuthGuard)
@Controller('withdrawals')
export class WithdrawalController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  @Post()
  create(
    @Body() dto: RequestWithdrawalDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.withdrawalService.requestWithdrawal(
      currentUser.id,
      dto.amount,
      dto.chain,
      dto.currency,
      dto.destinationAddress,
    );
  }
}
