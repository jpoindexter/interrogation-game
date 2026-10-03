import assert from 'node:assert/strict';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { databaseConfiguration, getSupabaseClient } from '../src/lib/db';
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
  process.env.SUPABASE_URL = 'https://trusted.invalid';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'synthetic-server-key';
  const request = new NextRequest('http://localhost/api/leaderboard', {
    headers: { 'x-supabase-url': 'http://127.0.0.1:1/private', 'x-supabase-anon-key': 'synthetic-attacker-key' },
  });
  let destination = '';
  context.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    destination = String(input); return Response.json([]);
  });
  await getSupabaseClient(request).from('leaderboard').select('id');
  assert.equal(new URL(destination).origin, 'https://trusted.invalid');
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
