'use client';

import { useMemo } from 'react';

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
// Each has base, light (highlight), shadow, dark (deep shadow/outline)
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
  // Brown overcoat (like Detective McQueen)
  { base: '#8A6830', light: '#A08040', shadow: '#6A5020', dark: '#4A3818' },
  // Dark suit
  { base: '#2A2A38', light: '#363648', shadow: '#1E1E28', dark: '#141420' },
  // Navy blazer
  { base: '#283448', light: '#344058', shadow: '#1E2838', dark: '#141E28' },
  // Charcoal
  { base: '#3A3A3A', light: '#4A4A4A', shadow: '#2A2A2A', dark: '#1A1A1A' },
  // Olive/green
  { base: '#4A5A30', light: '#5A6A3C', shadow: '#3A4A24', dark: '#2A3818' },
];

const SHIRT = [
  { base: '#B8B8C0', light: '#D0D0D8', shadow: '#9898A0' }, // light grey
  { base: '#D8D8E0', light: '#E8E8F0', shadow: '#B8B8C0' }, // white
  { base: '#8898B0', light: '#98A8C0', shadow: '#6878A0' }, // light blue
];

const TIE_COLORS = [
  '#3848A0', // navy blue
  '#C41E1E', // red
  '#2A6040', // green
  '#684098', // purple
  '#8A6830', // gold
  null,       // no tie
];

const OL = '#0A0A0A'; // outline

// --- Grid 24×32 ---
const W = 24;
const H = 32;

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

