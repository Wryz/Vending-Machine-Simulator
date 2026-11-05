#!/usr/bin/env node
/**
 * Brand assets for Coinline (SPEC §3.1, §3.7) -> assets/images/.
 *
 *   node scripts/brand/build-brand.mjs      (needs `npm run sprites` first for the GLB)
 *
 * - icon.png                     1024², opaque RGB, machine at 3/4 view glowing at dusk on slate
 * - splash-icon.png              512², transparent, paper (#F3F1EC) machine mark for the ink splash
 * - android-icon-foreground.png  432², transparent, paper mark inside the 66dp safe circle
 * - android-icon-background.png  432², solid ink #1B1F23
 * - android-icon-monochrome.png  432², white mark (themed icons)
 * - favicon.png                  48², paper mark on ink
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { b64ToBuf, bundle, launchWithBundle, ROOT } from '../sprites/lib/harness.mjs';
import { encodePNG } from '../sprites/lib/png.mjs';

const INK = '#1B1F23';
const PAPER = '#F3F1EC';
const OUT = path.join(ROOT, 'assets/images');

async function main() {
  const code = await bundle('scripts/brand/brand-entry.ts', 'Brand');
  const { browser, page } = await launchWithBundle(code);
  const glb = (await readFile(path.join(ROOT, 'assets/models/machine-snacks.glb'))).toString(
    'base64',
  );

  const write = async (name, size, b64, alpha) => {
    const png = encodePNG({ width: size, height: size, data: b64ToBuf(b64) }, { alpha });
    await writeFile(path.join(OUT, name), png);
    console.log(
      `  ${name}: ${size}×${size} ${alpha ? 'RGBA' : 'RGB'}, ${(png.length / 1024).toFixed(0)} KB`,
    );
  };

  await write(
    'icon.png',
    1024,
    await page.evaluate((g) => window.Brand.renderIcon(g, 1024), glb),
    false,
  );
  const mark = (o) => page.evaluate((opts) => window.Brand.renderMark(opts), o);
  await write(
    'splash-icon.png',
    512,
    await mark({ size: 512, markHeight: 460, color: PAPER }),
    true,
  );
  // Adaptive icon: 108dp canvas, 66dp safe circle (264 px of 432). A 230 px
  // tall mark (w ≈ 129) has a ~264 px diagonal, so it stays inside the circle.
  await write(
    'android-icon-foreground.png',
    432,
    await mark({ size: 432, markHeight: 230, color: PAPER }),
    true,
  );
  await write(
    'android-icon-monochrome.png',
    432,
    await mark({ size: 432, markHeight: 230, color: '#FFFFFF' }),
    true,
  );
  await write(
    'android-icon-background.png',
    432,
    await page.evaluate((c) => window.Brand.solid(432, c), INK),
    false,
  );
  await write(
    'favicon.png',
    48,
    await mark({ size: 48, markHeight: 40, color: PAPER, background: INK }),
    false,
  );
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
