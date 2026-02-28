'use client';

import { useRef, useEffect } from 'react';

// Portrait files with gender suffix: suspect-02-f.png, suspect-03-m.png, etc.
const MALE_PORTRAITS = ['03-m', '05-m', '07-m', '09-m', '11-m', '12-m'];
const FEMALE_PORTRAITS = ['02-f', '04-f', '06-f', '08-f', '10-f'];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function portraitFile(name: string, gender?: string): string {
  const isFemale = gender?.toLowerCase() === 'female';
  const pool = isFemale ? FEMALE_PORTRAITS : MALE_PORTRAITS;
  const idx = hashName(name) % pool.length;
  return `/suspects/suspect-${pool[idx]}.png`;
}

const SIZES = {
  sm: { w: 120, h: 120, frame: 3 },
  md: { w: 256, h: 256, frame: 4 },
  lg: { w: 400, h: 400, frame: 6 },
} as const;

interface SuspectAvatarProps {
  name: string;
  gender?: string;
  stressLevel: number;
  size?: 'sm' | 'md' | 'lg';
  speaking?: boolean;
}

type AnimState = {
  time: number;
  // Breathing
  breathPhase: number;
  // Idle head bob
  bobPhase: number;
  // Fidget (stress-based lateral jitter)
  fidgetX: number;
  fidgetTimer: number;
  fidgetNext: number;
  // Speaking
  speakPhase: number;
  // Stress shake (micro-tremor)
  shakeX: number;
  shakeY: number;
  // Sweat drops
  sweatDrops: { x: number; y: number; speed: number }[];
};

function initAnim(): AnimState {
  return {
    time: 0,
    breathPhase: 0,
    bobPhase: Math.random() * Math.PI * 2,
    fidgetX: 0,
    fidgetTimer: 0,
    fidgetNext: 2 + Math.random() * 3,
    speakPhase: 0,
    shakeX: 0,
    shakeY: 0,
    sweatDrops: [],
  };
}

