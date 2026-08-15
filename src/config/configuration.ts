export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl: process.env.DATABASE_URL,
  classifier: {
    // "ollama" (default) | "stub" for offline/local testing without Ollama
    provider: process.env.CLASSIFIER_PROVIDER ?? 'ollama',
  },
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL ?? 'llama3.2',
    timeoutMs: parseInt(process.env.OLLAMA_TIMEOUT_MS ?? '60000', 10),
  },
});
