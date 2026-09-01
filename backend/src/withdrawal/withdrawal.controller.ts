import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestWithdrawalDto } from './dto/request-withdrawal.dto';
import type { WithdrawalInput } from './withdrawal.service';
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
    const input: WithdrawalInput =
      dto.method === 'CRYPTO'
        ? {
            method: 'CRYPTO',
            amount: dto.amount,
            chain: dto.chain!,
            currency: dto.currency!,
            destinationAddress: dto.destinationAddress!,
          }
        : {
            method: dto.method,
            amount: dto.amount,
            withdrawalCurrency: dto.withdrawalCurrency!,
            bankAccountHolder: dto.bankAccountHolder!,
            destinationIban: dto.destinationIban!,
            bankBic: dto.bankBic,
          };

    return this.withdrawalService.requestWithdrawal(currentUser.id, input);
  }
}
