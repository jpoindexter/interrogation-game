import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { centerPanel, constrainPanel, movePanel } from '../app/game/components/panels/panel-bounds';
import SettingsPanel from '../app/game/components/SettingsPanel';
import NotesPanel from '../app/game/components/NotesPanel';
import TranscriptViewer from '../app/game/components/TranscriptViewer';
import { DEFAULT_SETTINGS } from '../app/settings/settings-model';
import { reducedMotionProperties } from '../app/components/reduced-motion-properties';
import BriefingDialog from '../app/game/components/BriefingDialog';
const noop = () => {};

test('briefing retains every revealed lead inside its narrow scrollable document', () => {
  const props = { show: true, sections: [{ label: 'Briefing', text: 'Read this.' }], fullText: 'Read this.',
    charIndex: 10, isPlaying: false, leads: ['Ask the named witness.', 'Compare the dated record.'],
    onClose: noop, onSkip: noop, onStart: noop };
  const markup = renderToStaticMarkup(<BriefingDialog {...props} />);
  const narrow = markup.match(/<section aria-label="Detective leads"[\s\S]*?<\/section>/)?.[0];
  assert.ok(narrow, 'Narrow briefing has its own semantic lead list');
  assert.match(narrow, /lg:hidden/);
  assert.match(narrow, /<li>Ask the named witness\.<\/li>/);
  assert.match(narrow, /<li>Compare the dated record\.<\/li>/);
  assert.match(markup, /hidden lg:flex/, 'Desktop-only sticky presentation remains complementary');
  assert.match(markup, /overflow-y-auto[\s\S]*<section aria-label="Detective leads"/);
  assert.doesNotMatch(renderToStaticMarkup(<BriefingDialog {...props} charIndex={3} />), /Detective leads/);
  assert.doesNotMatch(renderToStaticMarkup(<BriefingDialog {...props} leads={[]} />), /Detective leads/);
});

test('panel bounds recover every edge after shrinking a shared window', () => {
  const viewport = { width: 390, height: 720 };
  const panel = { width: 360, height: 600 };
  for (const position of [{ x: -800, y: -900 }, { x: 5000, y: 5000 }, { x: 200, y: 200 }]) {
    const next = constrainPanel(position, panel, viewport);
    assert.ok(next.x >= 8 && next.x + panel.width <= viewport.width - 8);
    assert.ok(next.y >= 8 && next.y + panel.height <= viewport.height - 8);
  }
  assert.deepEqual(centerPanel(panel, viewport), { x: 15, y: 60 });
  assert.deepEqual(constrainPanel({ x: 500, y: 500 }, panel, { width: 200, height: 200 }), { x: 8, y: 8 });
});

test('keyboard movement has bounded normal and large steps', () => {
  assert.deepEqual(movePanel({ x: 50, y: 50 }, 'ArrowLeft', 10), { x: 40, y: 50 });
  assert.deepEqual(movePanel({ x: 50, y: 50 }, 'ArrowDown', 40), { x: 50, y: 90 });
  assert.deepEqual(movePanel({ x: 50, y: 50 }, 'Enter', 10), { x: 50, y: 50 });
});

test('settings and notes expose modal, close, keyboard move, reset and labeled controls', () => {
  const settings = renderToStaticMarkup(<SettingsPanel show settings={DEFAULT_SETTINGS} pos={null} onSettingsChange={noop} onClose={noop} onPosChange={noop} />);
  assert.match(settings, /<dialog[^>]*aria-label="Settings"/);
  assert.match(settings, /aria-label="Move Settings"/);
  assert.match(settings, /Reset position/);
  assert.match(settings, /aria-label="Close Settings"/);
  assert.match(settings, /role="switch" aria-label="Reduced motion" aria-checked="false"/);
  assert.equal((settings.match(/type="range"/g) || []).length, 3);
  const notes = renderToStaticMarkup(<NotesPanel show notes="Keep this exact note" pos={null} onChange={noop} onClose={noop} onPosChange={noop} />);
  assert.match(notes, /for="detective-notes"/);
  assert.match(notes, /Keep this exact note/);
});

test('transcript is a named modal and retains full readable exchanges', () => {
  const markup = renderToStaticMarkup(<TranscriptViewer suspectName="Casey" onClose={noop} conversationHistory={[{ role: 'assistant', content: 'Original account.' }]} />);
  assert.match(markup, /<dialog[^>]*aria-label="Interrogation transcript"/);
  assert.match(markup, /aria-label="Close transcript"/);
  assert.match(markup, /Original account\./);
});

test('reduced motion ends decorative keyframes and nested repeats without dropping callbacks', () => {
  const onClick = () => {};
  const props = { animate: { opacity: [0, 0.5, 1], x: [0, 4, 0] }, transition: { repeat: Infinity, x: { duration: 5, repeat: Infinity } },
    variants: { visible: { opacity: [0, 1], transition: { repeat: Infinity } } }, onClick };
  const reduced = reducedMotionProperties(props);
  assert.deepEqual(reduced.animate, { opacity: 1, x: 0 });
  assert.equal(reduced.initial, false);
  assert.equal(reduced.onClick, onClick);
  assert.equal((reduced.transition as Record<string, unknown>).repeat, 0);
  assert.equal(((reduced.transition as Record<string, unknown>).x as Record<string, unknown>).repeat, 0);
  assert.equal(props.transition.repeat, Infinity, 'the regular-motion props remain unchanged');
});

test('master mute snapshots preserve intentionally silent channels', async () => {
  const { audioLevels, isAudioMuted } = await import('../app/game/controller/audio-levels');
  const preferences = { musicVolume: 0, sfxVolume: 0.15, voiceVolume: 0.8 };
  const saved = audioLevels(preferences);
  const muted = { musicVolume: 0, sfxVolume: 0, voiceVolume: 0 };
  assert.equal(isAudioMuted(preferences), false);
  assert.equal(isAudioMuted(muted), true);
  assert.deepEqual({ ...muted, ...saved }, preferences);
  assert.notEqual(saved, preferences);
});
