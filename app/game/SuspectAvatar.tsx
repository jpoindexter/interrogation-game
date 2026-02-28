'use client';

import { useMemo, useState, useEffect } from 'react';

// --- Seed ---
function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function pick<T>(arr: T[], r: () => number): T {
  return arr[Math.floor(r() * arr.length)];
}

// --- Palettes ---
const SKIN = [
  { base: '#D4A574', light: '#E8C090', shadow: '#B88858', dark: '#946840' },
  { base: '#C08050', light: '#D89868', shadow: '#A06838', dark: '#805028' },
  { base: '#8D5E3C', light: '#A87650', shadow: '#704828', dark: '#583818' },
  { base: '#5C3D2E', light: '#745040', shadow: '#402A1E', dark: '#2E1E14' },
];

const HAIR = [
  { base: '#1A1A1A', light: '#2A2A2A', shadow: '#101010', dark: '#080808' },
  { base: '#4A3020', light: '#5C3C28', shadow: '#382418', dark: '#281810' },
  { base: '#5A5A5A', light: '#707070', shadow: '#404040', dark: '#2A2A2A' },
  { base: '#6A3420', light: '#804830', shadow: '#502418', dark: '#3A1810' },
  { base: '#B08830', light: '#C8A048', shadow: '#907020', dark: '#705818' },
];

const JACKET = [
  { base: '#8A6830', light: '#A08040', shadow: '#6A5020', dark: '#4A3818' },
  { base: '#2A2A38', light: '#363648', shadow: '#1E1E28', dark: '#141420' },
  { base: '#283448', light: '#344058', shadow: '#1E2838', dark: '#141E28' },
  { base: '#3A3A3A', light: '#4A4A4A', shadow: '#2A2A2A', dark: '#1A1A1A' },
  { base: '#4A5A30', light: '#5A6A3C', shadow: '#3A4A24', dark: '#2A3818' },
];

const SHIRT = [
  { base: '#B8B8C0', light: '#D0D0D8', shadow: '#9898A0' },
  { base: '#D8D8E0', light: '#E8E8F0', shadow: '#B8B8C0' },
  { base: '#8898B0', light: '#98A8C0', shadow: '#6878A0' },
];

const TIE_COLORS = [
  '#3848A0', '#C41E1E', '#2A6040', '#684098', '#8A6830', null,
];

const OL = '#0A0A0A';

// --- Grid 32×40 ---
const W = 32;
const H = 40;

type Grid = (string | null)[][];
const charMask = new Set<string>();

function makeGrid(): Grid {
  charMask.clear();
  return Array.from({ length: H }, () => Array(W).fill(null));
}

function px(g: Grid, x: number, y: number, c: string, char = true) {
  if (x >= 0 && x < W && y >= 0 && y < H) {
    g[y][x] = c;
    if (char) charMask.add(`${x},${y}`);
  }
}

function rect(g: Grid, x1: number, y1: number, x2: number, y2: number, c: string, char = true) {
  for (let y = y1; y <= y2; y++)
    for (let x = x1; x <= x2; x++)
      px(g, x, y, c, char);
}

function outline(g: Grid) {
  const snap: Grid = g.map(r => [...r]);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (charMask.has(`${x},${y}`)) {
        for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
            if (!charMask.has(`${nx},${ny}`) && snap[ny][nx] !== OL) {
              g[ny][nx] = OL;
            }
          }
        }
      }
    }
  }
}

// --- Features ---
type Features = {
  skin: typeof SKIN[number];
  hair: typeof HAIR[number];
  hairStyle: number;
  jacket: typeof JACKET[number];
  shirt: typeof SHIRT[number];
  tie: string | null;
  hasFacialHair: boolean;
};

function selectFeatures(seed: number): Features {
  const r = seededRandom(seed);
  return {
    skin: pick(SKIN, r),
    hair: pick(HAIR, r),
    hairStyle: Math.floor(r() * 6),
    jacket: pick(JACKET, r),
    shirt: pick(SHIRT, r),
    tie: pick(TIE_COLORS, r),
    hasFacialHair: r() > 0.55,
  };
}

