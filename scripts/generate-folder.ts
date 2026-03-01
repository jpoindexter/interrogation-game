/**
 * Generate 9 case folders using PixelLab API v2
 *
 * Usage: npx tsx scripts/generate-folder.ts [API_KEY] [START_FROM]
 *
 * Requires: PIXELLAB_API_KEY env var or pass as argument
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

const API_KEY = process.env.PIXELLAB_API_KEY || process.argv[2] || '';
if (!API_KEY) {
  console.error('Usage: PIXELLAB_API_KEY=xxx npx tsx scripts/generate-folder.ts');
  process.exit(1);
}

const START_FROM = parseInt(process.env.START_FROM || process.argv[3] || '0', 10);
const API_URL = 'https://api.pixellab.ai/v2/create-image-pixflux';
const OUT_DIR = join(__dirname, '..', 'public', 'ui', 'folders');

const STYLE = `Pixel art top-down view of a closed manila case folder on a dark wooden detective desk. 16-bit retro game style. Rich multi-tone pixel shading. Warm amber lighting. Noir detective aesthetic. Black pixel outline.`;

const FOLDERS = [
  // startup
  { name: 'startup', seed: 101, desc: `${STYLE} The folder has a small sticky note on top with a lightbulb doodle. Tab label area at the top. Slightly worn manila paper with coffee ring stain in corner.` },
  // office
  { name: 'office', seed: 102, desc: `${STYLE} The folder has a red CONFIDENTIAL stamp visible. Tab label area at the top. Neat and crisp manila folder with a paper clip on the edge.` },
  // medical
  { name: 'medical', seed: 103, desc: `${STYLE} The folder has a small medical cross symbol sticker. Tab label area at the top. Clean manila folder with slight crease marks.` },
  // lawfirm
  { name: 'lawfirm', seed: 104, desc: `${STYLE} The folder has a small scales of justice emblem. Tab label area at the top. Thick manila folder with a rubber band around it.` },
  // server
  { name: 'server', seed: 105, desc: `${STYLE} The folder has a small circuit board pattern sticker. Tab label area at the top. Worn manila folder with tape on one corner.` },
  // trade
  { name: 'trade', seed: 106, desc: `${STYLE} The folder has a small dollar sign stamp. Tab label area at the top. Pristine manila folder with gold paper clip.` },
  // police
  { name: 'police', seed: 107, desc: `${STYLE} The folder has a small police badge sticker and red TOP SECRET stamp. Tab label area at the top. Thick worn manila folder.` },
  // ai_lab (extra case)
  { name: 'ai_lab', seed: 108, desc: `${STYLE} The folder has a small robot face doodle sticker. Tab label area at the top. New clean manila folder.` },
  // ceos_office (extra case)
  { name: 'ceos_office', seed: 109, desc: `${STYLE} The folder has a small crown emblem stamp. Tab label area at the top. Expensive-looking thick manila folder with embossed edges.` },
];

async function checkBalance(): Promise<void> {
  const res = await fetch('https://api.pixellab.ai/v2/balance', {
    headers: { 'Authorization': `Bearer ${API_KEY}` },
  });
  if (res.ok) {
    const bal = await res.json();
    const sub = bal.data?.subscription;
    console.log(`PixelLab: ${sub?.generations || '?'} / ${sub?.total || '?'} generations remaining`);
  }
}

async function generate(desc: string, seed: number, name: string): Promise<boolean> {
  console.log(`\nGenerating ${name} (seed ${seed})...`);

  const body = {
    description: desc,
    image_size: { width: 400, height: 300 },
    text_guidance_scale: 10,
    negative_description: 'blurry, anti-aliased, smooth gradients, realistic, photographic, 3D render, low quality, text, letters, words, numbers, UI, open folder',
    outline: 'single color black outline',
    shading: 'detailed shading',
    detail: 'highly detailed',
    no_background: true,
    seed,
  };

  try {
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
      return false;
    }

    const data = await res.json();
    const base64 = data.data?.image?.base64 || data.image?.base64;
    if (!base64) {
      console.error('  No image data:', JSON.stringify(data).slice(0, 200));
      return false;
    }

    const raw = base64.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(raw, 'base64');

    const outPath = join(OUT_DIR, `${name}.png`);
    writeFileSync(outPath, buffer);
    console.log(`  Saved ${outPath} (${buffer.length} bytes)`);
    return true;
  } catch (e) {
    console.error(`  ERROR: ${e}`);
    return false;
  }
}

async function main() {
  // Ensure output dir exists
  const { mkdirSync } = await import('fs');
  mkdirSync(OUT_DIR, { recursive: true });

  await checkBalance();

  console.log(`\nGenerating ${FOLDERS.length - START_FROM} case folders...\n`);

  for (let i = START_FROM; i < FOLDERS.length; i++) {
    const f = FOLDERS[i];
    let ok = await generate(f.desc, f.seed, f.name);

    if (!ok) {
      console.log('  Retrying in 3s...');
      await new Promise(r => setTimeout(r, 3000));
      ok = await generate(f.desc, f.seed, f.name);
    }

    if (i < FOLDERS.length - 1) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  console.log('\nDone! Folders saved to public/ui/folders/');
}

main().catch(console.error);
