import assert from 'node:assert/strict';
import test from 'node:test';
import { AiError } from '../src/lib/ai/contracts';
import { runGenerationRequest } from '../src/lib/session/generation-requests';
import { getSession } from '../src/lib/session/store';
import { loadCase, CaseGenerationError } from '../app/game/state/case-loader';
import { generationFixture } from './generation-fixtures';

for (const code of ['CASE_REVIEW_REJECTED', 'INVALID_CASE_CONTENT']) {
  test(`${code} preserves one failure receipt and offers an explicit new attempt without a playable session`, async context => {
    await generationFixture(context);
    let calls = 0;
    let reservedId = '';
    const options = { requestId: `quality-${code}`, fingerprint: { difficulty: 'easy' },
      generate: async (generation: { sessionId: string }) => {
        calls++; reservedId = generation.sessionId;
        throw new AiError(code, 'PRIVATE reviewer findings and hidden case truth');
      } };
    const failed = await runGenerationRequest(options);
    assert.equal(failed.status, 502);
    assert.equal(failed.body.code, code);
    assert.equal(JSON.stringify(failed).includes('PRIVATE'), false);
    assert.equal(getSession(reservedId), null);
    assert.deepEqual(await runGenerationRequest(options), failed);
    assert.equal(calls, 1, 'Same request must not silently buy another candidate or review');
    context.mock.method(globalThis, 'fetch', async () => Response.json(failed.body, { status: failed.status }));
    await assert.rejects(loadCase({ difficulty: 'easy', timerMode: 'countdown', requestId: options.requestId,
      signal: new AbortController().signal }), error => {
      assert.ok(error instanceof CaseGenerationError);
      assert.equal(error.requiresNewAttempt, true);
      assert.equal(error.requestId, options.requestId);
      return true;
    });
  });
}
