// Opt-in connected acceptance: controlled provider HTTP, real route and isolated filesystem store.
import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextRequest } from 'next/server';
import { POST as accuse } from '../app/api/accuse/route';
import { accusationAction } from '../app/game/controller/accusation-action';
import { useGameFeedback } from '../app/game/controller/useGameFeedback';
import AccuseConfirmDialog from '../app/game/components/AccuseConfirmDialog';
import type { ActionFeedback } from '../app/game/components/ActionNotice';
import { getSessionRepository } from '../src/lib/session/repository';
import { persistSession } from '../src/lib/session/store';
import { getSessionStats } from '../src/lib/session/stats';
import { beginSession, acceptClue } from '../src/lib/session/transitions';
import type { GameSession } from '../src/lib/session/types';
import { actionHarness } from './action-response-harness';
import { persistenceFixture } from './session-persistence-fixtures';

const output = (value: unknown) => Response.json({ status: 'completed', output: [{ type: 'message',
  content: [{ type: 'output_text', text: JSON.stringify(value) }] }] });
const failures = [
  { name: 'upstream HTTP 500', response: () => Response.json({ error: 'Synthetic failure' }, { status: 500 }) },
  { name: 'upstream HTTP 429', response: () => Response.json({ error: 'Synthetic limit' }, { status: 429 }) },
  { name: 'upstream invalid JSON', response: () => new Response('{broken-json') },
  { name: 'upstream missing judgment fields', response: () => output({ correct: false }) },
  { name: 'upstream refusal', response: () => Response.json({ status: 'completed', output: [{ type: 'message',
    content: [{ type: 'refusal', refusal: 'Synthetic refusal' }] }] }) },
];
const noop = () => {};
const protectedFields = ['accusationsLeft', 'conversationHistory', 'clues', 'clueRecords', 'stressLevel',
  'maxStress', 'hintsUsed', 'hintTexts', 'lastResponse'];

