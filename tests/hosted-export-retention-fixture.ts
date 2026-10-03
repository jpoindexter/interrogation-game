import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { HostedSessionStorage } from '../src/lib/storage/hosted/session';
import { HostedRedemptionStorage } from '../src/lib/storage/hosted/redemption';
import { hashKey, type HostedSnapshot } from '../src/lib/storage/hosted/contracts';
import type { GameExport } from '../src/lib/session/exports/storage';
import type { HostedRpc } from '../src/lib/storage/hosted/rpc';
import { isolatedPostgres, json, literal } from './hosted-storage-postgres-cluster.mjs';

export type Database = Awaited<ReturnType<typeof isolatedPostgres>>;
export function transport(db: Database): HostedRpc {
  return (name, args) => db.rpc(name, Object.entries(args).map(([key, value]) => {
    assert.match(key, /^p_[a-z_]+$/);
    return `${key} => ${value === null ? 'NULL' : typeof value === 'object' ? json(value)
      : typeof value === 'number' || typeof value === 'boolean' ? String(value) : literal(value)}`;
  }));
}
export async function seed(db: Database, scored = true, ranked = true) {
  const sessions = new HostedSessionStorage(transport(db)), scores = new HostedRedemptionStorage(transport(db));
  const id = randomBytes(24).toString('hex'), winToken = randomBytes(16).toString('hex'), now = Date.now();
  const caseData = { difficulty: 'easy', setting: 'startup', case_number: 'RETENTION', suspect_name: 'Fixture',
    playMode: ranked ? 'challenge' : 'relaxed' };
  const record: HostedSnapshot = { version: 1, revision: 0, requests: {}, session: { id,
    caseData, conversationHistory: [], createdAt: now - 1000, startTime: now - 1000, lastActivity: now,
    endedAt: null, status: 'active', outcome: null, timerMode: ranked ? 'countdown' : 'unlimited',
    hintsUsed: 0, accusationsUsed: 0, questionsAsked: 1, currentStress: 2, cluesCollected: 1 } };
  assert.equal((await sessions.create(record)).kind, 'created');
  const action = await sessions.claim({ sessionId: id, requestId: 'fixture-terminal', fingerprint: hashKey('win') });
  assert.equal(action.kind, 'claimed'); if (action.kind !== 'claimed') throw Error('Fixture claim failed');
  const stats = { difficulty: 'easy', timeElapsed: 1, playMode: caseData.playMode, ranked,
    hintsUsed: 0, accusationsUsed: 1, questionsAsked: 1, score: 1498, detectiveRating: 'Veteran' };
  const terminal: HostedSnapshot = { ...action.record, session: { ...action.record.session, winToken,
    status: 'won', outcome: 'win', endedAt: now, accusationsUsed: 1, acceptedAccusation: { text: 'Fixture contradiction' } },
  token: { issuedAt: now, consumed: false, snapshot: { stats,
    caseNumber: 'RETENTION', caseSetting: 'startup', suspectName: 'Fixture', stressLevel: 2, cluesFound: 1 } } };
  const exported: GameExport = { session_id: id, case_data: caseData, conversation: [], outcome: 'win',
    difficulty: 'easy', setting: 'startup', stats: { ...stats, maxStress: 2, cluesCollected: 1 },
    accusation_text: 'Fixture contradiction', accusation_correct: true, created_at: new Date(now).toISOString() };
  const response = { status: 200, body: { correct: true } };
  assert.equal((await sessions.complete(action, terminal, response, exported)).kind, 'committed');
  const submission = { sessionId: id, winToken, playerName: 'ABC' };
  const redeemed = scored ? await scores.redeem(submission) : null;
  if (scored) assert.equal(redeemed?.kind, 'redeemed');
  return { id, key: hashKey(id), submission, record, action, terminal, exported, response,
    receipt: redeemed && 'receipt' in redeemed ? redeemed.receipt : null };
}
export type Fixture = Awaited<ReturnType<typeof seed>>;
export async function age(db: Database, fixture: Fixture, days = 31) {
  await db.sql(`UPDATE interrogation_private.game_sessions SET expires_at=clock_timestamp()-make_interval(days=>${days})
    WHERE session_key=${literal(fixture.key)};`);
}
export async function snapshot(db: Database) {
  const tables = (await db.sql(`SELECT quote_ident(table_schema)||'.'||quote_ident(table_name)
    FROM information_schema.tables WHERE table_schema IN ('interrogation_private','public')
    AND table_type='BASE TABLE' ORDER BY table_schema,table_name;`)).split('\n');
  return Promise.all(tables.map(table => db.sql(`SELECT coalesce(jsonb_agg(row ORDER BY row::text),'[]')
    FROM (SELECT to_jsonb(t) row FROM ${table} t) rows;`)));
}
export async function waitForSleep(db: Database, name: string) {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await db.sql(`SELECT count(*) FROM pg_stat_activity WHERE application_name=${literal(name)} AND wait_event='PgSleep';`) === '1') return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error('Fixture lock was not acquired');
}
export const exportInsert = (fixture: Fixture) => `INSERT INTO public.game_exports
  (session_id,case_data,conversation,outcome,difficulty,stats)
  VALUES(${literal(fixture.id)},'{}','[]','win','easy','{}');`;
