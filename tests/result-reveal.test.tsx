import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import WinReveal from '../app/game/win/WinReveal';
import { openRecordedExchange } from '../app/game/result/open-recorded-exchange';
import type { ConversationPathNode } from '../app/game/result/conversation-path';
import { evaluation, result } from './result-fixtures';

test('winning reveal leads with recorded reasoning, preserves missing records and opens its referenced exchange', t => {
  const path: ConversationPathNode[] = [
    { id: 'opening', kind: 'dialogue', question: 'When did you leave?', answer: 'At six.', status: 'neutral' },
    { id: 'rejected', kind: 'accusation', question: 'You stole the ledger.', answer: 'That does not follow.',
      status: 'unsupported', explanation: 'The evidence establishes presence, not theft.' },
    { id: 'accepted', kind: 'accusation', question: 'The signed visitor record contradicts your denial of returning.',
      answer: 'I returned.', status: 'supported', explanation: 'The signed record names Casey arriving at 18:42.' },
    { id: 'unreviewed', kind: 'accusation', question: 'A later unsupported assertion.', answer: '', status: 'unverified' },
  ];
  const render = (conversationPath?: ConversationPathNode[]) => renderToStaticMarkup(
    <WinReveal result={{ ...result, confession: 'I returned to the building.' }} evaluation={{ ...evaluation, conversationPath }}>
      <button>Save to leaderboard</button>
    </WinReveal>,
  );
  const html = render(path);
  const reasoning = html.slice(0, html.indexOf('</section>'));
  assert.match(reasoning, /The signed visitor record contradicts your denial of returning\./);
  assert.match(reasoning, /The signed record names Casey arriving at 18:42\./);
  assert.doesNotMatch(reasoning, /You stole the ledger|later unsupported assertion/);
  for (const fact of [evaluation.reveal_the_lie, evaluation.reveal_the_truth, evaluation.reveal_the_clue]) {
    assert.ok(reasoning.includes(fact!));
  }
  assert.match(reasoning, /<button type="button"[^>]*>View recorded exchange<\/button>/);
  const labels = ['Recorded case reasoning', 'recorded confession', 'Conversation path', 'Score breakdown', 'Save to leaderboard'];
  labels.slice(1).forEach((label, index) => assert.ok(html.indexOf(labels[index]) < html.indexOf(label), label));
  assert.doesNotMatch(html, /<details[^>]*\sopen(?:[\s=>])/);
  assert.doesNotMatch(html, /role="dialog"/);

  for (const history of [undefined, path.filter(node => node.id !== 'accepted')]) {
    const legacy = render(history);
    assert.match(legacy, /accepted accusation was not recorded/);
    assert.match(legacy, /judge’s explanation was not recorded/);
    assert.doesNotMatch(legacy, /View recorded exchange/);
  }
  const noRationale = render([{ ...path[2], explanation: undefined }]);
  assert.match(noRationale, /judge’s explanation was not recorded/);
  assert.match(noRationale, /View recorded exchange/);

  // Controlled element methods prove the click helper's operations, not browser focus/layout.
  const actions: string[] = [];
  const details = { open: false, firstElementChild: { tagName: 'SUMMARY',
    focus(options: FocusOptions) { assert.equal(details.open, true); assert.deepEqual(options, { preventScroll: true }); actions.push('focus'); },
    scrollIntoView(options: ScrollIntoViewOptions) {
      assert.deepEqual(options, { block: 'nearest', behavior: 'instant' }); actions.push('scroll');
    },
  } };
  const unrelated = { open: false };
  openRecordedExchange(details as unknown as HTMLDetailsElement);
  assert.deepEqual(actions, ['focus', 'scroll']);
  assert.equal(details.open, true);
  assert.equal(unrelated.open, false);
  openRecordedExchange(null);
  const invalid = { open: false, firstElementChild: { tagName: 'DIV' } };
  openRecordedExchange(invalid as unknown as HTMLDetailsElement);
  assert.equal(invalid.open, false);
  t.diagnostic('React SSR: supported accusation, canonical facts, rationale, legacy fallbacks and explanation-before-score order. Controlled ref target: open → focus summary → instant scroll. Browser hydration, actual focus and viewer comprehension unverified.');
});
