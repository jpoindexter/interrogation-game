'use client';

import { useRef, useEffect, useCallback } from 'react';

interface VoiceWaveformProps {
  isActive: boolean;
  stressLevel: number;
  className?: string;
}

/* Stress color stops: [stressLevel, hex] */
const STOPS: [number, string][] = [
  [1, '#4A9EAC'], [3, '#3A8E9C'], [4, '#C8A050'],
  [6, '#D4AD5C'], [7, '#F59E0B'], [8, '#E88A00'], [9, '#C41E1E'],
];

/* Wave layers: [freqMul, ampMul, phaseMul, opacity, lineWidth] */
const WAVES: number[][] = [
  [1.0, 1.0, 1.0, 0.6, 2.5], [1.3, 0.8, 1.4, 0.45, 2.0],
  [0.7, 0.6, 0.8, 0.3, 1.6], [1.8, 0.4, 2.0, 0.2, 1.2],
];

function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function getStressColor(stress: number): [number, number, number] {
  if (stress <= 1) return hexToRgb(STOPS[0][1]);
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [sA, cA] = STOPS[i];
    const [sB, cB] = STOPS[i + 1];
    if (stress >= sA && stress <= sB) {
      const t = (stress - sA) / (sB - sA);
      const a = hexToRgb(cA), b = hexToRgb(cB);
      return [
        Math.round(a[0] + (b[0] - a[0]) * t),
        Math.round(a[1] + (b[1] - a[1]) * t),
        Math.round(a[2] + (b[2] - a[2]) * t),
      ];
    }
  }
  return hexToRgb(STOPS[STOPS.length - 1][1]);
}

const rgba = (c: [number, number, number], a: number) =>
  `rgba(${c[0]},${c[1]},${c[2]},${a})`;

export default function VoiceWaveform({ isActive, stressLevel, className }: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ amplitude: 4, time: 0, animFrame: 0, lastTs: 0 });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = stateRef.current;
    const now = performance.now();
    const dt = s.lastTs ? (now - s.lastTs) / 1000 : 0.016;
    s.lastTs = now;
    s.time += dt;

    const targetAmp = isActive ? 30 + stressLevel * 3 : 4;
    s.amplitude += (targetAmp - s.amplitude) * 0.05;

    const W = canvas.width, H = canvas.height, midY = H / 2;
    ctx.clearRect(0, 0, W, H);

    const col = getStressColor(stressLevel);
    const glowR = 20 + s.amplitude * 1.2;

    /* Center glow */
    const glow = ctx.createRadialGradient(W / 2, midY, 0, W / 2, midY, glowR);
    glow.addColorStop(0, rgba(col, 0.12));
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    /* Stress 9 red pulse */
    const pulse = stressLevel >= 9 ? 0.08 + Math.sin(s.time * 6) * 0.06 : 0;

    /* Draw wave layers */
    for (const [fM, aM, pM, op, lw] of WAVES) {
      const freq = 0.015 * fM;
      const amp = s.amplitude * aM;
      const phase = s.time * 2.2 * pM;
      const a = op + pulse;

      ctx.beginPath();
      ctx.lineWidth = lw;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      /* Horizontal gradient for edge fade */
      const grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.15, rgba(col, a));
      grad.addColorStop(0.5, rgba(col, a));
      grad.addColorStop(0.85, rgba(col, a));
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.strokeStyle = grad;

      for (let x = 0; x <= W; x += 2) {
        const env = Math.sin((x / W) * Math.PI);
        const y = midY + Math.sin(x * freq + phase) * amp * env;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    /* Additive core glow */
    ctx.globalCompositeOperation = 'lighter';
    const core = ctx.createRadialGradient(W / 2, midY, 0, W / 2, midY, glowR * 0.5);
    core.addColorStop(0, rgba(col, 0.06));
    core.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';

    s.animFrame = requestAnimationFrame(draw);
  }, [isActive, stressLevel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);
    stateRef.current.animFrame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(stateRef.current.animFrame);
      window.removeEventListener('resize', resize);
    };
  }, [draw]);

  return (
    <canvas ref={canvasRef} className={className} style={{ width: '100%', height: '48px' }} />
  );
}
