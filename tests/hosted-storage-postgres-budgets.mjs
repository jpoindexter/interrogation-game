import assert from 'node:assert/strict';
import { literal } from './hosted-storage-postgres-cluster.mjs';

const key = digit => digit.repeat(64);
const reserveArgs = ({ deployment = 'acceptance', session = key('a'), operation = key('b'),
  fingerprint = key('c'), units = 2, sessionCalls = 10, sessionUnits = 100,
  deploymentCalls = 10, deploymentUnits = 100 } = {}) => [literal(deployment), literal(session),
  literal(operation), literal(fingerprint), literal('ai'), String(units), String(sessionCalls),
  String(sessionUnits), String(deploymentCalls), String(deploymentUnits), '3600'];

export async function budgetScenarios(db) {
  const reserve = options => db.rpc('interrogation_reserve_work', reserveArgs(options));
  const original = await reserve();
  assert.equal(original.kind, 'reserved');
  assert.equal((await reserve()).kind, 'already_reserved');
  assert.equal((await reserve({ fingerprint: key('d') })).kind, 'conflict');
  assert.equal((await reserve({ operation: key('d'), deploymentUnits: 99 })).kind, 'policy_conflict');
  const requests = ['1', '2', '3', '4', '5', '6'];
  const global = await Promise.all(requests.map(digit => reserve({ deployment: 'global-boundary',
    session: key(digit), operation: key(digit), deploymentCalls: 3, deploymentUnits: 5 })));
  assert.equal(global.filter(result => result.kind === 'reserved').length, 2);
  assert.equal(global.filter(result => result.kind === 'exhausted').length, 4);
  assert.ok(global.filter(result => result.kind === 'exhausted').every(result => result.scope === 'deployment'));
  const session = await Promise.all(requests.map(digit => reserve({ deployment: 'session-boundary',
    operation: key(digit), sessionCalls: 3, sessionUnits: 5 })));
  assert.equal(session.filter(result => result.kind === 'reserved').length, 2);
  assert.equal(session.filter(result => result.kind === 'exhausted').length, 4);
  assert.ok(session.filter(result => result.kind === 'exhausted').every(result => result.scope === 'session'));
  const same = await Promise.all(requests.map(() => reserve({ deployment: 'same-reservation' })));
  assert.equal(same.filter(result => result.kind === 'reserved').length, 1);
  assert.equal(same.filter(result => result.kind === 'already_reserved').length, 5);
  assert.equal((await reserve({ units: -1 })).kind, 'invalid');
  assert.equal((await reserve({ units: null })).kind, 'invalid');
  assert.equal((await reserve({ deployment: 'zero-cap', sessionCalls: 0 })).kind, 'exhausted');
  await callBoundaries(reserve);
  await budgetRollback(db, reserve);
  console.log('PASS budgets: reservation replay/conflict/policy lock; concurrent deployment/session quota boundaries; same-operation reservation once');
  await privilegeScenarios(db);
}

async function privilegeScenarios(db) {
  await db.sql('CREATE ROLE public_probe;');
  for (const role of ['anon', 'authenticated', 'public_probe']) {
    await assert.rejects(db.rpc('interrogation_session_load', [literal(key('a'))], role), /permission denied/);
    await assert.rejects(db.rpc('interrogation_reserve_work', reserveArgs(), role), /permission denied/);
    await assert.rejects(db.sql(`SET ROLE ${role}; SELECT * FROM interrogation_private.game_sessions;`), /permission denied/);
    const permitted = await db.sql(`SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname LIKE 'interrogation_%'
      AND has_function_privilege(${literal(role)},p.oid,'EXECUTE');`);
    assert.equal(permitted, '0', `${role} cannot execute any hosted RPC`);
  }
  const publicGrants = await db.sql(`SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace,
    LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
    WHERE n.nspname='public' AND p.proname LIKE 'interrogation_%' AND a.grantee=0 AND a.privilege_type='EXECUTE';`);
  assert.equal(publicGrants, '0');
  await assert.rejects(db.sql('SET ROLE service_role; SELECT * FROM interrogation_private.work_usage;'), /permission denied/);
  console.log('PASS privileges: PUBLIC execute absent; anon/authenticated/unprivileged roles denied RPC and private tables; service role uses RPC only');
}

async function budgetRollback(db, reserve) {
  await db.sql(`CREATE FUNCTION public.fixture_fail_budget() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.deployment='atomic-rollback' AND NEW.session_key='' THEN
      RAISE EXCEPTION 'fixture rollback'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER fixture_fail_budget BEFORE UPDATE ON interrogation_private.work_usage
    FOR EACH ROW EXECUTE FUNCTION public.fixture_fail_budget();`);
  await assert.rejects(reserve({ deployment: 'atomic-rollback' }), /fixture rollback/);
  assert.equal(await db.sql(`SELECT count(*) FROM interrogation_private.work_reservations
    WHERE deployment='atomic-rollback';`), '0');
  assert.equal(await db.sql(`SELECT count(*) FROM interrogation_private.work_usage
    WHERE deployment='atomic-rollback';`), '0');
  await db.sql('DROP TRIGGER fixture_fail_budget ON interrogation_private.work_usage; DROP FUNCTION public.fixture_fail_budget();');
  assert.equal((await reserve({ deployment: 'atomic-rollback' })).kind, 'reserved');
  console.log('PASS reservation transaction rollback: forced counter-write error leaves no reservation or counters; retry reserves once');
}

async function callBoundaries(reserve) {
  for (const scope of ['session', 'deployment']) {
    const results = await Promise.all(['1', '2', '3'].map(digit => reserve({
      deployment: `${scope}-call-boundary`, operation: key(digit),
      sessionCalls: scope === 'session' ? 1 : 10,
      deploymentCalls: scope === 'deployment' ? 1 : 10,
    })));
    assert.equal(results.filter(result => result.kind === 'reserved').length, 1);
    assert.equal(results.filter(result => result.kind === 'exhausted' && result.scope === scope).length, 2);
  }
}
