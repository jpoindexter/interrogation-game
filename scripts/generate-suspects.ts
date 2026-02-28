/**
 * Generate suspect portraits using PixelLab API
 *
 * Usage: npx tsx scripts/generate-suspects.ts
 *
 * Requires: PIXELLAB_API_KEY env var or pass as argument
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

const API_KEY = process.env.PIXELLAB_API_KEY || process.argv[2] || '';
if (!API_KEY) {
  console.error('Usage: PIXELLAB_API_KEY=xxx npx tsx scripts/generate-suspects.ts');
  console.error('   or: npx tsx scripts/generate-suspects.ts YOUR_API_KEY');
  process.exit(1);
}

const API_URL = 'https://api.pixellab.ai/v1/generate-image-pixflux';
const OUT_DIR = join(__dirname, '..', 'public', 'suspects');

// Generate large, scale down for display (better quality)
const IMAGE_W = 300;
const IMAGE_H = 400;

const STYLE_PREFIX = `Pixel art bust portrait of a suspect in a noir detective interrogation game. 16-bit retro game style. Head and upper body visible. Rich multi-tone shading with highlight, base, shadow, and dark shadow values on every surface. Warm amber-orange gradient background. Slightly stern neutral expression, facing slightly left. Black pixel outline on character silhouette.`;

const SUSPECTS = [
  // 1 - Male, young corporate
  `${STYLE_PREFIX} Young white male, early 30s. Short brown hair neatly combed to the side. Clean shaven. Charcoal grey suit jacket, white dress shirt, blue tie.`,

  // 2 - Female, tech exec
  `${STYLE_PREFIX} East Asian woman, mid 30s. Straight black hair in a low bun. Dark navy blazer over cream blouse. Small earrings. Sharp features.`,

  // 3 - Male, older CEO
  `${STYLE_PREFIX} Older white male, late 50s. Silver grey slicked back hair. Square jaw. Expensive black suit with red power tie. Broad shoulders.`,

  // 4 - Female, doctor
  `${STYLE_PREFIX} South Asian woman, early 40s. Dark brown shoulder length wavy hair. White lab coat over dark teal blouse. Thin glasses.`,

  // 5 - Male, lawyer
  `${STYLE_PREFIX} Black male, mid 40s. Short cropped dark hair with neat fade. Trimmed goatee. Dark navy pinstripe suit, burgundy tie. Strong build.`,

  // 6 - Female, analyst
  `${STYLE_PREFIX} White woman, late 20s. Auburn red hair in a neat bob cut. Fitted charcoal blazer over light blue blouse. Pearl earrings.`,

  // 7 - Male, startup founder
  `${STYLE_PREFIX} Middle Eastern male, early 30s. Dark curly medium length hair. Short beard. Dark grey hoodie under black blazer.`,

  // 8 - Female, HR director
  `${STYLE_PREFIX} Black woman, mid 50s. Short silver grey natural hair. Deep purple blazer over black top. Gold necklace. Warm but serious expression.`,

  // 9 - Male, accountant
  `${STYLE_PREFIX} White male, late 40s. Thinning sandy blonde hair combed back. Round face. Wire-rimmed glasses. Brown tweed jacket, pale yellow shirt, olive tie.`,

  // 10 - Female, marketing VP
  `${STYLE_PREFIX} Latina woman, mid 30s. Long dark brown hair past shoulders. Sleek black blazer over white top. Red lipstick. Confident look.`,

  // 11 - Male, security director
  `${STYLE_PREFIX} East Asian male, late 30s. Short black hair military style cut. Clean shaven. Dark charcoal suit, no tie, top button undone. Muscular build.`,

  // 12 - Male, professor
  `${STYLE_PREFIX} Older white male, early 60s. Messy grey hair slightly long. Full grey beard neatly trimmed. Dark green corduroy blazer over cream turtleneck.`,
];

async function generatePortrait(description: string, index: number): Promise<void> {
  const num = String(index + 1).padStart(2, '0');
  console.log(`[${num}/12] Generating suspect-${num}...`);

  const body = {
    description,
    image_size: { width: IMAGE_W, height: IMAGE_H },
    text_guidance_scale: 10,
    negative_description: 'blurry, anti-aliased, smooth gradients, realistic, photographic, 3D render, low quality, deformed face',
    outline: 'single color black outline',
    shading: 'detailed shading',
    detail: 'highly detailed',
    direction: 'west',
    no_background: false,
    seed: 42 + index, // deterministic per portrait
  };

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`  FAILED: ${res.status} ${err}`);
    return;
  }

  const data = await res.json();
  const base64 = data.image.base64;

  // Strip data URI prefix if present
  const raw = base64.replace(/^data:image\/png;base64,/, '');
  const buffer = Buffer.from(raw, 'base64');

  const outPath = join(OUT_DIR, `suspect-${num}.png`);
  writeFileSync(outPath, buffer);
  console.log(`  Saved ${outPath} (${buffer.length} bytes, cost: $${data.usage?.usd || '?'})`);
}

async function main() {
  // Check balance first
  const balRes = await fetch('https://api.pixellab.ai/v1/balance', {
    headers: { 'Authorization': `Bearer ${API_KEY}` },
  });
  if (balRes.ok) {
    const bal = await balRes.json();
    console.log(`PixelLab balance: $${bal.balance || JSON.stringify(bal)}`);
  }

  console.log(`\nGenerating ${SUSPECTS.length} suspect portraits at ${IMAGE_W}x${IMAGE_H}...\n`);

  // Generate sequentially to avoid rate limits
  const startFrom = parseInt(process.env.START_FROM || '0', 10);
  for (let i = startFrom; i < SUSPECTS.length; i++) {
    try {
      await generatePortrait(SUSPECTS[i], i);
    } catch (e) {
      console.error(`  ERROR on ${i + 1}: ${e}`);
      console.log(`  Retrying in 3s...`);
      await new Promise(r => setTimeout(r, 3000));
      try {
        await generatePortrait(SUSPECTS[i], i);
      } catch (e2) {
        console.error(`  FAILED permanently on ${i + 1}: ${e2}`);
      }
    }
    if (i < SUSPECTS.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log('\nDone! Portraits saved to public/suspects/');
}

main().catch(console.error);
