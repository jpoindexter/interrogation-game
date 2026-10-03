import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NextRequest } from 'next/server';
import { PATTERN_SCHEMA_VERSION, EMBEDDING_SPACE, requireRetrievalConfig } from '../src/lib/ai/retrieval/config';
import { embedTexts } from '../src/lib/ai/retrieval/embeddings';
import { commitTurn } from '../src/lib/session/turn';
import { authoredCaseData, attachAuthoredGameplay, acceptAuthoredOpening, pinSessionStatement } from '../src/lib/gameplay/session';
import { prepareDialogueAction, commitDialogueAction } from '../src/lib/gameplay/challenges';
import { LEDGER_DEMO_CASE } from '../src/lib/gameplay/demo-case';
import { canonicalPattern, summarizePatterns } from '../src/lib/ai/retrieval/patterns';
import { storeSessionPattern } from '../src/lib/ai/retrieval/service';
import { retrieveLearnedTactics } from '../src/lib/session/learning';
import { createSession, getSession, deleteSession } from '../src/lib/session/store';
import { GET, POST } from '../app/api/patterns/route';

const enabled = { AI_RAG_ENABLED: 'true', RAG_EMBEDDING_VERSION: EMBEDDING_SPACE.version, OPENAI_API_KEY: 'mock-key' };
const vector = Array.from({ length: 1536 }, () => 0.1);
function mockResponse(patch = {}) {
  return Response.json({ model: EMBEDDING_SPACE.model, data: [{ index: 0, embedding: vector }], ...patch });
}
function sessionFixture() {
  const id = createSession({ setting: 'Fictional Ledger Office', difficulty: 'easy' });
  const session = getSession(id)!;
  session.status = 'lost'; session.outcome = 'lose_giveup';
  session.startTime = Date.now() - 10000; session.endedAt = Date.now();
  session.conversationHistory = [{ role: 'user', content: '*Opening*' },
    { role: 'user', kind: 'question', content: 'When did you return to the office?' },
    { role: 'assistant', content: 'Just after six.' }, { role: 'user', content: '[ACCUSATION] false claim' }];
  return session;
}

test('default-off GET, POST and new-case retrieval perform no fetch or log', async () => {
  const previous = process.env.AI_RAG_ENABLED; delete process.env.AI_RAG_ENABLED;
  const original = globalThis.fetch; const warn = console.warn;
  globalThis.fetch = async () => { throw new Error('Disabled retrieval attempted network'); };
  console.warn = () => { throw new Error('Disabled retrieval logged a warning'); };
  try {
    const get = await GET(new NextRequest('http://localhost/api/patterns'));
    const post = await POST(new NextRequest('http://localhost/api/patterns', { method: 'POST', body: 'bad-json' }));
    for (const response of [get, post]) {
      assert.equal(response.status, 200); assert.equal((await response.json()).status, 'disabled');
    }
    assert.deepEqual(await retrieveLearnedTactics({ request: new NextRequest('http://localhost'), difficulty: 'easy' }),
      { learnedTactics: [], totalPriorGames: 0 });
  } finally {
    globalThis.fetch = original; console.warn = warn;
    if (previous === undefined) delete process.env.AI_RAG_ENABLED; else process.env.AI_RAG_ENABLED = previous;
  }
});

test('embedding opt-in requires exact version and key before network', async () => {
  assert.throws(() => requireRetrievalConfig({}), /disabled/);
  assert.throws(() => requireRetrievalConfig({ ...enabled, RAG_EMBEDDING_VERSION: 'mistral-1024' }), /versioned/);
  assert.throws(() => requireRetrievalConfig({ ...enabled, OPENAI_API_KEY: '' }), /OPENAI_API_KEY/);
  let calls = 0;
  await assert.rejects(embedTexts(['fixture'], { env: {}, fetcher: async () => { calls++; return mockResponse(); } }));
  assert.equal(calls, 0);
});

