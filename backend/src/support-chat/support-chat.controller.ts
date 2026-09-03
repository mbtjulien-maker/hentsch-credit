import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SendSupportChatMessageDto } from './dto/send-support-chat-message.dto';
import { OpenAiChatService } from './openai-chat.service';

// Réservé aux comptes authentifiés (cf. /dashboard/support) — pas de version publique
// pour l'instant, contrairement à l'assistant scripté qu'il remplace (§6 entrée #39, qui
// vivait déjà dans l'espace connecté). Limite dédiée (20/min) : un appel OpenAI a un coût
// réel, contrairement au reste du throttle par défaut (120/min) pensé pour des lectures.
@UseGuards(JwtAuthGuard)
@Controller('support-chat')
export class SupportChatController {
  constructor(private readonly openAiChatService: OpenAiChatService) {}

  @Get('status')
  status() {
    return { available: this.openAiChatService.isConfigured() };
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('message')
  async sendMessage(@Body() dto: SendSupportChatMessageDto) {
    const reply = await this.openAiChatService.sendMessage(
      dto.history,
      dto.message,
    );
    return { reply };
  }
}
