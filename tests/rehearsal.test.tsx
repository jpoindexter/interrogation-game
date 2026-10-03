import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RECORDING } from '../app/rehearsal/recording';
import { navigateRehearsal, rehearsalIndex } from '../app/rehearsal/navigation';
import Walkthrough from '../app/rehearsal/Walkthrough';
import RecordedStep from '../app/rehearsal/RecordedStep';
import RecordedPath from '../app/rehearsal/RecordedPath';
import RecordedProvenance from '../app/rehearsal/RecordedProvenance';

const sourceBytes = readFileSync(RECORDING.sourceFile);
const source = JSON.parse(sourceBytes.toString());

test('all recorded lines and provenance match the actual saved public exchange', () => {
  assert.equal(RECORDING.sourceSha256, createHash('sha256').update(sourceBytes).digest('hex'));
  assert.equal(RECORDING.capturedAt, source.executedAt);
  assert.equal(RECORDING.scope, source.scope);
  const path = source.result.win.result.conversationPath;
  for (let index = 0; index < path.length; index += 1) {
    const step = RECORDING.steps[index];
    assert.equal(step.question, path[index].question);
    assert.equal(step.answer, path[index].answer);
    assert.equal(step.explanation, path[index].explanation ?? null);
    assert.equal(step.status, path[index].status);
    assert.deepEqual(step.evidence, path[index].evidence ?? null);
  }
  assert.deepEqual(RECORDING.steps.at(-1)?.reveal, {
    lie: source.result.win.result.reveal_the_lie,
    truth: source.result.win.result.reveal_the_truth,
    contradiction: source.result.win.result.reveal_the_clue,
  });
});

test('curated fixture contains only display content with no session, token or score fields', () => {
  const forbidden = /^(sessionId|requestId|winToken|token|authorization|score|stats|timestamp|startedAt|endedAt|id)$/i;
  function inspect(value: unknown) {
    if (!value || typeof value !== 'object') return;
    for (const [key, item] of Object.entries(value)) { assert.doesNotMatch(key, forbidden); inspect(item); }
  }
  inspect(RECORDING);
  assert.doesNotMatch(JSON.stringify(RECORDING), /\[session\]|Bearer\s|sk-[A-Za-z0-9]/);
  assert.equal(RECORDING.steps.filter(step => step.reveal !== null).length, 1);
  assert.equal(RECORDING.steps.at(-1)?.kind, 'result');
});

test('manual next/back/restart navigation is bounded and never mutates the recording', () => {
  const before = JSON.stringify(RECORDING);
  const count = RECORDING.steps.length;
  let index = navigateRehearsal(0, 'back', count);
  assert.equal(index, 0);
  const visited = [index];
  for (let position = 1; position < count; position += 1) { index = navigateRehearsal(index, 'next', count); visited.push(index); }
  assert.deepEqual(visited, [0, 1, 2, 3, 4, 5]);
  assert.equal(navigateRehearsal(index, 'next', count), index);
  assert.equal(navigateRehearsal(index, 'back', count), index - 1);
  assert.equal(navigateRehearsal(index, 'restart', count), 0);
  assert.equal(rehearsalIndex(Number.NaN, count), 0);
  assert.equal(JSON.stringify(RECORDING), before);
});

test('initial render is explicitly recorded, has native navigation, and withholds the final reveal', () => {
  const markup = renderToStaticMarkup(<Walkthrough />);
  assert.match(markup, /Recorded · not live AI/);
  assert.match(markup, /sticky top-0/);
  assert.match(markup, /aria-label="Recorded walkthrough navigation"/);
  assert.match(markup, /<button[^>]*disabled=""[^>]*>Back<\/button>/);
  assert.match(markup, /Next recorded step/);
  assert.match(markup, /Restart recording/);
  assert.match(markup, /role="status" aria-live="polite"/);
  assert.doesNotMatch(markup, /Recorded final reveal|Casey returned to the building at 18:42/);
  assert.doesNotMatch(markup, /<input|<textarea|<form|Save score|leaderboard/i);
});

test('final reveal and path distinguish unsupported evidence and accepted accusation with provenance', () => {
  const markup = renderToStaticMarkup(<>
    <RecordedStep step={RECORDING.steps[5]} />
    <RecordedPath steps={RECORDING.steps} />
    <RecordedProvenance recording={RECORDING} />
  </>);
  assert.match(markup, /Recorded final reveal/);
  assert.match(markup, /presence, not who took the ledger/);
  assert.match(markup, /Recorded contradiction not established/);
  assert.match(markup, /Recorded accusation accepted/);
  assert.match(markup, new RegExp(RECORDING.sourceSha256));
});

test('the fallback route has no gameplay network, storage, audio or provider dependencies', () => {
  for (const file of readdirSync('app/rehearsal').filter(name => /\.tsx?$/.test(name))) {
    const text = readFileSync(`app/rehearsal/${file}`, 'utf8');
    assert.doesNotMatch(text, /\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|navigator\.mediaDevices|localStorage|sessionStorage|new Audio|\/api\//);
    assert.doesNotMatch(text, /from ['"].*(?:gameplay\/demo-case|session\/|ai\/|game-ai|mistral)/);
  }
});