test('embedding adapter sends fixed versioned space and validates every vector', async () => {
  const result = await embedTexts(['fictional question'], { env: enabled, fetcher: async (url, init) => {
    assert.equal(url, 'https://api.openai.com/v1/embeddings');
    assert.deepEqual(JSON.parse(String(init?.body)), { model: EMBEDDING_SPACE.model,
      dimensions: 1536, encoding_format: 'float', input: ['fictional question'] });
    return mockResponse();
  } });
  assert.deepEqual(result, [vector]);
  for (const patch of [{ model: 'mistral-embed' }, { data: [{ index: 0, embedding: vector.slice(0, 1024) }] },
    { data: [{ index: 1, embedding: vector }] }, { data: [{ index: 0, embedding: [...vector.slice(1), null] }] }]) {
    await assert.rejects(embedTexts(['fiction'], { env: enabled, fetcher: async () => mockResponse(patch) }));
  }
});

test('storage derives facts from terminal server session and rejects unfinished before embedding', async () => {
  const previous = process.env.AI_RAG_ENABLED; process.env.AI_RAG_ENABLED = 'true';
  const session = sessionFixture(); let calls = 0;
  const dependencies = { embed: async () => { calls++; return vector; }, save: async (pattern: ReturnType<typeof canonicalPattern>) => {
    assert.equal(pattern.outcome, 'lose_giveup'); assert.equal(pattern.clues_found, 0);
    assert.deepEqual(pattern.questions, ['When did you return to the office?']);
    assert.deepEqual(pattern.question_evidence, []); // Old sessions have no inferred event attribution.
    assert.equal(pattern.schema_version, PATTERN_SCHEMA_VERSION);
    assert.deepEqual(pattern.case_provenance, []);
    assert.equal(pattern.source, 'observed_game'); assert.ok(!('effective_questions' in pattern));
  } };
  try {
    assert.equal((await storeSessionPattern(session, dependencies)).stored, true);
    session.status = 'active'; session.outcome = null; session.endedAt = null;
    await assert.rejects(storeSessionPattern(session, dependencies), /completed server session/);
    assert.equal(calls, 1);
    const response = await POST(new NextRequest('http://localhost/api/patterns', { method: 'POST',
      body: JSON.stringify({ sessionId: session.id, outcome: 'win', cluesFound: 999, effectiveQuestions: ['Spoofed success'] }) }));
    assert.equal(response.status, 409);
  } finally {
    deleteSession(session.id);
    if (previous === undefined) delete process.env.AI_RAG_ENABLED; else process.env.AI_RAG_ENABLED = previous;
  }
});

test('retrieval excludes wrong versions, dimensions, models and authored fixtures', () => {
  const session = sessionFixture();
  try {
    const valid = { ...canonicalPattern(session), outcome: 'win' as const };
    const invalid = [{ ...valid, embedding_version: 'legacy' }, { ...valid, embedding_dimensions: 1024 },
      { ...valid, embedding_model: 'mistral-embed' }, { ...valid, source: 'authored_fixture' }, { ...valid, schema_version: 'legacy' }];
    const result = summarizePatterns([valid, ...invalid] as Parameters<typeof summarizePatterns>[0]);
    assert.equal(result.totalGames, 1);
    assert.deepEqual(result.tactics, []); // Winning alone cannot make a question an evidence example.
    assert.match(result.interpretation, /effectiveness is not established/);
    assert.ok(!('winRate' in result));
  } finally { deleteSession(session.id); }
});

