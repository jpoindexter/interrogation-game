import test from 'node:test';
import assert from 'node:assert/strict';
import React, { type KeyboardEvent } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import CaseSelector, { navigateCaseKey } from '../app/cases/CaseSelector';
import PolaroidCard from '../app/cases/PolaroidCard';
import OnboardingOverlay from '../app/game/components/OnboardingOverlay';
import { CASES } from '../app/data/cases';

function keyEvent(key: string, tagName = 'BUTTON', marked = true, overrides = {}) {
  let prevented = false;
  const event = {
    key, target: { tagName, dataset: { caseNavigation: marked ? 'true' : undefined }, isContentEditable: false },
    defaultPrevented: false, altKey: false, ctrlKey: false, metaKey: false, shiftKey: false,
    nativeEvent: { isComposing: false }, preventDefault() { prevented = true; }, ...overrides,
  } as unknown as KeyboardEvent<HTMLElement>;
  return { event, prevented: () => prevented };
}

test('case navigation handles plain arrows on marked buttons and leaves other actions native', () => {
  const moves: number[] = [];
  for (const [key, direction] of [['ArrowLeft', -1], ['ArrowRight', 1]] as const) {
    const input = keyEvent(key);
    assert.equal(navigateCaseKey(input.event, value => moves.push(value)), true);
    assert.equal(input.prevented(), true);
    assert.equal(moves.at(-1), direction);
  }
  const ignored = [
    keyEvent('Enter'), keyEvent(' '), keyEvent('ArrowDown'),
    keyEvent('ArrowRight', 'A'), keyEvent('ArrowRight', 'INPUT'), keyEvent('ArrowRight', 'TEXTAREA'),
    keyEvent('ArrowRight', 'BUTTON', false), // Back and unrelated buttons.
    keyEvent('ArrowRight', 'BUTTON', true, { ctrlKey: true }),
    keyEvent('ArrowRight', 'BUTTON', true, { nativeEvent: { isComposing: true } }),
    keyEvent('ArrowRight', 'BUTTON', true, { defaultPrevented: true }),
    keyEvent('ArrowRight', 'BUTTON', true, { target: { tagName: 'BUTTON', dataset: { caseNavigation: 'true' }, isContentEditable: true } }),
  ];
  for (const input of ignored) {
    assert.equal(navigateCaseKey(input.event, () => assert.fail('Unexpected navigation')), false);
    assert.equal(input.prevented(), false);
  }
  assert.deepEqual(moves, [-1, 1]);
});

function card(difficulty: string, isActive = true, expanded = true) {
  return renderToStaticMarkup(<PolaroidCard caseData={{ ...CASES[0], difficulty }} isActive={isActive}
    expanded={expanded} isSolved={false} index={0} fanX={0} fanY={0} fanRotate={0} fanScale={1}
    zIndex={20} opacity={1} onClick={() => {}} />);
}

test('rendered case selection exposes current state, disclosure and a separate native Play link', () => {
  const region = renderToStaticMarkup(<CaseSelector current={2} onNavigate={() => {}}><button>Child</button></CaseSelector>);
  assert.match(region, /role="region" aria-label="Case selector"/);
  assert.match(region, /role="status" aria-atomic="true"/);
  assert.match(region, /HOSPITAL, MEDIUM\. Case 3 of 7 selected/);
  const active = card('easy');
  assert.match(active, /aria-expanded="true" aria-controls="case-description-startup"/);
  assert.match(active, /id="case-description-startup"/);
  assert.match(active, /<a[^>]*aria-label="Play STARTUP"[^>]*href="\/game\?setting=startup&amp;difficulty=easy"/);
  assert.match(active, /<\/button>[\s\S]*<a/); // Play is not nested in the photo button.
  assert.match(card('easy', false, false), /tabindex="-1"/);
  assert.match(card('easy', true, false), /aria-expanded="false"/);
});

test('rendered cards and first-play guidance describe current disclosure and accusation rules', () => {
  for (const [difficulty, required] of Object.entries({ easy: 3, medium: 5, hard: 7, expert: 9 })) {
    assert.match(card(difficulty), new RegExp(`Case record after ${required} distinct questions`));
  }
  assert.match(card('easy'), /at least 15 letters/);
  assert.match(card('easy'), /accuse after beginning the interview, before the record arrives/);
  const onboarding = renderToStaticMarkup(<OnboardingOverlay onClose={() => {}} />);
  assert.match(onboarding, /you can accuse once the interview begins/);
  assert.match(onboarding, /In evidence practice, establish a contradiction first/);
  assert.doesNotMatch(onboarding, /Collect the required clues/);
});
