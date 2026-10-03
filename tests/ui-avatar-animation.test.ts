import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceAvatar, avatarTransform, createAvatarAnimation } from '../app/game/avatar-animation';
import { drawAvatarEffects } from '../app/game/avatar-effects';

test('calm state clears stress shake and advances speaking only during speech', () => {
  const anim = createAvatarAnimation();
  anim.shakeX = 8;
  anim.shakeY = 9;
  anim.fidgetX = 4;
  advanceAvatar(anim, { stress: 0, speaking: false, dt: 0.1 });
  assert.equal(anim.shakeX, 0);
  assert.equal(anim.shakeY, 0);
  assert.equal(anim.fidgetX, 0);
  assert.equal(anim.speakPhase, 0);
  advanceAvatar(anim, { stress: 0, speaking: true, dt: 0.1 });
  assert.ok(anim.speakPhase > 0);
  assert.doesNotMatch(avatarTransform(anim, true, 1), /NaN|Infinity/);
});

test('stress relief clears obsolete sweat without drawing effects', () => {
  const anim = createAvatarAnimation();
  anim.sweatDrops = [{ x: 0.2, y: 0.3, speed: 0.1 }];
  let cleared = false;
  const ctx = { clearRect: () => { cleared = true; } } as unknown as CanvasRenderingContext2D;
  drawAvatarEffects({ ctx, width: 100, height: 100 }, anim, { stress: 0, speaking: false, dt: 0.1 });
  assert.equal(cleared, true);
  assert.deepEqual(anim.sweatDrops, []);
});
