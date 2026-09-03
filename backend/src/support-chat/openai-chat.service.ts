import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupportChatUnavailableException } from '../common/exceptions/support-chat.exceptions';
import {
  MAX_SUPPORT_CHAT_HISTORY_MESSAGES,
  OPENAI_API_BASE,
  OPENAI_DEFAULT_MODEL,
  SUPPORT_CHAT_SYSTEM_INSTRUCTION,
} from './support-chat.constants';

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

interface OpenAiResponse {
  choices?: { message?: { content?: string } }[];
}

// Assistant support réel — OpenAI/ChatGPT (cf. §6 CLAUDE.md entrée #43, dernier
// fournisseur retenu après Google Gemini via AI Studio puis Vertex AI, cf. commentaire de
// support-chat.constants.ts pour l'historique complet). Appel HTTP direct (fetch), même
// convention que MarketDataService/StockMarketDataService plutôt qu'un SDK dédié — une
// simple clé Bearer, sans les complexités d'authentification par compte de service de
// Vertex AI. Sans OPENAI_API_KEY configurée, ou en cas d'échec réel de l'appel,
// l'assistant est indisponible — jamais une réponse fabriquée localement.
@Injectable()
export class OpenAiChatService {
  private readonly logger = new Logger(OpenAiChatService.name);

  constructor(private readonly configService: ConfigService) {}

  private get apiKey(): string | undefined {
    return this.configService.get<string>('OPENAI_API_KEY') || undefined;
  }

  private get model(): string {
    return (
      this.configService.get<string>('OPENAI_MODEL') || OPENAI_DEFAULT_MODEL
    );
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async sendMessage(history: ChatTurn[], message: string): Promise<string> {
    const apiKey = this.apiKey;
    if (!apiKey) {
      throw new SupportChatUnavailableException();
    }

    // 'model' (convention interne partagée avec l'essai Gemini précédent, cf. ChatTurn du
    // frontend) devient 'assistant' côté OpenAI — seul ce mapping change, le reste du
    // contrat (historique renvoyé par le client à chaque appel) est inchangé.
    const messages = [
      { role: 'system', content: SUPPORT_CHAT_SYSTEM_INSTRUCTION },
      ...history.slice(-MAX_SUPPORT_CHAT_HISTORY_MESSAGES).map((turn) => ({
        role: turn.role === 'model' ? 'assistant' : 'user',
        content: turn.text,
      })),
      { role: 'user', content: message },
    ];

    try {
      const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: 600,
          temperature: 0.4,
        }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          `OpenAI a répondu ${response.status} : ${body.slice(0, 300)}`,
        );
      }

      const payload = (await response.json()) as OpenAiResponse;
      const text = payload.choices?.[0]?.message?.content;
      if (typeof text !== 'string' || text.trim() === '') {
        throw new Error('réponse vide');
      }
      return text.trim();
    } catch (error) {
      this.logger.warn(`Échec de l'appel OpenAI : ${(error as Error).message}`);
      throw new SupportChatUnavailableException();
    }
  }
}