// --- Draw portrait: 32×40 ---
function drawPortrait(f: Features, stress: number, blink: boolean): Grid {
  const g = makeGrid();
  const { skin, hair, hairStyle, jacket, shirt, tie, hasFacialHair } = f;
  const cx = 16;

  // BG: warm amber gradient
  const bgs = ['#7A3D15', '#703814', '#683012', '#5E2810', '#54220E', '#4A1C0C', '#421808', '#3A1406'];
  for (let y = 0; y < H; y++) {
    const bi = Math.min(Math.floor(y / 5), 7);
    for (let x = 0; x < W; x++) g[y][x] = bgs[bi];
  }

  // ============ HAIR (top) ============
  const hl = cx - 7;
  const hr = cx + 6;

  switch (hairStyle) {
    case 0: { // Short tidy
      rect(g, hl, 3, hr, 5, hair.base);
      rect(g, hl - 1, 5, hr + 1, 8, hair.base);
      rect(g, hl, 8, hr, 9, hair.base);
      rect(g, cx - 4, 3, cx + 2, 4, hair.light);
      rect(g, hl + 1, 2, hr - 1, 3, hair.base);
      rect(g, cx - 3, 2, cx + 2, 2, hair.light);
      break;
    }
    case 1: { // Slicked back
      rect(g, hl - 1, 3, hr + 1, 6, hair.base);
      rect(g, hl, 6, hr, 9, hair.base);
      rect(g, cx - 4, 3, cx + 3, 5, hair.light);
      // Sideburns
      rect(g, hl - 1, 8, hl - 1, 14, hair.base);
      rect(g, hr + 1, 8, hr + 1, 14, hair.base);
      px(g, hl - 2, 9, hair.shadow);
      px(g, hr + 2, 9, hair.shadow);
      break;
    }
    case 2: { // Tall/pompadour
      rect(g, hl, 0, hr, 2, hair.base);
      rect(g, hl - 1, 3, hr + 1, 5, hair.base);
      rect(g, hl, 5, hr, 9, hair.base);
      rect(g, cx - 3, 0, cx + 2, 2, hair.light);
      rect(g, cx - 4, 1, cx + 3, 2, hair.light);
      break;
    }
    case 3: { // Side part
      rect(g, hl, 3, hr + 3, 6, hair.base);
      rect(g, hl, 6, hr, 9, hair.base);
      px(g, cx - 3, 3, hair.shadow);
      px(g, cx - 3, 4, hair.shadow);
      px(g, cx - 3, 5, hair.shadow);
      rect(g, hr, 3, hr + 3, 8, hair.base);
      rect(g, hr + 1, 3, hr + 3, 5, hair.light);
      break;
    }
    case 4: { // Bald
      rect(g, hl + 2, 5, hr - 2, 7, skin.shadow);
      rect(g, cx - 3, 5, cx + 2, 6, skin.light);
      break;
    }
    case 5: { // Messy/wavy
      px(g, cx - 5, 1, hair.base); px(g, cx - 2, 0, hair.base);
      px(g, cx + 2, 1, hair.base); px(g, cx + 5, 2, hair.base);
      px(g, cx - 6, 3, hair.base); px(g, cx + 6, 3, hair.base);
      rect(g, hl - 1, 2, hr + 1, 5, hair.base);
      rect(g, hl, 5, hr, 9, hair.base);
      px(g, cx - 3, 2, hair.light); px(g, cx + 2, 3, hair.light);
      px(g, cx - 4, 4, hair.light);
      px(g, hl - 2, 6, hair.base); px(g, hr + 2, 5, hair.base);
      px(g, hl - 1, 9, hair.base); px(g, hr + 1, 9, hair.base);
      break;
    }
  }

  // ============ FACE (y=8..22) ============
  const fl = cx - 6;
  const fr = cx + 5;

  // Main face block
  rect(g, fl, 8, fr, 22, skin.base);
  // Wider at cheeks
  rect(g, fl - 1, 12, fl - 1, 16, skin.base);
  rect(g, fr + 1, 12, fr + 1, 16, skin.base);
  rect(g, fl - 1, 10, fl - 1, 11, skin.base);
  rect(g, fr + 1, 10, fr + 1, 11, skin.base);

  // Shadow left side
  for (let y = 8; y <= 22; y++) px(g, fl, y, skin.shadow);
  for (let y = 10; y <= 16; y++) px(g, fl - 1, y, skin.shadow);

  // Highlight right side
  for (let y = 9; y <= 15; y++) px(g, fr, y, skin.light);

  // Forehead highlight
  rect(g, cx - 3, 8, cx + 2, 9, skin.light);

  // Jaw narrowing
  for (let dy = 0; dy < 3; dy++) {
    px(g, fl + dy, 20 + dy, skin.shadow);
    px(g, fr - dy, 20 + dy, skin.shadow);
  }
  rect(g, fl + 2, 22, fr - 2, 22, skin.shadow);

  // ============ EARS ============
  px(g, fl - 1, 13, skin.base); px(g, fl - 1, 14, skin.shadow);
  px(g, fl - 2, 13, skin.shadow); px(g, fl - 2, 14, skin.dark);
  px(g, fr + 1, 13, skin.base); px(g, fr + 1, 14, skin.light);
  px(g, fr + 2, 13, skin.shadow); px(g, fr + 2, 14, skin.shadow);

  // ============ EYES (y=13-14) ============
  const eyeY = 13;
  const shift = stress >= 7 ? 1 : 0;

  if (blink) {
    // Closed eyes — horizontal line
    rect(g, cx - 5 + shift, eyeY, cx - 3 + shift, eyeY, '#0A0A0A');
    rect(g, cx + 1 + shift, eyeY, cx + 3 + shift, eyeY, '#0A0A0A');
  } else {
    // Left eye — 3x2 with white + pupil
    px(g, cx - 5 + shift, eyeY, '#E8E8E8');
    px(g, cx - 4 + shift, eyeY, '#0A0A0A');
    px(g, cx - 3 + shift, eyeY, '#0A0A0A');
    px(g, cx - 5 + shift, eyeY + 1, '#E8E8E8');
    px(g, cx - 4 + shift, eyeY + 1, '#0A0A0A');
    px(g, cx - 3 + shift, eyeY + 1, '#E8E8E8');

    // Right eye — 3x2 with white + pupil
    px(g, cx + 1 + shift, eyeY, '#0A0A0A');
    px(g, cx + 2 + shift, eyeY, '#0A0A0A');
    px(g, cx + 3 + shift, eyeY, '#E8E8E8');
    px(g, cx + 1 + shift, eyeY + 1, '#E8E8E8');
    px(g, cx + 2 + shift, eyeY + 1, '#0A0A0A');
    px(g, cx + 3 + shift, eyeY + 1, '#E8E8E8');

    // Stress: wide eyes — extra white below
    if (stress >= 8) {
      px(g, cx - 5 + shift, eyeY + 1, '#E8E8E8');
      px(g, cx + 3 + shift, eyeY + 1, '#E8E8E8');
      px(g, cx - 3 + shift, eyeY + 1, '#E8E8E8');
      px(g, cx + 1 + shift, eyeY + 1, '#E8E8E8');
    }
  }

  // ============ EYEBROWS (y=11-12) ============
  if (stress >= 7) {
    // Panicked — angled up in middle
    px(g, cx - 5, 12, hair.dark); px(g, cx - 4, 12, hair.dark);
    px(g, cx - 3, 11, hair.dark); px(g, cx - 2, 11, hair.dark);
    px(g, cx + 1, 11, hair.dark); px(g, cx + 2, 11, hair.dark);
    px(g, cx + 3, 12, hair.dark); px(g, cx + 4, 12, hair.dark);
  } else if (stress >= 4) {
    // Worried — slightly furrowed
    px(g, cx - 5, 12, hair.dark); px(g, cx - 4, 11, hair.dark);
    px(g, cx - 3, 11, hair.dark); px(g, cx - 2, 11, hair.dark);
    px(g, cx + 1, 11, hair.dark); px(g, cx + 2, 11, hair.dark);
    px(g, cx + 3, 11, hair.dark); px(g, cx + 4, 12, hair.dark);
  } else {
    // Normal — flat
    rect(g, cx - 5, 11, cx - 2, 12, hair.dark);
    rect(g, cx + 1, 11, cx + 4, 12, hair.dark);
    // Thin them out
    px(g, cx - 5, 11, skin.base); px(g, cx + 4, 11, skin.base);
  }

  // ============ NOSE (y=16-18) ============
  px(g, cx - 1, 16, skin.shadow); px(g, cx, 16, skin.shadow);
  px(g, cx - 1, 17, skin.shadow); px(g, cx, 17, skin.shadow);
  px(g, cx - 2, 18, skin.shadow); px(g, cx - 1, 18, skin.dark);

  // ============ MOUTH (y=19-20) ============
  if (stress >= 7) {
    // Open mouth — panicking
    rect(g, cx - 2, 19, cx + 1, 19, '#3A1818');
    rect(g, cx - 3, 20, cx + 2, 20, '#4A2020');
    rect(g, cx - 2, 20, cx + 1, 20, '#2A0808');
    // Teeth hint
    px(g, cx - 1, 19, '#C8C8C8');
    px(g, cx, 19, '#C8C8C8');
  } else if (stress >= 4) {
    // Tight grimace
    rect(g, cx - 3, 19, cx + 2, 19, '#5A3838');
    px(g, cx - 3, 19, skin.shadow);
    px(g, cx + 2, 19, skin.shadow);
  } else {
    // Neutral / slight smirk
    rect(g, cx - 2, 19, cx + 1, 19, '#6A4040');
    px(g, cx + 2, 19, '#5A3838');
    px(g, cx - 2, 20, skin.shadow);
  }

  // ============ FACIAL HAIR ============
  if (hasFacialHair) {
    const sc = skin.dark;
    for (let x = fl + 2; x <= fr - 2; x++) {
      px(g, x, 20, sc); px(g, x, 21, sc);
    }
    px(g, fl + 3, 19, sc); px(g, fr - 3, 19, sc);
    // Mustache
    rect(g, cx - 2, 18, cx + 1, 18, sc);
  }

  // ============ NECK (y=22-24) ============
  rect(g, cx - 3, 22, cx + 2, 24, skin.shadow);
  rect(g, cx - 2, 22, cx + 1, 23, skin.base);
  px(g, cx - 1, 22, skin.light);

  // ============ SHIRT (collar, y=24-25) ============
  rect(g, cx - 5, 24, cx + 4, 26, shirt.base);
  px(g, cx - 6, 24, shirt.base); px(g, cx - 6, 25, shirt.light);
  px(g, cx + 5, 24, shirt.base); px(g, cx + 5, 25, shirt.light);
  px(g, cx - 5, 24, shirt.light); px(g, cx + 4, 24, shirt.light);
  // Shirt front under jacket
  for (let y = 26; y < H; y++) {
    px(g, cx - 2, y, shirt.base); px(g, cx - 1, y, shirt.base);
    px(g, cx, y, shirt.base); px(g, cx + 1, y, shirt.shadow);
  }

  // ============ TIE ============
  if (tie) {
    px(g, cx, 24, tie); px(g, cx - 1, 25, tie); px(g, cx, 25, tie);
    for (let y = 26; y < H; y++) {
      px(g, cx, y, tie);
      if (y < 35) px(g, cx - 1, y, tie);
    }
  }

  // ============ JACKET (y=25..39) ============
  const jl = 3;
  const jr = 28;

  // Shoulders
  rect(g, jl, 25, jr, 27, jacket.base);
  rect(g, jl, 25, jl + 3, 25, jacket.light);
  rect(g, jr - 3, 25, jr, 25, jacket.light);

  // Body
  for (let y = 28; y < H; y++) rect(g, jl, y, jr, y, jacket.base);

  // Shadow left
  for (let y = 25; y < H; y++) {
    px(g, jl, y, jacket.dark); px(g, jl + 1, y, jacket.shadow);
  }
  // Highlight right
  for (let y = 26; y < H; y++) {
    px(g, jr, y, jacket.shadow); px(g, jr - 1, y, jacket.light);
  }

  // Lapel V
  for (let dy = 0; dy <= 10; dy++) {
    const y = 26 + dy;
    if (y >= H) break;
    const lx = cx - 3 - Math.floor(dy * 0.8);
    const rx = cx + 2 + Math.floor(dy * 0.8);
    if (lx >= jl) { px(g, lx, y, jacket.light); px(g, lx - 1, y, jacket.shadow); }
    if (rx <= jr) { px(g, rx, y, jacket.shadow); px(g, rx + 1, y, jacket.light); }
    for (let x = lx + 1; x < rx; x++) {
      if (x >= 0 && x < W) px(g, x, y, shirt.base);
    }
  }

  // Re-draw tie on top
  if (tie) {
    for (let y = 26; y < Math.min(H, 36); y++) {
      px(g, cx, y, tie);
      if (y < 32) px(g, cx - 1, y, tie);
    }
  }

  // Jacket collar
  px(g, cx - 6, 24, jacket.base); px(g, cx - 7, 25, jacket.base);
  px(g, cx + 5, 24, jacket.base); px(g, cx + 6, 25, jacket.base);

  // Fold wrinkles
  for (let y = 30; y < H; y += 4) {
    px(g, jl + 4, y, jacket.shadow); px(g, jl + 5, y, jacket.shadow);
    px(g, jr - 4, y, jacket.shadow); px(g, jr - 5, y, jacket.shadow);
  }

  // ============ STRESS SWEAT ============
  if (stress >= 7) {
    px(g, fr + 2, 9, '#70A8D8'); px(g, fr + 2, 10, '#88C0E8');
    px(g, fr + 3, 11, '#70A8D8');
  }
  if (stress >= 8) {
    px(g, fl - 2, 10, '#70A8D8'); px(g, fl - 2, 11, '#88C0E8');
    px(g, fr + 3, 13, '#60A0D0'); px(g, fr + 4, 14, '#70A8D8');
  }
  if (stress >= 9) {
    px(g, fl - 3, 12, '#88C0E8');
    px(g, fr + 2, 15, '#70A8D8');
    px(g, fr + 3, 16, '#88C0E8');
  }

  // ============ OUTLINE ============
  outline(g);

  return g;
}

