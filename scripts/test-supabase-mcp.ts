/**
 * Real smoke test for the Flue ↔ Supabase MCP integration.
 *
 * Uses Flue's own `createMcpConnection` (the same layer the
 * `useMcpConnection` hook builds on) to connect to the hosted Supabase MCP
 * server, authenticate with the PAT, discover its tools, apply the allowlist,
 * and adapt them into `mcp__supabase__*` tool definitions.
 *
 * Run it with the Supabase credentials in the environment:
 *
 *   SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_REF=... \
 *     npx tsx scripts/test-supabase-mcp.ts
 *
 * No model call is involved — this verifies the connection + tool discovery
 * end to end. (Actually invoking a tool runs through the agent/model loop;
 * see `flue run src/agents/supabase.ts -m "list the tables"`.)
 */
import { createMcpConnection } from '@flue/runtime';
import { supabase } from '../src/connections/supabase.js';

const connection = await createMcpConnection(supabase);

console.log(`✅ Connected to MCP server "${connection.name}"`);
console.log(`   URL: ${supabase.url}`);
console.log(`   Mounted ${connection.tools.length} tools:`);
for (const tool of connection.tools) {
  console.log(`   - ${tool.name}`);
}

if (connection.tools.length === 0) {
  console.error('❌ No tools mounted — check the tools allowlist and feature groups.');
  process.exitCode = 1;
}

await connection.close();
console.log('✅ Connection closed cleanly.');
