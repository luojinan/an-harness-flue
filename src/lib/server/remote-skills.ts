/**
 * Remote skill loader.
 *
 * Flue loads skills from a *prepared workspace*: at agent initialization it
 * scans `<cwd>/.agents/skills/<name>/SKILL.md` and offers every valid skill to
 * the model (progressive disclosure through the `activate_skill` tool).
 *
 * This module pulls skills from the shared Supabase `skill_files` table used
 * by the sibling `entry-point` project — `/skills/<id>/SKILL.md` — so the same
 * skill repo feeds both apps. A sandbox factory (see `src/sandboxes/`) calls
 * {@link loadRemoteSkills} once at init and seeds the returned files into the
 * virtual filesystem, where Flue's workspace discovery picks them up.
 *
 * Docs: https://flueframework.com/docs/guide/skills/#workspace-skills
 *
 * Required environment:
 *   SUPABASE_PROJECT_REF        — endpoint is derived as https://<ref>.supabase.co
 *   SUPABASE_PUBLISHABLE_KEY    — RLS-scoped key for the Data API (PostgREST)
 *   SKILLS_ROOT_PATH            — table path prefix, e.g. "/skills"
 */

export interface RemoteSkill {
  /** Skill directory id — must satisfy the Agent Skills name rules. */
  id: string;
  /** Frontmatter `name`; Flue requires this to equal the directory name. */
  name: string;
  description: string;
  /** Full `SKILL.md` source (frontmatter + instructions). */
  content: string;
}

interface SkillFileRow {
  path: string;
  content: string | null;
}

interface SupabaseConfig {
  url: string;
  key: string;
}

const DEFAULT_CACHE_TTL_MS = 60_000;
const MAX_SKILLS = 50;
const MAX_DESCRIPTION_LENGTH = 1024;

/**
 * Agent Skills / Flue name rules: lowercase ASCII letters, numbers and single
 * hyphens (no leading/trailing/consecutive hyphens, max 64 chars).
 */
const SKILL_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

let cache: { expiresAt: number; value: RemoteSkill[] } | null = null;

function getSupabaseConfig(): SupabaseConfig {
  const projectRef = process.env.SUPABASE_PROJECT_REF?.trim();
  const key = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!projectRef) {
    throw new Error('Missing required environment variable: SUPABASE_PROJECT_REF');
  }
  if (!key) {
    throw new Error('Missing required environment variable: SUPABASE_PUBLISHABLE_KEY');
  }

  return { url: `https://${projectRef}.supabase.co`, key };
}

function getSkillsRoot(): string {
  const root = process.env.SKILLS_ROOT_PATH?.trim();
  if (!root) {
    throw new Error('Missing required environment variable: SKILLS_ROOT_PATH');
  }
  const withLeadingSlash = root.startsWith('/') ? root : `/${root}`;
  return withLeadingSlash.replace(/\/+$/, '') || '/';
}

async function selectSkillFiles(query: string): Promise<SkillFileRow[]> {
  const config = getSupabaseConfig();

  const response = await fetch(`${config.url}/rest/v1/skill_files?${query}`, {
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `Supabase skill_files request failed (${response.status}): ${body.slice(0, 300)}`,
    );
  }

  return (await response.json()) as SkillFileRow[];
}

function parseFrontmatterField(content: string, field: string): string | undefined {
  const match = content.replace(/^\uFEFF/, '').match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
  if (!match) {
    return undefined;
  }

  for (const rawLine of (match[1] ?? '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const separatorIndex = line.indexOf(':');
    if (separatorIndex <= 0) {
      continue;
    }
    const key = line.slice(0, separatorIndex).trim();
    if (key !== field) {
      continue;
    }
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value.trim() || undefined;
  }

  return undefined;
}

/**
 * Lists every `/skills/<id>/SKILL.md` in the shared Supabase table, keeps the
 * ones that are valid Flue skills, and returns them sorted by id.
 *
 * Results are cached in-memory for a short TTL so repeated agent
 * initializations in the same isolate don't hammer Supabase.
 */
export async function loadRemoteSkills(
  options: { preferFresh?: boolean } = {},
): Promise<RemoteSkill[]> {
  const now = Date.now();
  if (!options.preferFresh && cache && cache.expiresAt > now) {
    return cache.value;
  }

  const root = getSkillsRoot();
  const pattern = `${root}/*/SKILL.md`;
  const rows = await selectSkillFiles(
    `select=path,content&path=like.${encodeURIComponent(pattern)}&limit=${MAX_SKILLS}&order=path.asc`,
  );

  const skills: RemoteSkill[] = [];
  for (const row of rows) {
    const segments = row.path.split('/').filter(Boolean);
    // Expect exactly <root...>/<id>/SKILL.md, i.e. the skills dir + id + file.
    const rootSegments = root.split('/').filter(Boolean);
    if (segments.length !== rootSegments.length + 2) {
      continue;
    }
    if (segments.at(-1) !== 'SKILL.md') {
      continue;
    }
    const id = segments.at(-2);
    if (!id || !SKILL_NAME_PATTERN.test(id)) {
      console.warn(`[remote-skills] Skipping "${row.path}": "${id}" is not a valid skill name`);
      continue;
    }

    const content = row.content ?? '';
    const name = parseFrontmatterField(content, 'name');
    const description = parseFrontmatterField(content, 'description');

    if (!name || name !== id) {
      console.warn(
        `[remote-skills] Skipping "${row.path}": frontmatter name "${name ?? ''}" must equal directory "${id}"`,
      );
      continue;
    }
    if (!description) {
      console.warn(`[remote-skills] Skipping "${row.path}": missing frontmatter description`);
      continue;
    }

    skills.push({
      id,
      name,
      description: [...description].slice(0, MAX_DESCRIPTION_LENGTH).join(''),
      content,
    });
  }

  console.log(
    `[remote-skills] Loaded ${skills.length} skill(s) from ${root}: ${skills
      .map((skill) => skill.id)
      .join(', ')}`,
  );

  cache = { value: skills, expiresAt: now + DEFAULT_CACHE_TTL_MS };
  return skills;
}

/**
 * Maps remote skills to the seeded-workspace file layout Flue discovers:
 * `<baseDir>/.agents/skills/<id>/SKILL.md`.
 */
export function buildRemoteSkillWorkspaceFiles(
  baseDir: string,
  skills: RemoteSkill[],
): Record<string, string> {
  const normalizedBase = baseDir.replace(/\/+$/, '');
  const files: Record<string, string> = {};
  for (const skill of skills) {
    files[`${normalizedBase}/.agents/skills/${skill.id}/SKILL.md`] = skill.content;
  }
  return files;
}
