import { createProvider, envApiKeyAuth } from '@earendil-works/pi-ai';
import { openAICompletionsApi } from '@earendil-works/pi-ai/api/openai-completions.lazy';
import { createAgentRouter } from '@flue/runtime/routing';
import { setProvider } from '@flue/runtime';
import { Hono } from 'hono';
import { Translator } from './agents/translator.js';

// Register MiMo as a custom OpenAI-compatible provider
setProvider(
  createProvider({
    id: 'mimo',
    name: 'MiMo',
    auth: {
      apiKey: envApiKeyAuth('MiMo API Key', ['OPENAI_API_KEY']),
    },
    models: [
      {
        id: 'mimo-v2.5',
        name: 'MiMo v2.5',
        api: 'openai-completions',
        provider: 'mimo',
        baseUrl: 'https://api.xiaomimimo.com/v1',
        reasoning: true, // Deep Thinking support
        input: ['text', 'image'], // Full-modal Understanding
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 1000000, // 1M context
        maxTokens: 131072, // 128K output
      },
    ],
    api: openAICompletionsApi(),
  }),
);

const app = new Hono();

// Mount paths are free-form; agent identity comes from the function name.
app.route('/agents/translator', createAgentRouter(Translator));

app.get('/api/ping', (c) => c.text('pong'));

export default app;
