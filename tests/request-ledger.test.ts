import assert from 'node:assert/strict';
import test from 'node:test';
import { RequestLedger } from '../app/game/state/request-ledger';

void test('transport ambiguity retains ID, acknowledged failure permits deliberate new attempt', () => {
  let sequence = 0;
  const ledger = new RequestLedger(() => `request-${++sequence}`);
  const first = ledger.begin('/api/accuse', { sessionId: 'abc', accusation: 'The timeline contradicts you' });
  const retry = ledger.begin('/api/accuse', { accusation: 'The timeline contradicts you', sessionId: 'abc' });
  assert.equal(first.id, retry.id);
  retry.acknowledge();
  assert.notEqual(first.id, ledger.begin('/api/accuse', { sessionId: 'abc', accusation: 'The timeline contradicts you' }).id);
});

void test('different actions never reuse an uncertain request ID', () => {
  const ledger = new RequestLedger();
  const first = ledger.begin('/api/interrogate', { sessionId: 'abc', playerQuestion: 'Where were you?' });
  assert.notEqual(first.id, ledger.begin('/api/interrogate', { sessionId: 'abc', playerQuestion: 'Who was there?' }).id);
  assert.notEqual(first.id, ledger.begin('/api/accuse', { sessionId: 'abc', playerQuestion: 'Where were you?' }).id);
});