test('actual POST ignores spoofed client outcome and persists canonical terminal facts through mocked adapters', async () => {
  const overrides = { ...enabled, SUPABASE_URL: 'https://patterns-test.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'mock-server-key' };
  const previous = Object.fromEntries(Object.keys(overrides).map(key => [key, process.env[key]]));
  Object.assign(process.env, overrides);
  const original = globalThis.fetch; const session = sessionFixture();
  let persisted: Record<string, unknown> | null = null;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === 'https://api.openai.com/v1/embeddings') return mockResponse();
    assert.match(url, /^https:\/\/patterns-test.supabase.co\/rest\/v1\/interrogation_patterns_v3\?/);
    persisted = JSON.parse(String(init?.body));
    return new Response(null, { status: 201 });
  };
  try {
    const response = await POST(new NextRequest('http://localhost/api/patterns', { method: 'POST',
      headers: { 'x-mistral-api-key': 'untrusted-key', 'x-supabase-url': 'https://evil.example' },
      body: JSON.stringify({ sessionId: session.id, outcome: 'win', difficulty: 'expert', cluesFound: 999,
        timeElapsed: 0, questions: ['forged'], effectiveQuestions: ['invented effectiveness'] }) }));
    assert.equal(response.status, 200); assert.equal((await response.json()).stored, true);
    assert.ok(persisted);
    assert.equal((persisted as Record<string, unknown>).outcome, 'lose_giveup');
    assert.equal((persisted as Record<string, unknown>).difficulty, 'easy');
    assert.equal((persisted as Record<string, unknown>).clues_found, 0);
    assert.deepEqual((persisted as Record<string, unknown>).questions, ['When did you return to the office?']);
  } finally {
    globalThis.fetch = original; deleteSession(session.id);
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});


test('accepted clue and authored challenge events ground questions without attributing causality', () => {
  const session = sessionFixture();
  try {
    session.status = 'active'; session.outcome = null; session.endedAt = null;
    session.questionsAsked = 2; session.currentStress = 2;
    session.caseData.the_contradiction = 'The visitor record identifies the return after six.';
    const provenance = { provider: 'fixture', model: 'fixture-model', capability: 'suspect' as const, promptHash: 'a'.repeat(64) };
    commitTurn(session, 'Which record confirms that you returned to the office?', {
      spoken_response: 'There was a visitor record at the desk.', stress_level: 3,
      clue_unlocked: 'Check the visitor record.', _aiProvenance: provenance,
    });
    session.status = 'won'; session.outcome = 'win'; session.endedAt = Date.now();
    const pattern = canonicalPattern(session);
    assert.equal(pattern.turn_events.length, 1);
    assert.equal(pattern.turn_events[0].stressBefore, 2);
    assert.equal(pattern.turn_events[0].stressAfter, 3);
    assert.deepEqual(pattern.turn_events[0].provenance, provenance);
    assert.deepEqual(pattern.question_evidence[0].clueIds, session.clues.map(clue => clue.id));
    assert.deepEqual(summarizePatterns([pattern]).tactics, ['which record confirms that you returned to the office?']);
    session.caseData = authoredCaseData(); attachAuthoredGameplay(session);
    session.status = 'active'; session.outcome = null; session.endedAt = null; session.conversationHistory = [];
    acceptAuthoredOpening(session, '*Opening*');
    const state = session.gameplay!;
    const statement = pinSessionStatement(session, state.turns[0].id);
    const link = LEDGER_DEMO_CASE.contradictions[0];
    const action = { id: 'accepted-evidence-01', kind: 'present_evidence', statementId: statement.id,
      exhibitId: link.exhibitId, question: 'How does your account fit this signed visitor record?' };
    const prepared = prepareDialogueAction(state, LEDGER_DEMO_CASE, action);
    assert.equal(prepared.kind, 'ready'); if (prepared.kind !== 'ready') return;
    commitDialogueAction(state, LEDGER_DEMO_CASE, { actionId: action.id, attempt: prepared.attempt, answer: 'I see the record.' });
    session.status = 'won'; session.outcome = 'win'; session.endedAt = Date.now();
    const authored = canonicalPattern(session);
    assert.equal(authored.question_evidence.length, 1);
    assert.equal(authored.question_evidence[0].source, 'authored_contradiction');
    assert.equal(authored.question_evidence[0].actionId, action.id);
    assert.equal(authored.question_evidence[0].contradictionId, link.id);
    assert.deepEqual(summarizePatterns([authored]).tactics, [action.question.toLowerCase()]);
  } finally { deleteSession(session.id); }
});