// --- Draw portrait: 24×32, bust with detail ---
function drawPortrait(f: Features, stress: number): Grid {
  const g = makeGrid();
  const { skin, hair, hairStyle, jacket, shirt, tie, hasFacialHair } = f;
  const cx = 12;

  // BG: warm amber gradient
  const bgs = ['#7A3D15', '#703814', '#683012', '#5E2810', '#54220E', '#4A1C0C'];
  for (let y = 0; y < H; y++) {
    const bi = Math.min(Math.floor(y / 6), 5);
    for (let x = 0; x < W; x++) g[y][x] = bgs[bi];
  }

  // ============ HAIR (top, y=2..7) ============
  // Hair is drawn BEFORE face so face overwrites the front
  const hl = cx - 5; // 7
  const hr = cx + 4; // 16

  switch (hairStyle) {
    case 0: { // Short tidy
      rect(g, hl, 3, hr, 4, hair.base);
      rect(g, hl - 1, 4, hr + 1, 6, hair.base);
      rect(g, hl, 6, hr, 7, hair.base);
      // Highlight
      rect(g, cx - 3, 3, cx + 1, 4, hair.light);
      // Volume on top
      rect(g, hl + 1, 2, hr - 1, 3, hair.base);
      rect(g, cx - 2, 2, cx + 1, 2, hair.light);
      break;
    }
    case 1: { // Slicked back
      rect(g, hl - 1, 3, hr + 1, 5, hair.base);
      rect(g, hl, 5, hr, 7, hair.base);
      // Shine
      rect(g, cx - 3, 3, cx + 2, 4, hair.light);
      // Sideburns
      rect(g, hl - 1, 6, hl - 1, 10, hair.base);
      rect(g, hr + 1, 6, hr + 1, 10, hair.base);
      px(g, hl - 2, 7, hair.shadow);
      px(g, hr + 2, 7, hair.shadow);
      break;
    }
    case 2: { // Tall/pompadour
      rect(g, hl, 0, hr, 1, hair.base);
      rect(g, hl - 1, 2, hr + 1, 4, hair.base);
      rect(g, hl, 4, hr, 7, hair.base);
      // Pompadour highlight
      rect(g, cx - 2, 0, cx + 1, 2, hair.light);
      rect(g, cx - 3, 1, cx + 2, 1, hair.light);
      break;
    }
    case 3: { // Side part
      rect(g, hl, 3, hr + 2, 5, hair.base);
      rect(g, hl, 5, hr, 7, hair.base);
      // Part line
      px(g, cx - 2, 3, hair.shadow);
      px(g, cx - 2, 4, hair.shadow);
      // Swoopy side (right side wider)
      rect(g, hr, 3, hr + 2, 6, hair.base);
      rect(g, hr + 1, 3, hr + 2, 4, hair.light);
      break;
    }
    case 4: { // Bald
      // Just the scalp in skin tone
      rect(g, hl + 1, 4, hr - 1, 5, skin.shadow);
      rect(g, cx - 2, 4, cx + 1, 4, skin.light);
      break;
    }
    case 5: { // Messy/wavy
      // Spiky bits at top
      px(g, cx - 4, 1, hair.base);
      px(g, cx - 1, 0, hair.base);
      px(g, cx + 2, 1, hair.base);
      px(g, cx + 4, 2, hair.base);
      rect(g, hl - 1, 2, hr + 1, 4, hair.base);
      rect(g, hl, 4, hr, 7, hair.base);
      // Messy highlight
      px(g, cx - 2, 2, hair.light);
      px(g, cx + 1, 3, hair.light);
      px(g, cx - 3, 3, hair.light);
      // Side tufts
      px(g, hl - 2, 5, hair.base);
      px(g, hr + 2, 4, hair.base);
      px(g, hl - 1, 7, hair.base);
      px(g, hr + 1, 7, hair.base);
      break;
    }
  }

  // ============ FACE (y=6..16) ============
  const fl = cx - 4; // 8
  const fr = cx + 3; // 15

  // Main face block
  rect(g, fl, 6, fr, 16, skin.base);
  // Wider at cheeks (y=9..12)
  rect(g, fl - 1, 9, fl - 1, 12, skin.base);
  rect(g, fr + 1, 9, fr + 1, 12, skin.base);

  // Shadow on left side of face (lighting from right)
  for (let y = 6; y <= 16; y++) {
    px(g, fl, y, skin.shadow);
  }
  px(g, fl - 1, 9, skin.shadow);
  px(g, fl - 1, 10, skin.shadow);
  px(g, fl - 1, 11, skin.shadow);
  px(g, fl - 1, 12, skin.shadow);

  // Highlight on right side
  for (let y = 7; y <= 11; y++) {
    px(g, fr, y, skin.light);
  }

  // Forehead highlight
  rect(g, cx - 2, 6, cx + 1, 7, skin.light);

  // Chin narrowing
  px(g, fl, 15, skin.shadow);
  px(g, fl, 16, skin.dark);
  px(g, fr, 15, skin.shadow);
  px(g, fr, 16, skin.dark);
  px(g, fl + 1, 16, skin.shadow);
  px(g, fr - 1, 16, skin.shadow);

  // ============ EARS ============
  px(g, fl - 1, 10, skin.base);
  px(g, fl - 1, 11, skin.shadow);
  px(g, fl - 2, 10, skin.shadow);
  px(g, fr + 1, 10, skin.base);
  px(g, fr + 1, 11, skin.light);
  px(g, fr + 2, 10, skin.shadow);

  // ============ EYES (y=10) — small black dots ============
  const eyeY = 10;
  const shift = stress >= 7 ? 1 : 0;

  // Left eye
  px(g, cx - 3 + shift, eyeY, '#0A0A0A');
  px(g, cx - 2 + shift, eyeY, '#0A0A0A');

  // Right eye
  px(g, cx + 1 + shift, eyeY, '#0A0A0A');
  px(g, cx + 2 + shift, eyeY, '#0A0A0A');

  // ============ EYEBROWS (y=9) ============
  if (stress >= 6) {
    // Worried — inner ends raised
    px(g, cx - 3, 9, hair.dark);
    px(g, cx - 2, 9, hair.dark);
    px(g, cx - 1, 8, hair.dark);
    px(g, cx + 1, 8, hair.dark);
    px(g, cx + 2, 9, hair.dark);
    px(g, cx + 3, 9, hair.dark);
  } else {
    // Normal
    px(g, cx - 3, 9, hair.dark);
    px(g, cx - 2, 9, hair.dark);
    px(g, cx - 1, 9, hair.dark);
    px(g, cx + 1, 9, hair.dark);
    px(g, cx + 2, 9, hair.dark);
    px(g, cx + 3, 9, hair.dark);
  }

  // ============ NOSE (y=12-13) — subtle shadow ============
  px(g, cx, 12, skin.shadow);
  px(g, cx, 13, skin.shadow);
  px(g, cx - 1, 13, skin.shadow);

  // ============ MOUTH (y=14) ============
  if (stress >= 7) {
    // Worried open
    px(g, cx - 1, 14, '#3A1818');
    px(g, cx, 14, '#3A1818');
    px(g, cx + 1, 14, '#3A1818');
    px(g, cx - 1, 15, '#4A2020');
    px(g, cx, 15, '#4A2020');
  } else if (stress >= 4) {
    // Tight/neutral
    px(g, cx - 1, 14, '#5A3838');
    px(g, cx, 14, '#5A3838');
    px(g, cx + 1, 14, '#5A3838');
  } else {
    // Slight smile
    px(g, cx - 1, 14, '#6A4040');
    px(g, cx, 14, '#6A4040');
    px(g, cx + 1, 14, '#5A3838');
  }

  // ============ FACIAL HAIR ============
  if (hasFacialHair) {
    // 5 o'clock shadow / stubble
    const sc = skin.dark;
    for (let x = fl + 1; x <= fr - 1; x++) {
      px(g, x, 15, sc);
      px(g, x, 16, sc);
    }
    px(g, fl + 2, 14, sc);
    px(g, fr - 2, 14, sc);
  }

  // ============ NECK (y=17-18) ============
  rect(g, cx - 2, 17, cx + 1, 18, skin.shadow);
  px(g, cx - 1, 17, skin.base);
  px(g, cx, 17, skin.base);

  // ============ SHIRT (visible at collar, y=18-19) ============
  rect(g, cx - 3, 18, cx + 2, 19, shirt.base);
  // Collar flaps
  px(g, cx - 4, 18, shirt.base);
  px(g, cx - 4, 19, shirt.light);
  px(g, cx + 3, 18, shirt.base);
  px(g, cx + 3, 19, shirt.light);
  // Collar V
  px(g, cx - 3, 18, shirt.light);
  px(g, cx + 2, 18, shirt.light);

  // Shirt front continuing under jacket
  for (let y = 20; y < H; y++) {
    px(g, cx - 1, y, shirt.base);
    px(g, cx, y, shirt.base);
    px(g, cx + 1, y, shirt.shadow);
  }

  // ============ TIE ============
  if (tie) {
    // Knot
    px(g, cx, 18, tie);
    px(g, cx - 1, 19, tie);
    px(g, cx, 19, tie);
    // Tie body (wider then narrows)
    for (let y = 20; y < H; y++) {
      px(g, cx, y, tie);
      if (y < 28) px(g, cx - 1, y, tie);
    }
  }

  // ============ JACKET/COAT (y=19..31) ============
  const jl = 3;  // jacket left edge
  const jr = 20; // jacket right edge

  // Shoulders (y=19-20) — wide
  rect(g, jl, 19, jr, 20, jacket.base);
  // Shoulder highlight
  rect(g, jl, 19, jl + 2, 19, jacket.light);
  rect(g, jr - 2, 19, jr, 19, jacket.light);

  // Body (y=21-31)
  for (let y = 21; y < H; y++) {
    rect(g, jl, y, jr, y, jacket.base);
  }

  // Jacket shadow (left side, lighting from right)
  for (let y = 19; y < H; y++) {
    px(g, jl, y, jacket.dark);
    px(g, jl + 1, y, jacket.shadow);
  }

  // Jacket highlight (right side)
  for (let y = 20; y < H; y++) {
    px(g, jr, y, jacket.shadow);
    px(g, jr - 1, y, jacket.light);
  }

  // Lapel folds (V-shape opening showing shirt)
  for (let dy = 0; dy <= 8; dy++) {
    const y = 20 + dy;
    if (y >= H) break;
    const lx = cx - 2 - Math.floor(dy * 0.7);
    const rx = cx + 1 + Math.floor(dy * 0.7);

    // Left lapel edge
    if (lx >= jl) {
      px(g, lx, y, jacket.light);
      px(g, lx - 1, y, jacket.shadow);
    }
    // Right lapel edge
    if (rx <= jr) {
      px(g, rx, y, jacket.shadow);
      px(g, rx + 1, y, jacket.light);
    }

    // Shirt visible between lapels
    for (let x = lx + 1; x < rx; x++) {
      if (x >= 0 && x < W) {
        px(g, x, y, shirt.base);
      }
    }
  }

  // Re-draw tie on top of shirt
  if (tie) {
    for (let y = 20; y < Math.min(H, 29); y++) {
      px(g, cx, y, tie);
      if (y < 26) px(g, cx - 1, y, tie);
    }
  }

  // Jacket collar (sitting on top)
  px(g, cx - 4, 18, jacket.base);
  px(g, cx - 5, 19, jacket.base);
  px(g, cx + 3, 18, jacket.base);
  px(g, cx + 4, 19, jacket.base);

  // Jacket fold wrinkles (subtle horizontal lines)
  for (let y = 23; y < H; y += 3) {
    px(g, jl + 3, y, jacket.shadow);
    px(g, jl + 4, y, jacket.shadow);
    px(g, jr - 3, y, jacket.shadow);
    px(g, jr - 4, y, jacket.shadow);
  }

  // ============ STRESS SWEAT ============
  if (stress >= 8) {
    px(g, fr + 2, 7, '#70A8D8');
    px(g, fr + 2, 8, '#88C0E8');
    px(g, fr + 3, 9, '#70A8D8');
  }
  if (stress >= 9) {
    px(g, fl - 2, 8, '#70A8D8');
    px(g, fl - 2, 9, '#88C0E8');
  }

  // ============ BLACK OUTLINE ============
  outline(g);

  return g;
}

// --- Component ---
interface SuspectAvatarProps {
  name: string;
  stressLevel: number;
  size?: 'sm' | 'md';
}

export default function SuspectAvatar({ name, stressLevel, size = 'md' }: SuspectAvatarProps) {
  const scale = size === 'sm' ? 4 : 5;

  const boxShadow = useMemo(() => {
    const seed = hashName(name);
    const features = selectFeatures(seed);
    const grid = drawPortrait(features, stressLevel);

    const parts: string[] = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const c = grid[y][x];
        if (c) parts.push(`${x}em ${y}em 0 ${c}`);
      }
    }
    return parts.join(',');
  }, [name, stressLevel]);

  const innerW = W * scale;
  const innerH = H * scale;
  const frame = size === 'sm' ? 3 : 4;

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
