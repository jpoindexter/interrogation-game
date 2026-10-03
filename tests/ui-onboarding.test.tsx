import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import OnboardingOverlay from '../app/game/components/OnboardingOverlay';
import { finishOnboarding } from '../app/game/components/onboarding-state';

test('introduction uses a named modal, actionable close button and evidence-led guidance', () => {
  const markup = renderToStaticMarkup(<OnboardingOverlay onClose={() => {}} />);
  assert.match(markup, /<dialog[^>]*aria-label="Before your first interview"/);
  assert.match(markup, /<button type="button"[^>]*>Return to briefing<\/button>/);
  assert.equal((markup.match(/<li>/g) || []).length, 3);
  assert.match(markup, /it is not proof of a lie/);
  assert.match(markup, /three attempts/);
  assert.doesNotMatch(markup, /getting close|Step \d|border-transparent/);
});

test('dismissal remembers completion before closing once', () => {
  const actions: string[] = [];
  finishOnboarding(() => actions.push('closed'), () => ({
    setItem: (key, value) => actions.push(`${key}=${value}`),
  }));
  assert.deepEqual(actions, ['onboardingComplete=true', 'closed']);
});

test('dismissal still closes once when storage access or writes fail', () => {
  let closeCount = 0;
  finishOnboarding(() => closeCount++, () => { throw new Error('SecurityError'); });
  assert.equal(closeCount, 1);
  finishOnboarding(() => closeCount++, () => ({
    setItem: () => { throw new Error('QuotaExceededError'); },
  }));
  assert.equal(closeCount, 2);
});
