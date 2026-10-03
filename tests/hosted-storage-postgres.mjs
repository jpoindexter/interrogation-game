import assert from 'node:assert/strict';
import { isolatedPostgres } from './hosted-storage-postgres-cluster.mjs';
import { sessionScenarios } from './hosted-storage-postgres-sessions.mjs';
import { budgetScenarios } from './hosted-storage-postgres-budgets.mjs';
import { claimedWorkScenarios } from './hosted-storage-postgres-claimed-work.mjs';
import { terminalScenarios } from './hosted-storage-postgres-terminal.mjs';

const database = await isolatedPostgres();
try {
  console.log(`Database: ${await database.sql('SHOW server_version;')}`);
  assert.equal(await database.sql('SHOW listen_addresses;'), '', 'fixture has no TCP listener');
  await database.migrate('database/migrations/001_private_leaderboard.sql');
  await database.migrate('database/migrations/004_leaderboard_play_mode.sql');
  await database.migrate('database/migrations/006_hosted_sessions.sql');
  await database.migrate('database/migrations/007_hosted_budgets.sql');
  console.log('PASS isolated Unix-socket cluster; session/budget migrations and export prerequisites apply');
  await sessionScenarios(database);
  await budgetScenarios(database);
  await database.migrate('database/migrations/008_hosted_terminal_export.sql');
  await terminalScenarios(database);
  await database.migrate('database/migrations/009_hosted_claimed_work.sql');
  await claimedWorkScenarios(database);
  console.log('Scope: actual PostgreSQL transactions and role privileges. No Supabase/PostgREST, live hosted route, provider, voice or browser proof.');
} finally {
  await database.stop();
  console.log('CLEANUP isolated cluster stopped and its temporary directory removed');
}
