import { AiChatService } from './ai-chat.service';

describe('AiChatService URL validation', () => {
  const originalEnv = process.env;
  let service: AiChatService;

  beforeEach(() => {
    process.env = { ...originalEnv };
    service = new AiChatService({} as any, {} as any);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('allows local Ollama endpoints outside production', () => {
    process.env.NODE_ENV = 'development';

    expect(service.validateApiUrl('http://localhost:11434')).toBe('http://localhost:11434');
  });

  it('blocks private-network AI endpoints in production unless explicitly enabled', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ALLOW_PRIVATE_AI_ENDPOINTS;

    expect(() => service.validateApiUrl('http://127.0.0.1:11434')).toThrow(
      'Private-network AI API URLs are disabled in production',
    );
  });

  it('allows private-network AI endpoints in production when explicitly enabled', () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_PRIVATE_AI_ENDPOINTS = 'true';

    expect(service.validateApiUrl('http://127.0.0.1:11434')).toBe('http://127.0.0.1:11434');
  });
});
