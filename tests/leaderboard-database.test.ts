import assert from 'node:assert/strict';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { databaseConfiguration, databaseConfigured, getSupabaseClient } from '../src/lib/db';
import { databaseFetch } from '../src/lib/config/database-fetch';
import { leaderboardStorageMode } from '../src/lib/leaderboard/store';
import { SupabaseLeaderboardStore } from '../src/lib/leaderboard/supabase-store';
import { redeemWin } from '../src/lib/leaderboard/redemption';
import type { LeaderboardRow } from '../src/lib/leaderboard/types';
import { leaderboardFixture } from './leaderboard-fixtures';

void test('hosted storage requires explicit configuration and rejects a local filesystem backend', () => {
  assert.equal(leaderboardStorageMode({}), 'local');
  assert.throws(() => leaderboardStorageMode({ VERCEL: '1' }), /Set LEADERBOARD_STORAGE/);
  assert.throws(() => leaderboardStorageMode({ VERCEL: '1', LEADERBOARD_STORAGE: 'local' }), /not supported/);
  assert.throws(() => leaderboardStorageMode({ LEADERBOARD_STORAGE: 'supabase' }), /incomplete/);
  assert.throws(() => databaseConfiguration({ SUPABASE_URL: 'http://insecure.invalid', SUPABASE_SERVICE_ROLE_KEY: 'synthetic' }), /HTTPS/);
});

void test('request-controlled database headers cannot replace trusted server configuration', async context => {
  const oldUrl = process.env.SUPABASE_URL;
  const oldKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  context.after(() => {
    if (oldUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = oldKey;
  });
  process.env.SUPABASE_URL = 'https://trusted-project.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'synthetic-server-key';
  const request = new NextRequest('http://localhost/api/leaderboard', {
    headers: { 'x-supabase-url': 'http://127.0.0.1:1/private', 'x-supabase-anon-key': 'synthetic-attacker-key' },
  });
  let destination = '';
  let redirectMode: RequestRedirect | undefined;
  context.mock.method(globalThis, 'fetch', async (input: string | URL | Request, options?: RequestInit) => {
    redirectMode = options?.redirect;
    destination = String(input); return Response.json([]);
  });
  await getSupabaseClient(request).from('leaderboard').select('id');
  assert.equal(new URL(destination).origin, 'https://trusted-project.supabase.co');
  assert.equal(redirectMode, 'error');
});

void test('Supabase adapter uses conflict-ignore persistence and removes private fields from reads', async context => {
  const fixture = await leaderboardFixture(context);
  const saved = await redeemWin(fixture.body, fixture.store);
  const canonical = (await fixture.store.find(fixture.body.sessionId))!;
  let row: LeaderboardRow | undefined;
  const preferences: string[] = [];
  const transport: typeof fetch = async (input, options) => {
    const url = new URL(String(input));
    assert.equal(url.origin, 'https://synthetic.invalid');
    if (options?.method === 'POST') {
      preferences.push(new Headers(options.headers).get('prefer') || '');
      assert.equal(url.searchParams.get('on_conflict'), 'session_id');
      row ??= JSON.parse(String(options.body));
      return new Response('', { status: 201 });
    }
    return Response.json(row ? [row] : []);
  };
  const client = createClient('https://synthetic.invalid', 'synthetic-service-key', {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: transport },
  });
  const store = new SupabaseLeaderboardStore(client);
  assert.equal((await store.insert(canonical)).id, saved.id);
  assert.equal((await store.insert({ ...canonical, player_name: 'XYZ' })).player_name, 'ABC');
  assert.ok(preferences.every(value => value.includes('resolution=ignore-duplicates')));
  const publicRows = await store.list();
  assert.equal('redemption_hash' in publicRows[0], false);
  assert.equal('session_id' in publicRows[0], false);
});

void test('database configuration rejects private, local and lookalike targets without outbound calls', context => {
  let calls = 0;
  context.mock.method(globalThis, 'fetch', async () => { calls++; return Response.json([]); });
  const invalid = ['https://localhost', 'https://127.0.0.1', 'https://10.0.0.1', 'https://172.16.0.1',
    'https://192.168.1.1', 'https://169.254.169.254', 'https://[::1]', 'https://[fc00::1]',
    'https://2130706433', 'https://0177.0.0.1', 'https://project.supabase.co.attacker.invalid',
    'https://supabase.co', 'https://a.b.supabase.co', 'https://project.supabase.co:8443',
    'https://project.supabase.co/private', 'https://api.example.com',
    'http://project.supabase.co', 'ftp://project.supabase.co', 'https://user@project.supabase.co',
    'https://project.supabase.co?target=localhost', 'https://project.supabase.co#fragment'];
  for (const url of invalid) {
    const environment = { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: 'synthetic' };
    assert.throws(() => databaseConfiguration(environment));
    assert.equal(databaseConfigured(environment), false);
  }
  assert.equal(databaseConfiguration({ SUPABASE_URL: 'https://my-project.supabase.co/',
    SUPABASE_SERVICE_ROLE_KEY: 'synthetic' }).url, 'https://my-project.supabase.co');
  assert.equal(calls, 0);
});

void test('database transport blocks changed destinations and rejects redirect responses', async context => {
  let calls = 0;
  context.mock.method(globalThis, 'fetch', async (_input: string | URL | Request, options?: RequestInit) => {
    calls++;
    assert.equal(options?.redirect, 'error');
    return new Response(null, { status: 302, headers: { location: 'https://127.0.0.1/private' } });
  });
  const transport = databaseFetch('https://trusted-project.supabase.co');
  await assert.rejects(transport('https://127.0.0.1/private'), /destination/);
  await assert.rejects(transport('https://other-project.supabase.co/rest/v1/leaderboard'), /destination/);
  assert.equal(calls, 0);
  await assert.rejects(transport('https://trusted-project.supabase.co/rest/v1/leaderboard', { redirect: 'follow' }), /redirects/);
  assert.equal(calls, 1, 'only the permitted origin is contacted; the redirect destination is never requested');
  const client = createClient('https://trusted-project.supabase.co', 'synthetic-server-key', {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: transport },
  });
  const result = await client.from('leaderboard').select('id').retry(false);
  assert.equal(result.data, null);
  assert.match(result.error?.message ?? '', /redirects are not allowed/);
  assert.equal(calls, 2, 'SDK failure is surfaced without following the redirect');
});
