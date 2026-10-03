import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { POST as interrogate } from '../app/api/interrogate/route';
import { POST as accuse } from '../app/api/accuse/route';
import { createSession, getSession, deleteSession } from '../src/lib/session/store';
import { beginSession, acceptClue } from '../src/lib/session/transitions';

const facts = { difficulty: 'easy', suspect_name: 'Casey', suspect_role: 'Clerk', setting: 'Fictional office',
  suspect_true_story: 'Returned at 18:42', suspect_cover_story: 'Stayed away', the_lie: 'Stayed away',
  the_truth: 'Returned at 18:42', the_contradiction: 'Visitor log timestamp', stress_triggers: ['log'], deflection_tactics: ['pause'] };
function response(output: Record<string, unknown>) {
  return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(output) }] }] });
}
function request(path: string, body: object, signal: AbortSignal) {
  return new NextRequest(`http://localhost/api/${path}`, { method: 'POST', signal,
    body: JSON.stringify({ ...body, requestId: randomUUID() }) });
}

test('request abort reaches normal suspect/judge routes and late provider output consumes no turn or attempt', async () => {
  const saved = { AI_PROVIDER: process.env.AI_PROVIDER, OPENAI_API_KEY: process.env.OPENAI_API_KEY };
  process.env.AI_PROVIDER = 'openai'; process.env.OPENAI_API_KEY = 'fixture-key';
  const original = globalThis.fetch;
  try {
    for (const kind of ['suspect', 'judge']) {
      const id = createSession(facts); const session = getSession(id)!;
      const controller = new AbortController(); let calls = 0;
      beginSession(session); acceptClue(session, 'Visitor log'); acceptClue(session, 'Door timestamp');
      globalThis.fetch = async (url, init) => {
        assert.equal(url, 'https://api.openai.com/v1/responses'); calls++;
        controller.abort(); assert.equal(init?.signal?.aborted, true);
        return kind === 'suspect'
          ? response({ spoken_response: 'I left at six.', internal_state: 'Guarded', stress_level: 2, clue_unlocked: null, caught: false })
          : response({ correct: true, confession: 'I returned.', explanation: 'The log disproves the denial.' });
      };
      try {
        const result = kind === 'suspect'
          ? await interrogate(request('interrogate', { sessionId: id, playerQuestion: 'When did you leave the office?' }, controller.signal))
          : await accuse(request('accuse', { sessionId: id, accusation: 'You returned despite saying you stayed away.' }, controller.signal));
        assert.equal(result.status, 502); assert.equal(calls, 1);
        const recovered = getSession(id)!;
        assert.equal(recovered.questionsAsked, 0); assert.equal(recovered.accusationsUsed, 0);
        assert.equal(recovered.conversationHistory.length, 0); assert.equal(recovered.outcome, null);
        assert.equal(recovered.status, 'active'); // Canceling inference does not reset an already started clock.
      } finally { deleteSession(id); }
    }
  } finally {
    globalThis.fetch = original;
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
