import assert from 'node:assert/strict';
import { isolatedPostgres } from './hosted-storage-postgres-cluster.mjs';
import { sessionScenarios } from './hosted-storage-postgres-sessions.mjs';
import { budgetScenarios } from './hosted-storage-postgres-budgets.mjs';

const database = await isolatedPostgres();
try {
  console.log(`Database: ${await database.sql('SHOW server_version;')}`);
  assert.equal(await database.sql('SHOW listen_addresses;'), '', 'fixture has no TCP listener');
  await database.migrate('database/migrations/006_hosted_sessions.sql');
  await database.migrate('database/migrations/007_hosted_budgets.sql');
  console.log('PASS isolated Unix-socket cluster; both additive migrations apply');
  await sessionScenarios(database);
  await budgetScenarios(database);
  console.log('Scope: actual PostgreSQL transactions and role privileges. No Supabase/PostgREST, live hosted route, provider, voice or browser proof.');
} finally {
  await database.stop();
  console.log('CLEANUP isolated cluster stopped and its temporary directory removed');
}
