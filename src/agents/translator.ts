'use agent';
import { useModel } from '@flue/runtime';

/**
 * Translator agent.
 *
 * The function name is the durable identity: `Translator` generates the
 * Durable Object class `FlueTranslatorAgent` with binding `FLUE_TRANSLATOR_AGENT`.
 * Renaming this function changes storage identity, so it would need a
 * `renamed_classes` migration in wrangler.jsonc.
 */
export function Translator() {
  useModel('mimo/mimo-v2.5');
  return 'You are Flue, a helpful general-purpose AI assistant. Answer the user\'s questions clearly and naturally. Use markdown when it improves readability, and ask a concise clarifying question when the request is ambiguous.';
}
