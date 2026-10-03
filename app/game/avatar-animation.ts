export type AvatarAnimation = {
  time: number;
  breathPhase: number;
  bobPhase: number;
  fidgetX: number;
  fidgetTimer: number;
  fidgetNext: number;
  speakPhase: number;
  shakeX: number;
  shakeY: number;
  sweatDrops: { x: number; y: number; speed: number }[];
};

export function createAvatarAnimation(): AvatarAnimation {
  return {
    time: 0, breathPhase: 0, bobPhase: Math.random() * Math.PI * 2,
    fidgetX: 0, fidgetTimer: 0, fidgetNext: 2 + Math.random() * 3,
    speakPhase: 0, shakeX: 0, shakeY: 0, sweatDrops: [],
  };
}

function updateFidget(anim: AvatarAnimation, stress: number, dt: number) {
  if (stress < 5) { anim.fidgetX = 0; return; }
  anim.fidgetTimer += dt;
  if (anim.fidgetTimer >= anim.fidgetNext) {
    anim.fidgetTimer = 0;
    const intensity = stress >= 8 ? 3 : stress >= 6 ? 2 : 1;
    anim.fidgetX = (Math.random() > 0.5 ? 1 : -1) * intensity;
    anim.fidgetNext = stress >= 8 ? 0.3 + Math.random() * 0.5 : 1 + Math.random() * 2;
  }
  anim.fidgetX *= Math.pow(0.02, dt);
  if (Math.abs(anim.fidgetX) < 0.05) anim.fidgetX = 0;
}

export function advanceAvatar(anim: AvatarAnimation, input: { stress: number; speaking: boolean; dt: number }) {
  const { stress, speaking, dt } = input;
  anim.time += dt;
  anim.breathPhase += dt * (stress >= 7 ? 3.5 : stress >= 4 ? 2.2 : 1.4);
  anim.bobPhase += dt * 0.6;
  updateFidget(anim, stress, dt);
  const shakeIntensity = stress >= 9 ? 1.5 : 0.8;
  anim.shakeX = stress >= 8 ? (Math.random() - 0.5) * shakeIntensity : 0;
  anim.shakeY = stress >= 8 ? (Math.random() - 0.5) * shakeIntensity * 0.5 : 0;
  if (speaking) anim.speakPhase += dt * 7;
}

export function avatarTransform(anim: AvatarAnimation, speaking: boolean, scale: number) {
  const breathY = Math.sin(anim.breathPhase) * 1.5 * scale;
  const bobX = Math.sin(anim.bobPhase) * 0.4 * scale;
  const bobRotate = Math.sin(anim.bobPhase * 0.7) * 0.25;
  const speakBounce = speaking ? Math.abs(Math.sin(anim.speakPhase)) * 1.2 * scale : 0;
  const speakScale = speaking ? 1 + Math.sin(anim.speakPhase * 0.5) * 0.003 : 1;
  const tx = anim.fidgetX + bobX + anim.shakeX;
  const ty = breathY - speakBounce + anim.shakeY;
  const rotate = bobRotate + anim.fidgetX * 0.15;
  return `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) rotate(${rotate.toFixed(3)}deg) scale(${speakScale.toFixed(4)})`;
}
