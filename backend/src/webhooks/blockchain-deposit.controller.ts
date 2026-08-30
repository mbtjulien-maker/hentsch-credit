import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { BlockchainDepositService } from './blockchain-deposit.service';
import { BlockchainWebhookSignatureGuard } from './blockchain-webhook-signature.guard';
import { BlockchainDepositDto } from './dto/blockchain-deposit.dto';

@Controller('webhooks')
export class BlockchainDepositController {
  constructor(
    private readonly blockchainDepositService: BlockchainDepositService,
  ) {}

  @Post('blockchain-deposit')
  @UseGuards(BlockchainWebhookSignatureGuard)
  @HttpCode(HttpStatus.OK)
  handleDeposit(@Body() dto: BlockchainDepositDto) {
    return this.blockchainDepositService.processDeposit(dto);
  }
}
