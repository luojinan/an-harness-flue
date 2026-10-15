/**
 * Flue sandbox factory that turns the remote skill repo into a *prepared
 * workspace*.
 *
 * `bash()` wraps a just-bash in-memory runtime into a `SandboxFactory`. Its
 * factory function may be async and runs once per initialized agent harness,
 * immediately before Flue composes the system prompt and discovers workspace
 * skills. Fetching the skills here (rather than at render time) means the
 * catalog is complete on the very first turn, with no prompt-rewriting tricks.
 *
 * If Supabase is unreachable the agent still boots with an empty workspace —
 * skill loading is best-effort and never blocks chat.
 */
import { bash } from '@flue/runtime';
import { Bash } from 'just-bash';
import {
  buildRemoteSkillWorkspaceFiles,
  loadRemoteSkills,
} from '../lib/server/remote-skills.js';

/** just-bash's default working directory; workspace discovery is rooted here. */
const CWD = '/home/user';

export const remoteSkillsSandbox = bash(async () => {
  let files: Record<string, string> = {};
  try {
    const skills = await loadRemoteSkills();
    files = buildRemoteSkillWorkspaceFiles(CWD, skills);
  } catch (error) {
    console.warn(
      '[remote-skills] Failed to load skills from Supabase; starting with an empty workspace:',
      error instanceof Error ? error.message : error,
    );
  }

  return new Bash({ cwd: CWD, files });
});