function environment(t: TestContext) {
  const values: Record<string, string | undefined> = { AI_PROVIDER: 'openai', OPENAI_API_KEY: 'synthetic-accusation-matrix',
    OPENAI_MODEL: 'fixture-model', AI_RAG_ENABLED: 'false', SESSION_STORAGE: 'local', EXPORT_STORAGE: 'local',
    LEADERBOARD_STORAGE: 'local', AI_WORK_ENABLED: 'true', VERCEL: undefined, AWS_LAMBDA_FUNCTION_NAME: undefined };
  const before = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  const apply = (entries: typeof values) => {
    for (const [key, value] of Object.entries(entries)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  };
  apply(values); t.after(() => apply(before));
}

function feedbackHarness() {
  let notice: ActionFeedback | null = null;
  let feedback!: ReturnType<typeof useGameFeedback>;
  function Probe() {
    feedback = useGameFeedback({ setToast: (value: ActionFeedback | null) => { notice = value; } } as Parameters<typeof useGameFeedback>[0], noop);
    return null;
  }
  renderToStaticMarkup(React.createElement(Probe));
  return { feedback, current: () => notice };
}

function gameSnapshot(session: GameSession) {
  // Activity/revision/request receipts and spent inference budget can change on failure;
  // protected gameplay must not. Relaxed mode removes elapsed-time score drift.
  return { ...structuredClone(session), lastActivity: 0 };
}
function statsSnapshot(id: string) {
  const stats = getSessionStats(id)!;
  return { ...stats, timeElapsed: 0 };
}

test('actual accusation route: five upstream faults preserve gameplay, then one explicit retry commits once', async t => {
  environment(t);
  for (const scenario of failures) await t.test(scenario.name, async sub => {
    const { sessionId, session } = await persistenceFixture(sub);
    session.timerMode = 'unlimited'; session.caseData.playMode = 'relaxed';
    beginSession(session);
    acceptClue(session, 'Earlier established fact');
    session.currentStress = 4; session.questionsAsked = 2;
    session.hintsUsed = 1; session.hintTexts = ['Earlier hint'];
    session.conversationHistory = [{ role: 'assistant', content: 'Previously accepted account.', timestamp: 1 }];
    persistSession(sessionId);
    const repository = getSessionRepository();
    const beforeServer = gameSnapshot(repository.load(sessionId)!.session);
    const beforeStats = statsSnapshot(sessionId);
    const h = actionHarness(sub, {}), notices = feedbackHarness();
    Object.assign(h.context.runtime, notices.feedback);
    Object.assign(h.state, { caseData: { sessionId, suspect_name: 'Ada' },
      conversationHistory: structuredClone(session.conversationHistory), clues: session.clues.map(clue => clue.text),
      clueRecords: structuredClone(session.clues), stressLevel: 4, maxStress: 6,
      hintsUsed: 1, hintTexts: ['Earlier hint'], lastResponse: 'Previously accepted account.' });
    const clientSnapshot = () => Object.fromEntries(protectedFields.map(field => [field, h.state[field]]));
    const beforeClient = structuredClone(clientSnapshot());
    let open = false, retry = false, providerCalls = 0, upstreamStatus = 0;
    const routeStatuses: number[] = [];
    const routeBodies: Record<string, unknown>[] = [];
    h.context.panels.setShowAccuseConfirm = value => { open = typeof value === 'function' ? value(open) : value; };
    // Never call original fetch: both client->route and provider HTTP terminate in process.
    sub.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
      if (url === '/api/accuse') {
        h.sent.push(JSON.parse(String(init.body)));
        const response = await accuse(new NextRequest('http://localhost/api/accuse', {
          ...init, signal: init.signal ?? undefined, headers: { 'Content-Type': 'application/json' },
        }));
        routeStatuses.push(response.status);
        routeBodies.push(await response.clone().json());
        return response;
      }
      assert.equal(url, 'https://api.openai.com/v1/responses', 'Unexpected network destination');
      assert.equal(new Headers(init.headers).get('Authorization'), 'Bearer synthetic-accusation-matrix');
      const body = JSON.parse(String(init.body));
      assert.equal(body.text.format.name, 'interrogation_judge');
      providerCalls++;
      const response = retry ? output({ correct: false, confession: 'A synthetic denial.', explanation: 'The claim lacks evidence.' })
        : scenario.response();
      if (!retry) upstreamStatus = response.status;
      return response;
    });
    const text = h.panels.accuseText, submit = accusationAction(h.context);
    assert.equal(await submit(text), false);
    assert.equal(providerCalls, 1, 'No automatic inference retry');
    assert.deepEqual(routeStatuses, [502]);
    assert.equal(routeBodies[0].code, 'ACTION_FAILED');
    assert.equal(open, true); assert.equal(h.panels.accuseText, text);
    assert.equal(h.state.phase, 'active'); assert.equal(h.state.isAccusing, false);
    assert.deepEqual(clientSnapshot(), beforeClient);
    assert.deepEqual(gameSnapshot(repository.load(sessionId)!.session), beforeServer);
    assert.deepEqual(statsSnapshot(sessionId), beforeStats);
    assert.equal(notices.current()?.tone, 'error');
    const renderDialog = () => renderToStaticMarkup(React.createElement(AccuseConfirmDialog, {
      show: open, accuseText: h.panels.accuseText, accusationsLeft: h.state.accusationsLeft as number,
      onChange: noop, onSubmitText: noop, onVoice: noop, onCancel: noop,
      feedback: notices.current(), onDismissFeedback: notices.feedback.dismissToast,
    }));
    const failedHtml = renderDialog();
    assert.match(failedHtml, /role="alert"/);
    assert.match(failedHtml, /Review the session and try a new attempt/);
    assert.ok(failedHtml.includes(text));
    assert.match(failedHtml, /Dismiss message/); assert.match(failedHtml, /Submit accusation/);
    assert.doesNotMatch(failedHtml, /Synthetic failure|Synthetic limit|Synthetic refusal|SyntaxError/);

    retry = true; open = false;
    assert.equal(await submit(text), true);
    assert.equal(providerCalls, 2); assert.equal(h.sent.length, 2);
    assert.deepEqual(routeStatuses, [502, 200]);
    assert.notEqual(h.sent[0].requestId, h.sent[1].requestId, 'Known failed receipt requires a fresh explicit attempt');
    assert.equal(h.sent[1].accusation, text);
    const saved = repository.load(sessionId)!.session;
    assert.equal(saved.accusationsUsed, beforeServer.accusationsUsed + 1);
    assert.equal(saved.accusationsLeft, beforeServer.accusationsLeft - 1);
    assert.equal(h.state.accusationsLeft, saved.accusationsLeft);
    assert.equal(saved.conversationHistory.length, beforeServer.conversationHistory.length + 2);
    assert.deepEqual(saved.conversationHistory.slice(0, -2), beforeServer.conversationHistory);
    assert.equal(saved.conversationHistory.at(-2)?.content, `[ACCUSATION] ${text}`);
    const clientHistory = h.state.conversationHistory as { content: string }[];
    assert.deepEqual(clientHistory.map(item => item.content), saved.conversationHistory.map(item => item.content));
    assert.equal(h.state.lastResponse, saved.conversationHistory.at(-1)?.content);
    assert.equal(h.panels.accuseText, ''); assert.equal(h.state.phase, 'active');
    assert.equal(saved.status, 'active'); assert.equal(saved.outcome, null);
    for (const field of ['clues', 'currentStress', 'questionsAsked', 'hintsUsed', 'hintTexts', 'winToken'] as const) {
      assert.deepEqual(saved[field], beforeServer[field]);
    }
    const afterStats = statsSnapshot(sessionId);
    assert.equal(afterStats.accusationsUsed, 1);
    assert.ok(afterStats.score < beforeStats.score, 'Exactly one incorrect judgment applies its score penalty');
    assert.deepEqual(routeBodies[1].stats, {
      ...afterStats, timeElapsed: (routeBodies[1].stats as { timeElapsed: number }).timeElapsed,
    });
    assert.equal(h.events.filter(event => event === 'speech').length, 1);
    assert.equal(notices.current(), null);
    open = true; assert.doesNotMatch(renderDialog(), /role="alert"/);
    sub.diagnostic(`${scenario.name}: upstream ${upstreamStatus} -> route 502 ACTION_FAILED; disk/client attempts, history and score preserved; explicit retry 200 consumes one attempt, appends one exchange, clears error. Score ${beforeStats.score} -> ${afterStats.score}.`);
  });
});