export default function SuspectAvatarPixi({ name, gender, stressLevel, size = 'lg', speaking = false }: SuspectAvatarProps) {
  const { w, h, frame } = SIZES[size];
  const src = portraitFile(name, gender);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const animRef = useRef<AnimState>(initAnim());
  const lastTimeRef = useRef(0);
  const stressRef = useRef(stressLevel);
  const speakingRef = useRef(speaking);
  stressRef.current = stressLevel;
  speakingRef.current = speaking;

  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;
    lastTimeRef.current = 0;
    animRef.current = initAnim();

    const tick = (ts: number) => {
      const dt = lastTimeRef.current === 0 ? 1 / 60 : Math.min((ts - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = ts;
      const stress = stressRef.current;
      const isSpeaking = speakingRef.current;
      const anim = animRef.current;
      anim.time += dt;

      // ===== UPDATE ANIMATIONS =====

      // Breathing — speed increases with stress
      const breathSpeed = stress >= 7 ? 3.5 : stress >= 4 ? 2.2 : 1.4;
      anim.breathPhase += dt * breathSpeed;

      // Idle head bob — slow gentle sway
      anim.bobPhase += dt * 0.6;

      // Fidget — sudden lateral shifts at high stress
      if (stress >= 5) {
        anim.fidgetTimer += dt;
        if (anim.fidgetTimer >= anim.fidgetNext) {
          anim.fidgetTimer = 0;
          const intensity = stress >= 8 ? 3 : stress >= 6 ? 2 : 1;
          anim.fidgetX = (Math.random() > 0.5 ? 1 : -1) * intensity;
          anim.fidgetNext = stress >= 8 ? 0.3 + Math.random() * 0.5 : 1 + Math.random() * 2;
        }
        // Exponential decay back to center
        anim.fidgetX *= Math.pow(0.02, dt);
        if (Math.abs(anim.fidgetX) < 0.05) anim.fidgetX = 0;
      } else {
        anim.fidgetX = 0;
      }

      // Stress shake — constant micro-tremor at very high stress
      if (stress >= 8) {
        const shakeIntensity = stress >= 9 ? 1.5 : 0.8;
        anim.shakeX = (Math.random() - 0.5) * shakeIntensity;
        anim.shakeY = (Math.random() - 0.5) * shakeIntensity * 0.5;
      } else {
        anim.shakeX = 0;
        anim.shakeY = 0;
      }

      // Speaking phase
      if (isSpeaking) {
        anim.speakPhase += dt * 7;
      }

      // ===== APPLY TRANSFORMS TO IMAGE =====
      const scale = size === 'sm' ? 0.5 : size === 'md' ? 0.75 : 1;

      // Breathing: gentle vertical oscillation
      const breathY = Math.sin(anim.breathPhase) * 1.5 * scale;

      // Idle bob: very subtle head sway
      const bobX = Math.sin(anim.bobPhase) * 0.4 * scale;
      const bobRotate = Math.sin(anim.bobPhase * 0.7) * 0.25;

      // Speaking: rhythmic subtle bounce
      const speakBounce = isSpeaking ? Math.abs(Math.sin(anim.speakPhase)) * 1.2 * scale : 0;
      const speakScale = isSpeaking ? 1 + Math.sin(anim.speakPhase * 0.5) * 0.003 : 1;

      // Combine all transforms
      const tx = anim.fidgetX + bobX + anim.shakeX;
      const ty = breathY - speakBounce + anim.shakeY;
      const rotate = bobRotate + anim.fidgetX * 0.15;

      img.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) rotate(${rotate.toFixed(3)}deg) scale(${speakScale.toFixed(4)})`;

      // ===== DRAW CANVAS OVERLAY =====
      ctx.clearRect(0, 0, w, h);

      // Speaking glow — subtle warm highlight when speaking
      if (isSpeaking) {
        const glowAlpha = 0.04 + Math.sin(anim.speakPhase * 0.5) * 0.02;
        const grad = ctx.createRadialGradient(w * 0.5, h * 0.4, w * 0.1, w * 0.5, h * 0.4, w * 0.5);
        grad.addColorStop(0, `rgba(255, 200, 100, ${glowAlpha})`);
        grad.addColorStop(1, 'rgba(255, 200, 100, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      // Sweat drops
      if (stress >= 7) {
        const target = stress >= 9 ? 4 : stress >= 8 ? 3 : 2;
        while (anim.sweatDrops.length < target) {
          anim.sweatDrops.push({
            x: 0.2 + Math.random() * 0.6,
            y: Math.random() * 0.25,
            speed: 0.12 + Math.random() * 0.08,
          });
        }
        for (const d of anim.sweatDrops) {
          d.y += dt * d.speed;
          if (d.y > 0.5) {
            d.y = 0.05 + Math.random() * 0.1;
            d.x = 0.2 + Math.random() * 0.6;
          }
        }
        const dropW = Math.max(2, Math.round(w * 0.018));
        const dropH = Math.max(3, Math.round(h * 0.02));
        for (const d of anim.sweatDrops) {
          const dx = Math.round(d.x * w);
          const dy = Math.round(d.y * h);
          ctx.fillStyle = '#88C8F0';
          ctx.fillRect(dx, dy, dropW, dropH);
          ctx.fillStyle = '#70A8D8';
          ctx.fillRect(dx, dy + dropH, dropW, Math.round(dropH * 0.5));
          ctx.fillStyle = '#B0E0FF';
          ctx.fillRect(dx, dy, Math.max(1, dropW - 1), 1);
        }
      } else {
        anim.sweatDrops = [];
      }

      // Stress vignette — red tint pulsing at edges
      if (stress >= 5) {
        const intensity = Math.min((stress - 4) / 6, 1) * 0.3;
        const pulse = Math.sin(anim.time * 2) * 0.05;
        const alpha = intensity + pulse;
        const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.7);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, `rgba(180,30,30,${alpha})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [w, h, size]);

  return (
    <div
      style={{
        width: `${w + frame * 2}px`,
        height: `${h + frame * 2}px`,
        padding: `${frame}px`,
        background: 'linear-gradient(160deg, #C89040 0%, #9A6820 50%, #704810 100%)',
        borderRadius: '2px',
        boxShadow: 'inset 0 0 0 1px rgba(255,220,140,0.3), 0 0 0 1px #1A0E04, 0 4px 12px rgba(0,0,0,0.6)',
        flexShrink: 0,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Portrait image — animated via rAF transform */}
      <img
        ref={imgRef}
        src={src}
        alt="Suspect"
        width={w}
        height={h}
        style={{
          display: 'block',
          imageRendering: 'pixelated',
          width: w,
          height: h,
          willChange: 'transform',
        }}
      />
      {/* Animation overlay canvas */}
      <canvas
        ref={canvasRef}
        width={w}
        height={h}
        style={{
          position: 'absolute',
          top: frame,
          left: frame,
          width: w,
          height: h,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
