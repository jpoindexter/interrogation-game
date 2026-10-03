import assert from 'node:assert/strict';
import test from 'node:test';
import { chmodSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { rateLimit, rateLimitDecision } from '../src/lib/rate-limit';
import { reserveVoiceUsage } from '../src/lib/voice/budget';
import { VoiceError } from '../src/lib/voice/errors';
import { budgetDirectory, budgetWorkers } from './budget-fixtures';
import { acquireFileLock, releaseFileLock } from '../src/lib/session/file-lock';
import { budgetKey } from '../src/lib/limits/repository';

const voiceStatus = (status: number) => (error: unknown) => error instanceof VoiceError && error.status === status;

void test('actual simultaneous processes never overspend an endpoint; restart retains consumption', async () => {
  const fixture = budgetDirectory();
  try {
    const results = await budgetWorkers(fixture.directory, 'endpoint', 'private-endpoint-key', 3, 8);
    let consumed = results.filter(result => result === 'true').length;
    assert.ok(consumed > 0 && consumed <= 3);
    while (rateLimit('private-endpoint-key', 3)) consumed++;
    assert.equal(consumed, 3);
    assert.deepEqual(await budgetWorkers(fixture.directory, 'endpoint', 'private-endpoint-key', 3, 1), ['false']);
  } finally { fixture.cleanup(); }
});
void test('actual simultaneous voice reservations share both caps and survive fresh processes', async () => {
  const fixture = budgetDirectory();
  try {
    const results = await budgetWorkers(fixture.directory, 'voice', 'private-session-key', 25, 8);
    assert.equal(results.filter(result => result === 'true').length, 4);
    assert.equal(results.filter(result => result === '429').length, 4);
    assert.deepEqual(await budgetWorkers(fixture.directory, 'voice', 'private-session-key', 1, 1), ['429']);
    reserveVoiceUsage('private-session-key', 'speechCharacters', 60_000);
    assert.throws(() => reserveVoiceUsage('private-session-key', 'speechCharacters', 1), voiceStatus(429));
    const path = join(fixture.directory, 'limits/usage.json');
    assert.equal(statSync(path).mode & 0o777, 0o600);
    assert.equal(statSync(join(fixture.directory, 'limits')).mode & 0o777, 0o700);
    assert.doesNotMatch(readFileSync(path, 'utf8'), /private-session-key/);
  } finally { fixture.cleanup(); }
});
void test('a live owner is never displaced; actual dead-process lock is safely recovered', async () => {
  const fixture = budgetDirectory();
  try {
    const path = join(fixture.directory, 'limits/usage.lock');
    const nonce = acquireFileLock(path)!;
    assert.equal(rateLimit('locked'), false);
    assert.throws(() => reserveVoiceUsage('locked', 'recordings', 1), voiceStatus(503));
    assert.equal(JSON.parse(readFileSync(path, 'utf8')).nonce, nonce);
    releaseFileLock(path, nonce);
    await budgetWorkers(fixture.directory, 'crash-lock', 'unused', 1, 1);
    assert.equal(rateLimit('recovered'), true);
  } finally { fixture.cleanup(); }
});
void test('malformed and unwritable storage deny both budgets without resetting existing data', () => {
  const fixture = budgetDirectory();
  try {
    const directory = join(fixture.directory, 'limits');
    mkdirSync(directory, { mode: 0o700 });
    const path = join(directory, 'usage.json');
    writeFileSync(path, 'malformed', { mode: 0o600 });
    assert.equal(rateLimit('corrupt'), false);
    assert.throws(() => reserveVoiceUsage('corrupt', 'recordings', 1), voiceStatus(503));
    assert.equal(readFileSync(path, 'utf8'), 'malformed');
    writeFileSync(path, JSON.stringify({ version: 1, entries: {} }));
    chmodSync(directory, 0o500);
    assert.equal(rateLimit('unwritable'), false);
    assert.throws(() => reserveVoiceUsage('unwritable', 'recordings', 1), voiceStatus(503));
    chmodSync(directory, 0o700);
  } finally { fixture.cleanup(); }
});
void test('expiry prunes only under transaction; active entries remain bounded and consumed', () => {
  const fixture = budgetDirectory();
  try {
    reserveVoiceUsage('expired', 'recordings', 100);
    reserveVoiceUsage('active', 'recordings', 100);
    const path = join(fixture.directory, 'limits/usage.json');
    const ledger = JSON.parse(readFileSync(path, 'utf8'));
    ledger.entries[budgetKey('voice', 'expired')].lastUsed -= 2 * 60 * 60_000 + 1;
    writeFileSync(path, JSON.stringify(ledger));
    reserveVoiceUsage('expired', 'recordings', 1);
    assert.throws(() => reserveVoiceUsage('active', 'recordings', 1), voiceStatus(429));
    assert.equal(Object.keys(JSON.parse(readFileSync(path, 'utf8')).entries).length, 2);
  } finally { fixture.cleanup(); }
});
void test('invalid units/capacities and hosted storage never receive an allowance', () => {
  const fixture = budgetDirectory();
  const previous = process.env.VERCEL;
  try {
    for (const invalid of [-1, 1.5, NaN, Infinity]) {
      assert.throws(() => reserveVoiceUsage('invalid', 'recordings', invalid), voiceStatus(400));
      assert.equal(rateLimit('invalid', invalid), false);
    }
    assert.equal(rateLimit('invalid', 0), false);
    reserveVoiceUsage('zero', 'recordings', 0);
    process.env.VERCEL = '1';
    assert.equal(rateLimit('hosted'), false);
    assert.throws(() => reserveVoiceUsage('hosted', 'recordings', 1), voiceStatus(503));
  } finally {
    if (previous === undefined) delete process.env.VERCEL; else process.env.VERCEL = previous;
    fixture.cleanup();
  }
});
void test('endpoint refill and backward clocks cannot manufacture an extra token', () => {
  const fixture = budgetDirectory();
  try {
    assert.equal(rateLimit('clock', 2), true);
    assert.equal(rateLimit('clock', 2), true);
    const path = join(fixture.directory, 'limits/usage.json');
    const hash = budgetKey('endpoint', 'clock');
    const ledger = JSON.parse(readFileSync(path, 'utf8'));
    ledger.entries[hash].lastUsed += 60_000;
    writeFileSync(path, JSON.stringify(ledger));
    assert.equal(rateLimit('clock', 2), false);
    ledger.entries[hash].lastUsed = Date.now() - 30_100;
    ledger.entries[hash].tokens = 0;
    writeFileSync(path, JSON.stringify(ledger));
    assert.equal(rateLimit('clock', 2), true);
    assert.equal(rateLimit('clock', 2), false);
    assert.equal(rateLimit('clock', 3), false);
  } finally { fixture.cleanup(); }
});
void test('full retention fails closed and removes expired entries before admitting a new key', () => {
  const fixture = budgetDirectory();
  try {
    assert.equal(rateLimit('setup'), true);
    const path = join(fixture.directory, 'limits/usage.json');
    const entries: Record<string, unknown> = {};
    for (let index = 0; index < 10_000; index++) {
      entries[budgetKey('voice', `retained-${index}`)] = {
        kind: 'voice', speechCharacters: 0, recordings: 100, lastUsed: Date.now(),
      };
    }
    writeFileSync(path, JSON.stringify({ version: 1, entries }));
    assert.equal(rateLimit('new-key'), false);
    assert.throws(() => reserveVoiceUsage('new-key', 'recordings', 1), voiceStatus(503));
    const expired = entries[budgetKey('voice', 'retained-0')] as { lastUsed: number };
    expired.lastUsed = Date.now() - 2 * 60 * 60_000 - 1;
    writeFileSync(path, JSON.stringify({ version: 1, entries }));
    reserveVoiceUsage('new-key', 'recordings', 1);
    assert.equal(Object.keys(JSON.parse(readFileSync(path, 'utf8')).entries).length, 10_000);
    assert.throws(() => reserveVoiceUsage('retained-1', 'recordings', 1), voiceStatus(429));
  } finally { fixture.cleanup(); }
});

void test('typed endpoint decision distinguishes exhausted allowance from unavailable storage', () => {
  const fixture = budgetDirectory();
  try {
    assert.equal(rateLimitDecision('typed', 1), 'allowed');
    assert.equal(rateLimitDecision('typed', 1), 'exhausted');
    const path = join(fixture.directory, 'limits/usage.lock');
    const nonce = acquireFileLock(path)!;
    try { assert.equal(rateLimitDecision('typed', 1), 'unavailable'); }
    finally { releaseFileLock(path, nonce); }
  } finally { fixture.cleanup(); }
});
