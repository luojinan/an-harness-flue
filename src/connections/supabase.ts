import { defineMcpConnection } from '@flue/runtime';

/**
 * Supabase hosted MCP server (streamable HTTP) — full write access.
 * Docs: https://supabase.com/docs/guides/getting-started/mcp
 *
 * Auth is `Authorization: Bearer <PAT>` (Personal Access Token). The PAT's
 * own scopes in the Supabase dashboard decide what the server will actually
 * allow — give it write scopes to match this configuration.
 *
 * Environment:
 *   SUPABASE_ACCESS_TOKEN   — Supabase Personal Access Token (required).
 *   SUPABASE_PROJECT_REF    — scope to this project (recommended; removes
 *                             account-management tools).
 *   SUPABASE_MCP_URL        — override endpoint (default https://mcp.supabase.com/mcp).
 *   SUPABASE_MCP_READ_ONLY  — set "true" to run SQL as a read-only Postgres
 *                             user. Default is full write.
 *   SUPABASE_MCP_FEATURES   — comma-separated feature groups. Default enables
 *                             every group (storage included).
 */
function buildSupabaseMcpUrl(): URL {
  const url = new URL(process.env.SUPABASE_MCP_URL ?? 'https://mcp.supabase.com/mcp');
  if (process.env.SUPABASE_PROJECT_REF) {
    url.searchParams.set('project_ref', process.env.SUPABASE_PROJECT_REF);
  }
  // Read-only is opt-in; default is full write access.
  if (process.env.SUPABASE_MCP_READ_ONLY === 'true') {
    url.searchParams.set('read_only', 'true');
  }
  const features =
    process.env.SUPABASE_MCP_FEATURES ??
    'docs,account,database,debugging,development,functions,branching,storage';
  url.searchParams.set('features', features);
  // Don't pause write SQL / migrations on MCP-level confirmation forms.
  url.searchParams.set('skip_elicitations', 'execute_sql,apply_migration');
  return url;
}

export const supabase = defineMcpConnection({
  name: 'supabase',
  url: buildSupabaseMcpUrl(),
  // Resolved per request; an unset token sends no Authorization header.
  auth: () => process.env.SUPABASE_ACCESS_TOKEN ?? '',
  // No `tools` allowlist: mount every tool the server exposes for this
  // project + token, including write tools (apply_migration, execute_sql,
  // deploy_edge_function, storage, …).
});
