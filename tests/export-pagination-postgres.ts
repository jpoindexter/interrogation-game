import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET } from '../app/api/export/route';
import { isolatedPostgres, literal } from './hosted-storage-postgres-cluster.mjs';
import { EXPORT_PAGE_BYTES } from '../src/lib/session/exports/page';

type Database = Awaited<ReturnType<typeof isolatedPostgres>>;
const secret = 'synthetic-export-page-secret';
function configure() {
  Object.assign(process.env, { SESSION_STORAGE: 'supabase', HOSTED_TEXT_ENABLED: 'true', AI_PROVIDER: 'openai',
    AI_RAG_ENABLED: 'false', LEADERBOARD_STORAGE: 'supabase', EXPORT_STORAGE: 'supabase',
    OPENAI_API_KEY: 'synthetic-not-used', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service-role',
    SUPABASE_URL: 'https://export-pages.supabase.co', HOSTED_DEPLOYMENT_ID: 'export-page-fixture',
    HOSTED_AI_CALLS_PER_WINDOW: '0', HOSTED_AI_CHARACTERS_PER_WINDOW: '0', HOSTED_AI_WINDOW_SECONDS: '3600',
    EXPORT_SECRET: secret, VERCEL: '1' });
}
function sdkTransport(db: Database): typeof fetch {
  return async (input, options) => {
    const url = new URL(String(input));
    assert.equal(url.origin, 'https://export-pages.supabase.co');
    const name = url.pathname.split('/').at(-1)!;
    assert.ok(['interrogation_endpoint_admit', 'interrogation_export_page'].includes(name));
    const args = JSON.parse(String(options?.body)) as Record<string, unknown>;
    const params = Object.entries(args).map(([key, value]) => {
      assert.match(key, /^p_[a-z_]+$/);
      return `${key} => ${value === null ? 'NULL' : typeof value === 'number' ? String(value) : literal(value)}`;
    });
    return Response.json(await db.rpc(name, params));
  };
}
const request = (query = '', authorization = `Bearer ${secret}`) => GET(new NextRequest(`https://fixture.invalid/api/export${query}`, {
  headers: { authorization },
}));
async function boundedPages() {
  assert.equal((await request('', 'Bearer wrong')).status, 401);
  const first = await request('?difficulty=easy&limit=100');
  assert.equal(first.status, 200); assert.equal(first.headers.get('cache-control'), 'no-store');
  const firstBody = await first.text(); assert.ok(Buffer.byteLength(firstBody) <= EXPORT_PAGE_BYTES);
  assert.equal(first.headers.get('x-export-count'), '2');
  const cursor = first.headers.get('x-export-next-cursor'); assert.ok(cursor);
  assert.ok(first.headers.get('link')?.includes('rel="next"'));
  const second = await request(`?difficulty=easy&limit=100&cursor=${cursor}`);
  assert.equal(second.status, 200); assert.equal(second.headers.get('x-export-next-cursor'), null);
  const rows = `${firstBody}${await second.text()}`.trim().split('\n').map(line => JSON.parse(line));
  assert.deepEqual(rows.map(row => row.id.slice(-1)), ['3', '2', '1'], 'timestamp ties neither duplicate nor skip rows');
  assert.equal(new Set(rows.map(row => row.session_id)).size, 3);
  assert.equal((await request(`?difficulty=hard&limit=100&cursor=${cursor}`)).status, 400, 'cursor binds filters');
  assert.equal((await request(`?difficulty=easy&limit=100&cursor=${cursor}x`)).status, 400, 'cursor rejects tampering');
  const offset = await request('?difficulty=easy&offset=1&limit=1');
  assert.equal(JSON.parse((await offset.text()).trim()).id.slice(-1), '2');
  const oversized = await request('?setting=oversize');
  assert.equal(oversized.status, 413);
  assert.equal((await oversized.json()).code, 'EXPORT_RECORD_TOO_LARGE');
  console.log('PASS real export route + SDK + PostgreSQL: authenticated filtered keyset pages <=1MiB, timestamp ties complete once, offset compatibility, signed/filter-bound cursor, explicit oversized-row413');
}
async function sqlBoundaries(db: Database) {
  const prefix = ['100', '0', '1024', 'NULL', 'NULL', literal('edge')];
  const first = await db.rpc('interrogation_export_page', prefix);
  assert.equal(first.kind, 'page'); assert.equal(first.rows.length, 1); assert.ok(first.next);
  const next = await db.rpc('interrogation_export_page', [...prefix, literal(first.next.createdAt), literal(first.next.id)]);
  assert.equal(next.kind, 'oversized', 'oversized next row is not silently skipped');
  assert.ok(next.bytes > 1024);
  for (const role of ['anon', 'authenticated']) {
    await assert.rejects(db.rpc('interrogation_export_page', [], role), /permission denied/);
  }
  console.log('PASS SQL page boundary: returns prior complete rows then explicit oversized next row; anonymous RPC denied');
}
async function seed(db: Database) {
  await db.sql(`INSERT INTO public.game_exports(id,session_id,case_data,conversation,outcome,difficulty,setting,stats,created_at)
    SELECT ('00000000-0000-0000-0000-00000000000'||n)::uuid,repeat(n::text,48),'{}'::jsonb,
      jsonb_build_array(repeat('é',200000)),'win','easy','startup','{}'::jsonb,'2026-10-03T12:00:00Z'
    FROM generate_series(1,3) n;
    INSERT INTO public.game_exports(session_id,case_data,conversation,outcome,difficulty,setting,stats,created_at)
    VALUES(repeat('4',48),'{}',jsonb_build_array(repeat('x',1100000)),'win','hard','oversize','{}','2026-10-03T11:00:00Z'),
      (repeat('5',48),'{}','[]','win','hard','edge','{}','2026-10-03T10:00:00Z'),
      (repeat('6',48),'{}',jsonb_build_array(repeat('x',2000)),'win','hard','edge','{}','2026-10-03T09:00:00Z');`);
}
async function main() {
  const db = await isolatedPostgres(), originalFetch = globalThis.fetch;
  try {
    for (const file of ['001_private_leaderboard', '006_hosted_sessions', '013_hosted_endpoint_limits', '016_hosted_export_page']) {
      await db.migrate(`database/migrations/${file}.sql`);
    }
    configure(); globalThis.fetch = sdkTransport(db); await seed(db);
    console.log(`Database: ${await db.sql('SHOW server_version;')}`);
    await boundedPages(); await sqlBoundaries(db);
    console.log('Scope: actual Next route handlers, Supabase SDK serialization and PostgreSQL behind controlled HTTP transport. No live Supabase/Vercel/provider/browser proof.');
  } finally { globalThis.fetch = originalFetch; await db.stop(); console.log('CLEANUP isolated database removed'); }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
