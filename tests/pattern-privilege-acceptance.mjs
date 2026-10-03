import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const IMAGE = 'sha256:ce01659027cd1ce958ebfc8c1547aee3a42f68b50e332308cc6958f469f5e2fc';
const NAME = `interrogation-pattern-acceptance-${randomUUID()}`;
const MODEL = 'text-embedding-3-small';
const VERSIONS = { 2: 'openai-text-embedding-3-small-1536-v1', 3: 'openai-text-embedding-3-small-1536-events-v2' };
const literal = value => `'${String(value).replaceAll("'", "''")}'`;
const json = value => `${literal(JSON.stringify(value))}::jsonb`;
const table = version => version === 1 ? 'interrogation_patterns' : `interrogation_patterns_v${version}`;
const vector = (dimensions, axis = 0, negative = false) => literal(JSON.stringify(Array.from({ length: dimensions },
  (_, index) => index === axis ? (negative ? -1 : 1) : 0)));
const asRole = (statement, role = 'service_role') => `SET ROLE ${role}; ${statement};`;
let container;
let cleanupPromise;

function docker(args, input = '') {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('Docker operation exceeded 30 seconds')); }, 30000);
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(stderr.trim().slice(0, 1200) || `Docker exit ${code}`));
      else resolve(stdout.trim());
    });
    child.stdin.on('error', () => {});
    child.stdin.end(input);
  });
}
const sql = statement => docker(['exec', '-i', container, 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1',
  '-v', 'VERBOSITY=terse', '-h', '/tmp', '-U', 'fixture_owner', '-d', 'postgres'], statement);
