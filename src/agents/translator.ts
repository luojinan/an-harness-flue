'use agent';
import { useMcpConnection, useModel, useSandbox } from '@flue/runtime';
import { supabase } from '../connections/supabase.js';
import { remoteSkillsSandbox } from '../sandboxes/remote-skills.js';

/**
 * Translator agent — the general-purpose chat agent behind the web UI.
 *
 * The function name is the durable identity: `Translator` generates the
 * Durable Object class `FlueTranslatorAgent` with binding `FLUE_TRANSLATOR_AGENT`.
 * Renaming this function changes storage identity, so it would need a
 * `renamed_classes` migration in wrangler.jsonc.
 *
 * `useSandbox(remoteSkillsSandbox)` attaches the shared remote skill repo
 * (Supabase `skill_files`) as a prepared workspace, so skills authored for
 * `entry-point` show up in the `Available Skills` catalog automatically.
 * `useMcpConnection(supabase)` gives those skills a database to act on.
 */
export function Translator() {
  useModel('mimo/mimo-v2.5');
  useSandbox(remoteSkillsSandbox);
  useMcpConnection(supabase);
  return 'You are Flue, a helpful general-purpose AI assistant. Answer the user\'s questions clearly and naturally. Use markdown when it improves readability, and ask a concise clarifying question when the request is ambiguous. When a task matches one of the Available Skills (income/salary records, currency purchase records, and so on), call the `activate_skill` tool with that skill name first and follow its instructions.';
}
