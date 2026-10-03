import { normalizeGenderHint } from '../src/lib/character-identity';
import { pickVoice } from '../src/lib/voice/voices';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PORTRAITS, portraitPath, selectPortrait, AUTHORED_PORTRAIT } from '../src/lib/art/portraits';
import dimensions from '../app/components/asset-dimensions.json';
import { ResultFrame } from '../app/game/result/ResultFrame';

test('all retained portrait IDs resolve to real PNG artwork with accurate intrinsic metadata', () => {
  for (const portrait of PORTRAITS) {
    const path = `public${portraitPath(portrait.id)}`;
    assert.ok(existsSync(path));
    const bytes = readFileSync(path);
    assert.equal(bytes.toString('hex', 0, 8), '89504e470d0a1a0a');
    const assetPath = portraitPath(portrait.id) as keyof typeof dimensions;
    assert.deepEqual([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], dimensions[assetPath]);
    assert.ok(bytes.readUInt32BE(16) >= 256);
  }
});

test('casting uses role wardrobe once and explicit identity survives name changes', () => {
  assert.equal(selectPortrait({ role: 'Doctor', gender: 'female' }), '04-f');
  assert.equal(selectPortrait({ role: 'Software engineer', gender: 'male' }), '07-m');
  assert.equal(selectPortrait({ role: 'Operations analyst', gender: 'female' }), '06-f');
  const renamedCase = { suspect_name: 'New name', portraitId: AUTHORED_PORTRAIT };
  assert.equal(portraitPath(renamedCase.portraitId), portraitPath(AUTHORED_PORTRAIT));
  assert.equal(portraitPath('../../secret'), portraitPath(undefined));
});

test('outcome motif uses existing clean artwork and semantic title', () => {
  const bytes = readFileSync('public/clues/folder.png');
  assert.equal(bytes.readUInt32BE(16), 64);
  assert.equal(bytes.readUInt32BE(20), 64);
  const markup = renderToStaticMarkup(<ResultFrame artwork="/clues/folder.png" caseNumber="001" title="Time expired"><p>Recorded result</p></ResultFrame>);
  assert.match(markup, /<h1[^>]*>Time expired<\/h1>/);
  assert.match(markup, /alt=""/);
  assert.doesNotMatch(markup, /solved\//);
});


test('explicit generated woman/man aliases choose intended portrait and voice pools without recasting saved IDs', () => {
  for (const gender of ['woman', 'Woman', ' FEMALE ']) {
    const canonical = normalizeGenderHint(gender)!;
    assert.equal(canonical, 'female');
    assert.equal(selectPortrait({ role: 'Operations analyst', gender }), '06-f');
    assert.equal(pickVoice('Mira Venn', canonical), pickVoice('Mira Venn', 'female'));
    assert.notEqual(pickVoice('Mira Venn', canonical), pickVoice('Mira Venn', 'male'));
  }
  for (const gender of ['man', 'Man', ' MALE ']) {
    assert.equal(normalizeGenderHint(gender), 'male');
    assert.equal(selectPortrait({ role: 'Operations analyst', gender }), '09-m');
  }
  assert.equal(normalizeGenderHint('non-binary'), 'nonbinary');
  assert.equal(normalizeGenderHint('unspecified'), null);
  assert.equal(normalizeGenderHint('Mira Venn'), null);
  assert.equal(portraitPath('09-m'), '/suspects/suspect-09-m.png');
  // Old sessions and their cached speech fingerprints keep the old recorded gender/voice mapping.
  assert.equal(pickVoice('Mira Venn', 'woman'), pickVoice('Mira Venn', 'male'));
});
