import configuration from './configuration';

describe('configuration', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it('provides defaults for classifier and ollama settings', () => {
    process.env = { ...originalEnv };
    delete process.env.PORT;
    delete process.env.CLASSIFIER_PROVIDER;
    delete process.env.OLLAMA_BASE_URL;
    delete process.env.OLLAMA_MODEL;
    delete process.env.OLLAMA_TIMEOUT_MS;

    expect(configuration()).toMatchObject({
      port: 3000,
      classifier: { provider: 'ollama' },
      ollama: {
        baseUrl: 'http://localhost:11434',
        model: 'llama3.2',
        timeoutMs: 60000,
      },
    });
  });

  it('reads overrides from the environment', () => {
    process.env = {
      ...originalEnv,
      PORT: '4000',
      CLASSIFIER_PROVIDER: 'stub',
      OLLAMA_BASE_URL: 'http://ollama:11434',
      OLLAMA_MODEL: 'mistral',
      OLLAMA_TIMEOUT_MS: '15000',
      DATABASE_URL: 'postgresql://example',
    };

    expect(configuration()).toEqual({
      port: 4000,
      databaseUrl: 'postgresql://example',
      classifier: { provider: 'stub' },
      ollama: {
        baseUrl: 'http://ollama:11434',
        model: 'mistral',
        timeoutMs: 15000,
      },
    });
  });
});
