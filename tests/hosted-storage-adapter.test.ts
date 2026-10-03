import assert from 'node:assert/strict';
import test from 'node:test';
import { HostedSessionStorage } from '../src/lib/storage/hosted/session';
import { HostedWorkStorage, type WorkReservation } from '../src/lib/storage/hosted/budget';
import { hashKey, type HostedSnapshot } from '../src/lib/storage/hosted/contracts';
import { HostedStorageError, supabaseRpc } from '../src/lib/storage/hosted/rpc';

const sessionId = 'a'.repeat(48);
const fingerprint = hashKey('synthetic action');
const record: HostedSnapshot = { version: 1, revision: 0, requests: {},
  session: { id: sessionId, status: 'active', outcome: null } };

test('async session adapter binds keys and validates claim, commit, replay and storage uncertainty', async t => {
  const old = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
  process.env.SUPABASE_URL = 'https://hosted-adapter-fixture.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'synthetic-key';
  t.after(() => {
    if (old.url === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = old.url;
    if (old.key === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = old.key;
  });
  let next: unknown = { kind: 'created', record };
  let status = 200;
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, options: RequestInit) => {
    const url = new URL(String(input));
    assert.equal(url.origin, process.env.SUPABASE_URL);
    assert.equal(options.redirect, 'error');
    calls.push({ name: url.pathname.split('/').at(-1)!, args: JSON.parse(String(options.body)) });
    return Response.json(next, { status });
  });
  const storage = new HostedSessionStorage();
  assert.equal((await storage.create(record)).kind, 'created');
  assert.equal(calls[0].args.p_key, hashKey(sessionId));
  next = { kind: 'claimed', record, revision: 0, fence: 1, leaseUntil: Date.now() + 180_000 };
  const claim = await storage.claim({ sessionId, requestId: 'action-0001', fingerprint });
  assert.equal(claim.kind, 'claimed');
  if (claim.kind !== 'claimed') throw Error('Missing claim');
  assert.equal(calls[1].args.p_request_key, hashKey('action-0001'));
  const response = { status: 200, body: { accepted: true } };
  next = { kind: 'committed', record: { ...record, revision: 1 }, response };
  assert.equal((await storage.complete(claim, record, response)).kind, 'committed');
  next = { kind: 'replay', response };
  assert.deepEqual(await storage.claim({ sessionId, requestId: 'action-0001', fingerprint }), next);
  next = { kind: 'loaded', record: { ...record, session: { ...record.session, id: 'b'.repeat(48) } } };
  await assert.rejects(storage.load(sessionId), { code: 'INVALID_STORAGE_RESPONSE' });
  const before = calls.length;
  status = 503; next = { message: 'synthetic private server detail' };
  await assert.rejects(supabaseRpc('interrogation_session_load', { p_key: hashKey(sessionId) }), error =>
    error instanceof HostedStorageError && error.code === 'STORAGE_UNAVAILABLE' && !error.message.includes('private'));
  assert.equal(calls.length, before + 1, 'SDK retries are disabled for ambiguous storage effects');
});

test('work adapter distinguishes reserved replay from new permission and rejects mismatched receipts', async () => {
  const input: WorkReservation = { deployment: 'fixture', sessionId, operationId: 'action-0001:draft', fingerprint,
    scope: 'ai', units: 80, policy: { sessionCalls: 3, sessionUnits: 100, deploymentCalls: 8, deploymentUnits: 400, windowSeconds: 60 } };
  let next: unknown = { kind: 'reserved', scope: 'ai', units: 80, windowStart: 120, windowEnd: 180 };
  const storage = new HostedWorkStorage(async (name, args) => {
    assert.equal(name, 'interrogation_reserve_work');
    assert.equal(args.p_session_key, hashKey(sessionId));
    assert.equal(args.p_operation_key, hashKey(input.operationId));
    return next;
  });
  assert.equal((await storage.reserve(input)).kind, 'reserved');
  next = { kind: 'already_reserved', scope: 'ai', units: 80, windowStart: 120, windowEnd: 180 };
  assert.equal((await storage.reserve(input)).kind, 'already_reserved');
  next = { kind: 'already_reserved', scope: 'ai', units: 81, windowStart: 120, windowEnd: 180 };
  await assert.rejects(storage.reserve(input), { code: 'INVALID_STORAGE_RESPONSE' });
  next = { kind: 'exhausted', scope: 'deployment' };
  assert.deepEqual(await storage.reserve(input), next);
});
