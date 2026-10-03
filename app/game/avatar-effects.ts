import type { AvatarAnimation } from './avatar-animation';

type Frame = { ctx: CanvasRenderingContext2D; width: number; height: number };

function drawSpeaking(frame: Frame, anim: AvatarAnimation) {
  const { ctx, width: w, height: h } = frame;
  const alpha = 0.04 + Math.sin(anim.speakPhase * 0.5) * 0.02;
  const gradient = ctx.createRadialGradient(w * 0.5, h * 0.4, w * 0.1, w * 0.5, h * 0.4, w * 0.5);
  gradient.addColorStop(0, `rgba(255, 200, 100, ${alpha})`);
  gradient.addColorStop(1, 'rgba(255, 200, 100, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

function drawSweat(frame: Frame, anim: AvatarAnimation, stress: number, dt: number) {
  if (stress < 7) { anim.sweatDrops = []; return; }
  const { ctx, width: w, height: h } = frame;
  const target = stress >= 9 ? 4 : stress >= 8 ? 3 : 2;
  while (anim.sweatDrops.length < target) {
    anim.sweatDrops.push({ x: 0.2 + Math.random() * 0.6, y: Math.random() * 0.25, speed: 0.12 + Math.random() * 0.08 });
  }
  for (const drop of anim.sweatDrops) {
    drop.y += dt * drop.speed;
    if (drop.y > 0.5) {
      drop.y = 0.05 + Math.random() * 0.1;
      drop.x = 0.2 + Math.random() * 0.6;
    }
    const dropW = Math.max(2, Math.round(w * 0.018));
    const dropH = Math.max(3, Math.round(h * 0.02));
    const dx = Math.round(drop.x * w);
    const dy = Math.round(drop.y * h);
    ctx.fillStyle = '#88C8F0';
    ctx.fillRect(dx, dy, dropW, dropH);
    ctx.fillStyle = '#70A8D8';
    ctx.fillRect(dx, dy + dropH, dropW, Math.round(dropH * 0.5));
    ctx.fillStyle = '#B0E0FF';
    ctx.fillRect(dx, dy, Math.max(1, dropW - 1), 1);
  }
}

function drawStress(frame: Frame, anim: AvatarAnimation, stress: number) {
  if (stress < 5) return;
  const { ctx, width: w, height: h } = frame;
  const alpha = Math.min((stress - 4) / 6, 1) * 0.3 + Math.sin(anim.time * 2) * 0.05;
  const gradient = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.7);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, `rgba(180,30,30,${alpha})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

export function drawAvatarEffects(frame: Frame, anim: AvatarAnimation, input: { stress: number; speaking: boolean; dt: number }) {
  frame.ctx.clearRect(0, 0, frame.width, frame.height);
  if (input.speaking) drawSpeaking(frame, anim);
  drawSweat(frame, anim, input.stress, input.dt);
  drawStress(frame, anim, input.stress);
}
