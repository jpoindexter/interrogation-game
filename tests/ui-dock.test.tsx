import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Dock from '../app/game/components/Dock';
import type { DockProps } from '../app/game/components/dock-types';
const noop = () => {};
const props: DockProps = {
  input: { listening: false, speaking: false, accusing: false, phase: 'active' },
  panels: { text: false, notes: true, settings: false, accuseConfirm: false },
  progress: { hasCase: true, interviewStarted: true, requiresEvidence: true, clues: 2, required: 2, accusationsLeft: 3, hintsUsed: 0 },
  actions: { mic: noop, type: noop, notes: noop, hint: noop, accuse: noop, settings: noop, giveUp: noop, help: noop, exit: noop },
};
function button(markup: string, label: string) {
  return markup.match(new RegExp(`<button[^>]*aria-label="${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`))?.[0] ?? assert.fail(`Missing ${label}`);
}
test('semantic dock groups retain nine named actions and selected state', () => {
  const markup = renderToStaticMarkup(<Dock {...props} />);
  assert.equal((markup.match(/<button/g) ?? []).length, 9);
  assert.match(button(markup, 'Notes'), /aria-pressed="true"/);
  assert.doesNotMatch(button(markup, 'Accuse (3)'), /disabled=""/);
  assert.match(markup, /flex-wrap/);
});
test('busy and recording dock controls preserve their original availability', () => {
  const busy = renderToStaticMarkup(<Dock {...props} input={{ ...props.input, speaking: true }} />);
  assert.match(button(busy, 'Speak'), /disabled=""/);
  assert.match(button(busy, 'Hint (0/2)'), /disabled=""/);
  assert.doesNotMatch(button(busy, 'Notes'), /disabled=""/);
  const recording = renderToStaticMarkup(<Dock {...props} input={{ ...props.input, accusing: true, listening: true }} />);
  assert.doesNotMatch(button(recording, 'Stop recording accusation'), /disabled=""/);
});

test('generated clues never gate accusations while authored proof and interview start still do', () => {
  const generated = { ...props.progress, requiresEvidence: false, clues: 0 };
  assert.doesNotMatch(button(renderToStaticMarkup(<Dock {...props} progress={generated} />), 'Accuse (3)'), /disabled=""/);
  const authored = renderToStaticMarkup(<Dock {...props} progress={{ ...generated, requiresEvidence: true }} />);
  assert.match(button(authored, 'Establish a contradiction before accusing'), /disabled=""/);
  const unopened = renderToStaticMarkup(<Dock {...props} progress={{ ...generated, interviewStarted: false }} />);
  assert.match(button(unopened, 'Begin the interview before accusing'), /disabled=""/);
  const spent = renderToStaticMarkup(<Dock {...props} progress={{ ...generated, accusationsLeft: 0 }} />);
  assert.match(button(spent, 'No accusation attempts remain'), /disabled=""/);
  const recording = renderToStaticMarkup(<Dock {...props} progress={generated} input={{ ...props.input, listening: true }} />);
  assert.match(button(recording, 'Accuse (3)'), /disabled=""/);
});
