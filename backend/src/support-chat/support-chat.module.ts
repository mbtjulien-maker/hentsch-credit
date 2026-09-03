import { Module } from '@nestjs/common';
import { OpenAiChatService } from './openai-chat.service';
import { SupportChatController } from './support-chat.controller';

@Module({
  controllers: [SupportChatController],
  providers: [OpenAiChatService],
})
export class SupportChatModule {}
