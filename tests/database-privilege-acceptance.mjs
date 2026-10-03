import assert from 'node:assert/strict';
import { isolatedPostgres, literal } from './hosted-storage-postgres-cluster.mjs';

const scoreInsert = `INSERT INTO public.leaderboard
  (session_id,player_name,score,play_mode,ranked) VALUES ('privilege-score','ABC',1200,'challenge',true)`;
const exportInsert = `INSERT INTO public.game_exports
  (session_id,case_data,conversation,outcome,difficulty,stats)
  VALUES ('privilege-export','{"private":"synthetic case"}','[]','win','easy','{"score":1200}')`;
const asService = statement => `SET ROLE service_role; ${statement};`;

async function rejectPublic(database, table, insert) {
  for (const role of ['anon', 'authenticated']) {
    await assert.rejects(database.sql(`SET ROLE ${role}; ${insert};`), /permission denied/);
    await assert.rejects(database.sql(`SET ROLE ${role}; ${insert} ON CONFLICT DO NOTHING;`), /permission denied/);
    await assert.rejects(database.sql(`SET ROLE ${role}; UPDATE public.${table} SET session_id=session_id;`), /permission denied/);
    await assert.rejects(database.sql(`SET ROLE ${role}; SELECT * FROM public.${table};`), /permission denied/);
    await assert.rejects(database.sql(`SET ROLE ${role}; DELETE FROM public.${table};`), /permission denied/);
  }
  console.log(`PASS ${table}: anon/authenticated direct insert, conflict retry, update, select and delete denied`);
}

async function corePermissions(database) {
  await database.migrate('database/migrations/001_private_leaderboard.sql');
  await database.migrate('database/migrations/004_leaderboard_play_mode.sql');
  await rejectPublic(database, 'leaderboard', scoreInsert);
  await rejectPublic(database, 'game_exports', exportInsert);
  await database.sql(asService(scoreInsert));
  await database.sql(asService(exportInsert));
  await assert.rejects(database.sql(asService(scoreInsert)), /duplicate key/);
  await assert.rejects(database.sql(asService(exportInsert)), /duplicate key/);
  await database.sql(asService(`${scoreInsert} ON CONFLICT (session_id) DO NOTHING`));
  await database.sql(asService(`${exportInsert} ON CONFLICT (session_id)
    DO UPDATE SET stats='{"score":1200,"confirmed":true}'::jsonb`));
  assert.equal(await database.sql(asService('SELECT count(*) FROM public.leaderboard')), '1');
  assert.equal(await database.sql(asService('SELECT count(*) FROM public.game_exports')), '1');
  assert.equal(await database.sql(asService('SELECT stats->>\'confirmed\' FROM public.game_exports')), 'true');
  assert.equal(await database.sql(`SELECT count(*) FROM pg_class WHERE oid IN
    ('public.leaderboard'::regclass,'public.game_exports'::regclass) AND relrowsecurity`), '2');
  console.log('PASS core: migrations001/004 apply fresh; trusted role writes/reads/upserts; duplicate sessions rejected; one row per session; RLS enabled');
}

function patternInsert(version) {
  if (version === 1) return `INSERT INTO public.interrogation_patterns
    (session_id,difficulty,outcome) VALUES ('privilege-pattern-1','easy','win')`;
  const embedding = literal(JSON.stringify([1, ...Array(1535).fill(0)]));
  const events = version === 3;
  return `INSERT INTO public.interrogation_patterns_v${version}
    (session_id,setting,difficulty,outcome,questions,final_stress,clues_found,time_elapsed,source,
    embedding_model,embedding_version,embedding_dimensions,embedding${events
      ? ',schema_version,case_version,case_provenance,turn_events,question_evidence' : ''})
    VALUES ('privilege-pattern-${version}','startup','easy','win','[]',0,1,1,'observed_game',
    'text-embedding-3-small','${events ? 'openai-text-embedding-3-small-1536-events-v2'
      : 'openai-text-embedding-3-small-1536-v1'}',1536,${embedding}${events
      ? `,'accepted-events-v1','${'a'.repeat(64)}','[]','[]','[]'` : ''})`;
}

async function optionalPatterns(database) {
  const available = await database.sql("SELECT count(*) FROM pg_available_extensions WHERE name='vector';");
  console.log(`Runtime vector extension available: ${available === '1'}`);
  await database.sql('CREATE SCHEMA extensions; GRANT USAGE ON SCHEMA extensions TO service_role;');
  try {
    await database.migrate('database/migrations/002_optional_legacy_patterns.sql');
  } catch (error) {
    const message = error.stderr || error.message;
    if (!/could not open extension control file.*vector\.control|extension "vector" is not available/s.test(message)) throw error;
    assert.equal(await database.sql("SELECT to_regclass('public.interrogation_patterns') IS NULL;"), 't');
    console.log(`BLOCKED optional002/003/005: ${message.trim()}`);
    console.log('PASS failed optional migration rolled back; no replacement vector type or extension installation attempted');
    return false;
  }
  await database.migrate('database/migrations/003_versioned_patterns.sql');
  await database.migrate('database/migrations/005_event_grounded_patterns.sql');
  for (const version of [1, 2, 3]) {
    const table = version === 1 ? 'interrogation_patterns' : `interrogation_patterns_v${version}`;
    const insert = patternInsert(version);
    await rejectPublic(database, table, insert);
    await database.sql(asService(insert));
    await assert.rejects(database.sql(asService(insert)), /duplicate key/);
    assert.equal(await database.sql(asService(`SELECT count(*) FROM public.${table}`)), '1');
  }
  console.log('PASS optional002/003/005: actual vector migrations, trusted writes and duplicate/session constraints');
  return true;
}

const database = await isolatedPostgres();
try {
  console.log(`Runtime: Node ${process.version}; PostgreSQL ${await database.sql('SHOW server_version;')}`);
  assert.equal(await database.sql('SHOW listen_addresses;'), '', 'no TCP listener');
  // Supabase provisions service_role with BYPASSRLS. Model that role attribute explicitly;
  // migrations grant its table privileges, but do not provision the platform's roles.
  await database.sql('ALTER ROLE service_role BYPASSRLS;');
  assert.equal(await database.sql("SELECT rolbypassrls FROM pg_roles WHERE rolname='service_role';"), 't');
  assert.equal(await database.sql("SELECT count(*) FROM pg_roles WHERE rolname IN ('anon','authenticated') AND (rolsuper OR rolbypassrls);"), '0');
  console.log('Fixture: fresh Unix-socket-only cluster; synthetic Supabase-style service_role BYPASSRLS, unprivileged anon/authenticated');
  await corePermissions(database);
  const patterns = await optionalPatterns(database);
  console.log(`RESULT core SQL permission acceptance executed; optional vector/pattern acceptance ${patterns ? 'executed' : 'BLOCKED'}`);
  console.log('Scope: actual isolated PostgreSQL roles and fresh migrations. No live Supabase/PostgREST, credentials, provider, browser or deployment proof.');
} finally {
  await database.stop();
  console.log('CLEANUP isolated cluster stopped and its temporary directory removed');
}
