import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { literal } from './hosted-storage-postgres-cluster.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const args = (key, capacity = 3, deployment = 'admission-fixture') => [literal(deployment), literal(hash(key)), String(capacity)];

export async function admissionScenarios(db) {
  const reserve = (key, capacity = 3, deployment) => db.rpc('interrogation_endpoint_admit', args(key, capacity, deployment));
  const concurrent = await Promise.all(Array.from({ length: 8 }, () => reserve('/api/accuse:unknown')));
  assert.equal(concurrent.filter(result => result.kind === 'allowed').length, 3);
  assert.equal(concurrent.filter(result => result.kind === 'exhausted').length, 5);
  assert.equal((await reserve('/api/accuse:unknown', 4)).kind, 'policy_conflict');
  assert.equal((await reserve('/api/interrogate:unknown')).kind, 'allowed', 'endpoint namespaces isolate the same missing-header identity');
  assert.equal((await reserve('/api/accuse:unknown', 3, 'another-deployment')).kind, 'allowed');
  assert.equal((await db.rpc('interrogation_endpoint_admit', [literal('admission-fixture'), 'NULL', '3'])).kind, 'invalid');
  assert.equal((await reserve('invalid', 0)).kind, 'invalid');
  assert.equal((await reserve('invalid', 10001)).kind, 'invalid');
  const stored = JSON.parse(await db.sql(`SELECT json_build_object('window',window_start,'now',floor(extract(epoch FROM clock_timestamp())/60)::bigint*60)
    FROM interrogation_private.endpoint_usage WHERE deployment='admission-fixture' AND bucket_key=${literal(hash('/api/accuse:unknown'))};`));
  assert.equal(stored.window, stored.now, 'database derives minute boundary, never client time');
  await db.sql(`UPDATE interrogation_private.endpoint_usage SET window_start=window_start-60
    WHERE deployment='admission-fixture' AND bucket_key=${literal(hash('/api/accuse:unknown'))};`);
  assert.equal((await reserve('/api/accuse:unknown', 1)).kind, 'allowed', 'expired counter permits a new window and policy');
  assert.equal((await reserve('/api/accuse:unknown', 1)).kind, 'exhausted');
  await privacy(db);
  await admissionAdapter(db);
  await admissionCapacity(db);
  console.log('PASS admission: concurrent boundary, endpoint/deployment isolation, database-time windows, policy freeze, expired counter reset, roles and bounded keys');
}

async function privacy(db) {
  for (const role of ['anon', 'authenticated']) {
    await assert.rejects(db.rpc('interrogation_endpoint_admit', args('private'), role), /permission denied/);
  }
  await assert.rejects(db.sql('SET ROLE service_role; SELECT * FROM interrogation_private.endpoint_usage;'), /permission denied/);
  const publicExecute = await db.sql(`SELECT count(*) FROM pg_proc p,
    LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
    WHERE p.proname='interrogation_endpoint_admit' AND a.grantee=0 AND a.privilege_type='EXECUTE';`);
  assert.equal(publicExecute, '0');
}

async function admissionAdapter(db) {
  const { HostedAdmissionStorage } = await import('../src/lib/storage/hosted/admission.ts');
  const adapter = new HostedAdmissionStorage(async (name, input) => {
    assert.match(input.p_key, /^[a-f0-9]{64}$/);
    assert.ok(!JSON.stringify(input).includes('/api/'), 'raw endpoint/identity never sent to storage');
    return db.rpc(name, [literal(input.p_deployment), literal(input.p_key), String(input.p_max_per_minute)]);
  });
  const request = { deployment: 'adapter-fixture', key: '/api/hint:unknown', maxPerMinute: 1 };
  assert.equal(await adapter.admit(request), 'allowed');
  assert.equal(await adapter.admit(request), 'exhausted', 'missing-header identity shares one restrictive bucket');
  assert.equal(await adapter.admit({ ...request, maxPerMinute: 2 }), 'unavailable', 'policy error is not exhausted');
  assert.equal(await adapter.admit({ ...request, key: '/api/session:unknown' }), 'allowed');
  assert.equal(await adapter.admit({ ...request, key: '' }), 'unavailable');
  const outage = new HostedAdmissionStorage(async () => { throw new Error('fixture unavailable'); });
  assert.equal(await outage.admit(request), 'unavailable');
  assert.equal(await new HostedAdmissionStorage(async () => ({ kind: 'limit' })).admit(request), 'unavailable');
  assert.equal(await new HostedAdmissionStorage(async () => ({ kind: 'unexpected' })).admit(request), 'unavailable');
  console.log('PASS admission adapter: hashed endpoint/identity key; same unknown-client bucket; distinct exhausted versus storage/policy failure without fallback');
}

async function admissionCapacity(db) {
  // Future counter fixtures keep this bounded-capacity scenario independent of wall-clock minute rollover.
  await db.sql(`UPDATE interrogation_private.endpoint_usage SET window_start=floor(extract(epoch FROM clock_timestamp())/60)::bigint*60+60;
    INSERT INTO interrogation_private.endpoint_usage(deployment,bucket_key,window_start,capacity,calls)
    SELECT 'capacity-fixture',encode(sha256(convert_to('key:'||n,'UTF8')),'hex'),
      floor(extract(epoch FROM clock_timestamp())/60)::bigint*60+60,5,0
    FROM generate_series(1,9999-(SELECT count(*)::integer FROM interrogation_private.endpoint_usage)) n;`);
  const result = await Promise.all(Array.from({ length: 6 }, (_, index) =>
    db.rpc('interrogation_endpoint_admit', args(`new-key:${index}`, 3, 'capacity-fixture'))));
  assert.equal(result.filter(item => item.kind === 'allowed').length, 1);
  assert.equal(result.filter(item => item.kind === 'limit').length, 5);
  assert.equal(await db.sql('SELECT count(*) FROM interrogation_private.endpoint_usage;'), '10000');
  assert.equal((await db.rpc('interrogation_endpoint_admit', args('key:1', 5, 'capacity-fixture'))).kind, 'allowed');
  await db.sql(`UPDATE interrogation_private.endpoint_usage SET window_start=0 WHERE deployment='capacity-fixture';`);
  assert.equal((await db.rpc('interrogation_endpoint_admit', args('after-cleanup', 1, 'capacity-fixture'))).kind, 'allowed');
  assert.ok(Number(await db.sql('SELECT count(*) FROM interrogation_private.endpoint_usage;')) < 10000);
  console.log('PASS admission capacity: six concurrent new keys admit only final slot; existing key works at cap; expired counters safely free capacity');
}