// --- Component ---
interface SuspectAvatarProps {
  name: string;
  stressLevel: number;
  size?: 'sm' | 'md' | 'lg';
  speaking?: boolean;
}

export default function SuspectAvatar({ name, stressLevel, size = 'lg', speaking = false }: SuspectAvatarProps) {
  const scale = size === 'sm' ? 3 : size === 'md' ? 5 : 7;

  // Blink state
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(blinkInterval);
  }, []);

  // Stress fidget — random subtle offset
  const [fidgetX, setFidgetX] = useState(0);
  useEffect(() => {
    if (stressLevel < 6) { setFidgetX(0); return; }
    const interval = setInterval(() => {
      setFidgetX(Math.random() > 0.5 ? 1 : -1);
      setTimeout(() => setFidgetX(0), 100);
    }, 800 + Math.random() * 1200);
    return () => clearInterval(interval);
  }, [stressLevel]);

  const boxShadow = useMemo(() => {
    const seed = hashName(name);
    const features = selectFeatures(seed);
    const grid = drawPortrait(features, stressLevel, blink);

    const parts: string[] = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const c = grid[y][x];
        if (c) parts.push(`${x}em ${y}em 0 ${c}`);
      }
    }
    return parts.join(',');
  }, [name, stressLevel, blink]);

  const innerW = W * scale;
  const innerH = H * scale;
  const frame = size === 'sm' ? 3 : size === 'md' ? 4 : 5;

  return (
    <div
      style={{
        width: `${innerW + frame * 2}px`,
        height: `${innerH + frame * 2}px`,
        padding: `${frame}px`,
        background: 'linear-gradient(160deg, #C89040 0%, #9A6820 50%, #704810 100%)',
        borderRadius: '2px',
        boxShadow: `
          inset 0 0 0 1px rgba(255,220,140,0.3),
          0 0 0 1px #1A0E04,
          0 4px 12px rgba(0,0,0,0.6)
        `,
        imageRendering: 'pixelated',
        flexShrink: 0,
        transform: `translateX(${fidgetX}px)`,
        transition: 'transform 0.1s ease',
        animation: speaking ? 'none' : 'breathe 4s ease-in-out infinite',
      }}
    >
      <div
        style={{
          width: `${innerW}px`,
          height: `${innerH}px`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '1em',
            height: '1em',
            fontSize: `${scale}px`,
            boxShadow,
          }}
        />
      </div>
    </div>
  );
}