function cleanup() {
  cleanupPromise ??= (async () => {
    const target = container ?? NAME;
    let owner;
    try { owner = await docker(['inspect', target, '--format', '{{index .Config.Labels "interrogation.acceptance.owner"}}']); }
    catch (error) { if (/no such object/i.test(error.message)) return; throw error; }
    assert.equal(owner, NAME, 'cleanup must target only the container owned by this invocation');
    await docker(['rm', '--force', target]);
    await assert.rejects(docker(['inspect', target]), /no such object/i);
    console.log('CLEANUP owned disposable container removed; its tmpfs database discarded; no host data or existing container changed');
  })();
  return cleanupPromise;
}
for (const [signal, code] of [['SIGINT', 130], ['SIGTERM', 143]]) process.once(signal, () => {
  void cleanup().then(() => process.exit(code), error => { console.error(error); process.exit(1); });
});
async function start() {
  assert.equal(await docker(['image', 'inspect', IMAGE, '--format', '{{.Id}}']), IMAGE);
  container = await docker(['run', '--detach', '--pull', 'never', '--name', NAME,
    '--label', `interrogation.acceptance.owner=${NAME}`, '--network', 'none', '--read-only', '--cap-drop', 'ALL',
    '--security-opt', 'no-new-privileges', '--user', 'postgres', '--tmpfs', '/tmp:rw,noexec,nosuid,size=256m',
    '--entrypoint', '/bin/sh', IMAGE, '-c',
    'initdb -D /tmp/pattern-data -U fixture_owner -A trust --no-locale -E UTF8 >/tmp/init.log && exec postgres -D /tmp/pattern-data -c listen_addresses= -c unix_socket_directories=/tmp -c shared_buffers=16MB -c max_connections=10 -c dynamic_library_path=/nix/var/nix/profiles/default/lib']);
  assert.match(container, /^[a-f0-9]{64}$/);
  const inspect = JSON.parse(await docker(['inspect', container]))[0];
  assert.equal(inspect.Image, IMAGE); assert.equal(inspect.HostConfig.NetworkMode, 'none');
  assert.equal(inspect.HostConfig.ReadonlyRootfs, true);
  assert.deepEqual(inspect.HostConfig.PortBindings ?? {}, {});
  assert.equal(inspect.Mounts.length, 0, 'no host mounts or named volumes');
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    try { ready = await sql('SELECT 1;') === '1'; } catch { /* Only the new cluster may still be starting. */ }
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error(`New isolated cluster did not become ready: ${await docker(['logs', '--tail', '20', container])}`);
  assert.equal(await sql('SHOW listen_addresses;'), '');
  await sql(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA extensions; GRANT USAGE ON SCHEMA extensions TO anon,authenticated,service_role;`);
  assert.equal(await sql("SELECT count(*) FROM pg_roles WHERE rolname IN ('anon','authenticated') AND (rolsuper OR rolbypassrls);"), '0');
  assert.equal(await sql("SELECT rolbypassrls AND NOT rolsuper FROM pg_roles WHERE rolname='service_role';"), 't');
  console.log(`Runtime: Node ${process.version}; PostgreSQL ${await sql('SHOW server_version;')}; image ${IMAGE}`);
  console.log('Isolation executed: new disposable cluster, network none, no TCP listener/ports/host mounts/volumes, read-only root and tmpfs database; explicit synthetic non-superuser roles');
}
function insert(version, id, changes = {}) {
  const row = version === 1 ? { session_id: id, difficulty: 'easy', outcome: 'win', embedding: vector(1024) } : {
    session_id: id, setting: 'startup', difficulty: 'easy', outcome: 'win', questions: ['Where was the receipt?'],
    final_stress: 2, clues_found: 1, time_elapsed: 1, source: 'observed_game', embedding_model: MODEL,
    embedding_version: VERSIONS[version], embedding_dimensions: 1536, embedding: vector(1536),
    ...(version === 3 ? { schema_version: 'accepted-events-v1', case_version: 'a'.repeat(64),
      case_provenance: [{ source: 'synthetic-fixture' }], turn_events: [{ id: 'accepted-turn-1' }],
      question_evidence: [{ question: 'Where was the receipt?', source: 'case-record' }] } : {}), ...changes,
  };
  return `INSERT INTO public.${table(version)} (${Object.keys(row).join(',')}) VALUES (${Object.entries(row).map(([key, value]) =>
    key === 'embedding' ? value : typeof value === 'number' ? value : typeof value === 'object' ? json(value) : literal(value)).join(',')})`;
}
function match(version, { axis = 0, threshold = 0.5, count = 20, difficulty = 'easy', model = MODEL,
  embeddingVersion = VERSIONS[version], dimensions = version === 1 ? 1024 : 1536 } = {}) {
  return `public.match_patterns${version === 1 ? '' : `_v${version}`}(${vector(dimensions, axis)}::extensions.vector,
    ${threshold},${count},${literal(difficulty)}${version === 1 ? '' : `,${literal(embeddingVersion)},${literal(model)}`})`;
}
async function migrate() {
  for (const file of ['002_optional_legacy_patterns', '003_versioned_patterns', '005_event_grounded_patterns']) {
    await sql(await readFile(`database/migrations/${file}.sql`, 'utf8'));
    assert.equal(await sql(`SELECT count(*) FROM public.${table(file.startsWith('002') ? 1 : file.startsWith('003') ? 2 : 3)};`), '0');
  }
  assert.equal(await sql("SELECT extversion FROM pg_extension WHERE extname='vector';"), '0.8.2');
  assert.equal(await sql(`SELECT count(*) FROM pg_class WHERE oid IN
    ('public.interrogation_patterns'::regclass,'public.interrogation_patterns_v2'::regclass,'public.interrogation_patterns_v3'::regclass)
    AND relrowsecurity;`), '3');
  console.log('PASS fresh unmodified migrations 002/003/005: real pgvector 0.8.2, distinct empty legacy/v2/v3 tables, RLS enabled');
}
async function permissionsAndDuplicates() {
  for (const version of [1, 2, 3]) {
    const target = table(version), statement = insert(version, 'same-session');
    for (const role of ['anon', 'authenticated']) {
      for (const denied of [statement, `${statement} ON CONFLICT DO NOTHING`, `SELECT * FROM public.${target}`,
        `UPDATE public.${target} SET session_id=session_id`, `DELETE FROM public.${target}`,
        `SELECT * FROM ${match(version)}`]) {
        await assert.rejects(sql(asRole(denied, role)), /permission denied/);
      }
    }
    await sql(asRole(statement));
    const original = await sql(asRole(`SELECT to_jsonb(p) FROM public.${target} p WHERE session_id='same-session'`));
    await assert.rejects(sql(asRole(statement)), /duplicate key/);
    await sql(asRole(`${insert(version, 'same-session', { questions: ['Changed duplicate'] })}
      ON CONFLICT (${version === 1 ? 'session_id' : 'session_id,embedding_version'}) DO NOTHING`));
    assert.equal(await sql(asRole(`SELECT to_jsonb(p) FROM public.${target} p WHERE session_id='same-session'`)), original);
    assert.equal(await sql(asRole(`SELECT count(*) FROM public.${target}`)), '1');
    if (version > 1) {
      await assert.rejects(sql(asRole(`UPDATE public.${target} SET questions='[]'`)), /permission denied/);
      await assert.rejects(sql(asRole(`DELETE FROM public.${target}`)), /permission denied/);
    }
    assert.equal(await sql(asRole(`SELECT count(*) FROM ${match(version)}`)), '1');
  }
  assert.equal(await sql(`SELECT count(*) FROM pg_proc p,LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
    WHERE p.proname IN ('match_patterns','match_patterns_v2','match_patterns_v3') AND a.grantee=0 AND a.privilege_type='EXECUTE';`), '0');
  console.log('PASS actual roles across legacy/v2/v3: anon/auth direct writes/reads/upserts/update/delete/RPC denied; trusted inserts/read/match succeed; session duplicates reject; conflict-ignore retry preserves exact original row; versioned rows deny update/delete; PUBLIC RPC execute absent');
}
async function constraints() {
  for (const version of [2, 3]) {
    const invalid = [{ embedding_version: version === 2 ? VERSIONS[3] : VERSIONS[2] }, { embedding_model: 'legacy-model' },
      { embedding_dimensions: 1024 }, { embedding: vector(1024) }, { source: 'authored_seed' }];
    if (version === 3) invalid.push({ schema_version: 'legacy' }, { case_version: 'not-a-hash' },
      { questions: {} }, { case_provenance: {} }, { turn_events: {} }, { question_evidence: {} });
    for (const changes of invalid) {
      await assert.rejects(sql(asRole(insert(version, 'invalid-fixture', changes))), /check constraint|expected 1536 dimensions/);
    }
    assert.equal(await sql(asRole(`SELECT count(*) FROM public.${table(version)} WHERE session_id='invalid-fixture'`)), '0');
    await assert.rejects(sql(asRole(`SELECT * FROM ${match(version, { dimensions: 1024 })}`)), /different vector dimensions/);
  }
  const duplicates = await Promise.allSettled([sql(asRole(insert(3, 'race-session'))), sql(asRole(insert(3, 'race-session')))]);
  assert.equal(duplicates.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(duplicates.filter(result => result.status === 'rejected' && /duplicate key/.test(result.reason.message)).length, 1);
  assert.equal(await sql(asRole("SELECT count(*) FROM public.interrogation_patterns_v3 WHERE session_id='race-session'")), '1');
  console.log('PASS real constraints: incompatible model/version/dimension/source rejected; v3 event-schema/hash/array constraints; mismatched query dimensions rejected; concurrent same-session insert wins once');
}
async function matching() {
  await sql(asRole(insert(3, 'orthogonal', { embedding: vector(1536, 1) })));
  await sql(asRole(insert(3, 'opposite', { embedding: vector(1536, 0, true) })));
  await sql(asRole(insert(3, 'other-difficulty', { difficulty: 'hard' })));
  const ids = async options => JSON.parse(await sql(asRole(`SELECT coalesce(jsonb_agg(session_id ORDER BY session_id),'[]') FROM ${match(3, options)}`)));
  assert.deepEqual(await ids({}), ['race-session', 'same-session']);
  assert.deepEqual(await ids({ axis: 1 }), ['orthogonal']);
  assert.deepEqual(await ids({ difficulty: 'hard' }), ['other-difficulty']);
  assert.deepEqual(await ids({ model: 'legacy-model' }), []);
  assert.deepEqual(await ids({ embeddingVersion: VERSIONS[2] }), []);
  assert.deepEqual(await ids({ threshold: 1 }), [], 'strict similarity threshold excludes even identical vectors at 1');
  assert.deepEqual(await ids({ count: 0 }), []);
  assert.deepEqual(await ids({ count: -1 }), []);
  assert.equal((await ids({ count: 1 })).length, 1);
  const ordered = JSON.parse(await sql(asRole(`SELECT jsonb_agg(session_id) FROM ${match(3, { threshold: -2 })}`)));
  assert.deepEqual(ordered.slice(0, 2).sort(), ['race-session', 'same-session']);
  assert.deepEqual(ordered.slice(2), ['orthogonal', 'opposite'], 'actual cosine distance orders returned neighbors');
  for (let index = 0; index < 24; index++) await sql(asRole(insert(3, `bounded-${index}`)));
  assert.equal((await ids({ count: 999 })).length, 20);
  assert.equal(await sql(asRole(`SELECT count(*) FROM ${match(2, { embeddingVersion: VERSIONS[3] })}`)), '0');
  assert.equal(await sql(asRole('SELECT count(*) FROM public.interrogation_patterns')), '1');
  assert.equal(await sql(asRole('SELECT count(*) FROM public.interrogation_patterns_v2')), '1');
  console.log('PASS real cosine match RPC: known synthetic same/orthogonal/opposite vectors, difficulty/model/version isolation, strict threshold, zero/negative/one/20 result limits; legacy and v2 vectors remain separate with no backfill');
}
async function main() {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('Network prohibited in pattern database acceptance'); };
  try {
    await start(); await migrate(); await permissionsAndDuplicates(); await constraints(); await matching();
    console.log('RESULT optional pattern/vector SQL acceptance executed. Scope: local real PostgreSQL roles/migrations/constraints/pgvector RPC with synthetic data. No Supabase/PostgREST JWT boundary, provider embeddings, semantic relevance or gameplay-adaptation benefit established.');
  } finally {
    globalThis.fetch = originalFetch;
    await cleanup();
  }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
