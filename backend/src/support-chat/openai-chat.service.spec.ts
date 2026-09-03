import { SupportChatUnavailableException } from '../common/exceptions/support-chat.exceptions';
import { OpenAiChatService } from './openai-chat.service';

describe('OpenAiChatService', () => {
  let configService: { get: jest.Mock };
  let service: OpenAiChatService;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    configService = { get: jest.fn() };
    service = new OpenAiChatService(configService as never);
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('isConfigured', () => {
    it('renvoie false sans clé configurée', () => {
      configService.get.mockReturnValue('');
      expect(service.isConfigured()).toBe(false);
    });

    it('renvoie true avec une clé configurée', () => {
      configService.get.mockReturnValue('sk-fake-key');
      expect(service.isConfigured()).toBe(true);
    });
  });

  describe('sendMessage', () => {
    it("rejette immédiatement sans appeler l'API si aucune clé n'est configurée", async () => {
      configService.get.mockReturnValue('');
      await expect(service.sendMessage([], 'Bonjour')).rejects.toThrow(
        SupportChatUnavailableException,
      );
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("renvoie le texte de la réponse quand l'appel réussit", async () => {
      configService.get.mockReturnValue('sk-fake-key');
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: 'Réponse réelle d’OpenAI.' } }],
          }),
      });

      const reply = await service.sendMessage(
        [{ role: 'model', text: 'Réponse précédente' }],
        'Nouvelle question',
      );

      expect(reply).toBe('Réponse réelle d’OpenAI.');
      // Vérifie le mapping 'model' -> 'assistant' attendu par l'API OpenAI.
      const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(init.body as string) as {
        messages: { role: string; content: string }[];
      };
      expect(body.messages).toEqual([
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expect.any() est typé `any` par @types/jest
        { role: 'system', content: expect.any(String) },
        { role: 'assistant', content: 'Réponse précédente' },
        { role: 'user', content: 'Nouvelle question' },
      ]);
    });

    it("dégrade gracieusement (SupportChatUnavailableException) si l'API répond une erreur HTTP", async () => {
      configService.get.mockReturnValue('sk-fake-key');
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('invalid_api_key'),
      });

      await expect(service.sendMessage([], 'Bonjour')).rejects.toThrow(
        SupportChatUnavailableException,
      );
    });

    it('dégrade gracieusement si la réponse ne contient aucun texte exploitable', async () => {
      configService.get.mockReturnValue('sk-fake-key');
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ choices: [] }),
      });

      await expect(service.sendMessage([], 'Bonjour')).rejects.toThrow(
        SupportChatUnavailableException,
      );
    });

    it('dégrade gracieusement si fetch lève (réseau indisponible)', async () => {
      configService.get.mockReturnValue('sk-fake-key');
      fetchSpy.mockRejectedValue(new Error('network down'));

      await expect(service.sendMessage([], 'Bonjour')).rejects.toThrow(
        SupportChatUnavailableException,
      );
    });
  });
});
