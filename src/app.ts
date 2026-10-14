import { createProvider, envApiKeyAuth } from '@earendil-works/pi-ai';
import { openAICompletionsApi } from '@earendil-works/pi-ai/api/openai-completions.lazy';
import { createAgentRouter } from '@flue/runtime/routing';
import { setProvider } from '@flue/runtime';
import { Hono, type Context } from 'hono';
import { Translator } from './agents/translator.js';
import { SupabaseAssistant } from './agents/supabase.js';
import type {
  ChatSignedObjectUrlRequest,
  ChatUploadPolicyRequest,
} from './lib/chat-image.js';
import {
  buildChatUploadPolicy,
  signChatObjectUrl,
} from './lib/server/chat-aliyun.js';

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
app.route('/agents/supabase', createAgentRouter(SupabaseAssistant));

app.get('/api/ping', (c) => c.text('pong'));

function jsonResponse(c: Context, data: unknown, status = 200) {
  return c.json({ code: 0, message: 'success', data }, status as never);
}

function errorResponse(c: Context, message: string, status: number) {
  return c.json({ code: status, message }, status as never);
}

// 生成阿里云 OSS 直传策略，浏览器拿到后直接 POST 到 OSS。
app.post('/api/chat-upload-policy', async (c) => {
  try {
    const body = (await c.req.json()) as ChatUploadPolicyRequest;
    if (!body.conversationId) {
      return errorResponse(c, 'Missing required field: conversationId', 400);
    }
    if (!body.fileName) {
      return errorResponse(c, 'Missing required field: fileName', 400);
    }
    if (!body.contentType) {
      return errorResponse(c, 'Missing required field: contentType', 400);
    }
    if (typeof body.size !== 'number') {
      return errorResponse(c, 'Missing required field: size', 400);
    }

    return jsonResponse(c, buildChatUploadPolicy(body));
  } catch (error) {
    console.error('Chat upload policy error:', error);
    return errorResponse(
      c,
      error instanceof Error ? error.message : 'Failed to build upload policy',
      500,
    );
  }
});

// 对已上传到 OSS 的对象生成带签名的访问 URL（预览 / 校验用）。
app.post('/api/chat-object-url', async (c) => {
  try {
    const body = (await c.req.json()) as ChatSignedObjectUrlRequest;
    if (!body.bucket) {
      return errorResponse(c, 'Missing required field: bucket', 400);
    }
    if (!body.region) {
      return errorResponse(c, 'Missing required field: region', 400);
    }
    if (!body.objectKey) {
      return errorResponse(c, 'Missing required field: objectKey', 400);
    }

    return jsonResponse(c, signChatObjectUrl(body));
  } catch (error) {
    console.error('Chat object URL error:', error);
    return errorResponse(
      c,
      error instanceof Error ? error.message : 'Failed to sign object URL',
      500,
    );
  }
});

/*
 * The UI is NOT served from here. On Workers, Cloudflare Static Assets
 * (`assets` in wrangler.jsonc -> dist/client, built by vite.config.ui.ts)
 * answers matching requests before this Worker is invoked, so `/` and
 * `/assets/*` never reach Hono. Only the routes above run in the Worker.
 */

export default app;
