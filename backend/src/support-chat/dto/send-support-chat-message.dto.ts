import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  MAX_SUPPORT_CHAT_HISTORY_MESSAGES,
  MAX_SUPPORT_CHAT_MESSAGE_LENGTH,
} from '../support-chat.constants';

export class ChatTurnDto {
  @IsIn(['user', 'model'])
  role: 'user' | 'model';

  @IsString()
  @MaxLength(MAX_SUPPORT_CHAT_MESSAGE_LENGTH)
  text: string;
}

// L'historique est renvoyé par le client à chaque appel (pas de session de conversation
// persistée côté serveur — un assistant support n'a pas besoin de survivre à un rechargement
// de page, cf. frontend SupportAssistantDialog qui garde le fil en state React).
export class SendSupportChatMessageDto {
  @IsArray()
  @ArrayMaxSize(MAX_SUPPORT_CHAT_HISTORY_MESSAGES)
  @ValidateNested({ each: true })
  @Type(() => ChatTurnDto)
  history: ChatTurnDto[];

  @IsString()
  @MinLength(1)
  @MaxLength(MAX_SUPPORT_CHAT_MESSAGE_LENGTH)
  message: string;
}
