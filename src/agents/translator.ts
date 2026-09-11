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
  return 'Translate the user message into the requested language. Reply with only the translation, no commentary.';
}
