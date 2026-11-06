#!/usr/bin/env node
/**
 * `node scripts/sprites/build-pins.mjs`: flat map-pin images for machines below the street-life zoom.
 *
 * A teardrop pin in the family color (two flat facets, no outlines) with a
 * round face holding a tiny vending-machine glyph, and a soft ground shadow.
 * Status variants fill the face with the status color. Rasterized here with
 * 4×4 supersampling (deterministic, no native deps), written @2x and @3x:
 *   -> assets/sprites/pins/pin-{family}[-{amber|signal|alert}]@{2,3}x.png, pin-rival
 *   -> src/map/pinImages.ts (generated)
 *
 * Colors come from the app's own config (FAMILY_ACCENT, TOKENS, MACHINE_SPRITE.rivalPad).
 */
import { Buffer } from 'node:buffer';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import * as esbuild from 'esbuild';
import prettier from 'prettier';

import { ROOT } from './lib/harness.mjs';
import { encodePNG } from './lib/png.mjs';

const OUT_DIR = path.join(ROOT, 'assets/sprites/pins');
const GENERATED = path.join(ROOT, 'src/map/pinImages.ts');
const SCALES = [2, 3];
const SS = 4;

/** Geometry in points. */
const G = {
  width: 32,
  height: 43,
  cx: 16,
  cy: 15.5,
  /** Head radius. */
  r: 14.5,
  /** Tip of the pin (the anchored point). */
  tipY: 40,
  /** Face disc radius. */
  face: 10,
  shadow: { rx: 5.5, ry: 2, alpha: 0.22 },
  /** Right facet is darkened by this share (flat low-poly shading). */
  facetShade: 0.16,
};

async function loadColors() {
  const res = await esbuild.build({
    stdin: {
      contents: [
        "export { FAMILY_ACCENT } from '@/config/machines';",
        "export { TOKENS } from '@/ui/theme';",
        "export { MACHINE_SPRITE } from '@/config/map';",
      ].join('\n'),
      resolveDir: ROOT,
      loader: 'ts',
    },
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    tsconfig: path.join(ROOT, 'tsconfig.json'),
    logLevel: 'warning',
  });
  const code = res.outputFiles[0].text;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const shade = (c, k) => c.map((v) => Math.round(v * (1 - k)));

function inTeardrop(x, y) {
  const { cx, cy, r, tipY } = G;
  const dx = x - cx;
  const dy = y - cy;
  if (dx * dx + dy * dy <= r * r) return true;
  // Cone from the tip, tangent to the head circle (below the tangent points).
  const d = tipY - cy;
  if (y < cy + (r * r) / d || y > tipY) return false;
  const half = Math.asin(r / d);
  const vx = x - cx;
  const vy = tipY - y;
  return Math.abs(Math.atan2(Math.abs(vx), vy)) <= half;
}

const inRect = (x, y, x0, y0, x1, y1) => x >= x0 && x <= x1 && y >= y0 && y <= y1;

function inRoundRect(x, y, x0, y0, x1, y1, rad) {
  if (!inRect(x, y, x0, y0, x1, y1)) return false;
  const qx = Math.min(x - x0, x1 - x);
  const qy = Math.min(y - y0, y1 - y);
  if (qx >= rad || qy >= rad) return true;
  return (rad - qx) ** 2 + (rad - qy) ** 2 <= rad * rad;
}

/** Tiny front view of a vending machine: cabinet, glass, keypad strip, pickup slot. */
function glyphAt(x, y) {
  const { cx, cy } = G;
  const w = 9;
  const h = 12;
  const x0 = cx - w / 2;
  const y0 = cy - h / 2;
  if (!inRoundRect(x, y, x0, y0, x0 + w, y0 + h, 1.4)) return 'none';
  if (inRect(x, y, x0 + 1.4, y0 + 1.4, x0 + 5.8, y0 + 8.2)) return 'hole'; // glass
  if (inRect(x, y, x0 + 6.8, y0 + 1.6, x0 + 7.7, y0 + 2.6)) return 'hole'; // keypad
  if (inRect(x, y, x0 + 6.8, y0 + 3.5, x0 + 7.7, y0 + 4.5)) return 'hole';
  if (inRect(x, y, x0 + 1.4, y0 + 9.4, x0 + 7.6, y0 + 10.6)) return 'hole'; // slot
  return 'ink';
}

/** Premultiplied RGBA of one sample point (points). */
function sample(x, y, colors) {
  let out = [0, 0, 0, 0];
  const over = (rgb, a) => {
    out = [
      rgb[0] * a + out[0] * (1 - a),
      rgb[1] * a + out[1] * (1 - a),
      rgb[2] * a + out[2] * (1 - a),
      a + out[3] * (1 - a),
    ];
  };
  const { shadow, cx, tipY } = G;
  const ex = (x - cx) / shadow.rx;
  const ey = (y - tipY) / shadow.ry;
  if (ex * ex + ey * ey <= 1) over(colors.shadow, shadow.alpha);
  if (inTeardrop(x, y)) {
    over(x > cx ? colors.bodyDark : colors.body, 1);
    const fx = x - cx;
    const fy = y - G.cy;
    if (fx * fx + fy * fy <= G.face * G.face) {
      const g = glyphAt(x, y);
      over(g === 'ink' ? colors.glyph : colors.face, 1);
    }
  }
  return out;
}

function render(colors, scale) {
  const width = G.width * scale;
  const height = G.height * scale;
  const data = new Uint8Array(width * height * 4);
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const acc = [0, 0, 0, 0];
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const s = sample((px + (sx + 0.5) / SS) / scale, (py + (sy + 0.5) / SS) / scale, colors);
          for (let k = 0; k < 4; k++) acc[k] += s[k];
        }
      }
      const n = SS * SS;
      const a = acc[3] / n;
      const i = (py * width + px) * 4;
      if (a > 0) {
        data[i] = Math.round(acc[0] / n / a);
        data[i + 1] = Math.round(acc[1] / n / a);
        data[i + 2] = Math.round(acc[2] / n / a);
      }
      data[i + 3] = Math.round(a * 255);
    }
  }
  return encodePNG({ width, height, data });
}

async function main() {
  const { FAMILY_ACCENT, TOKENS, MACHINE_SPRITE } = await loadColors();
  const white = [255, 255, 255];
  const ink = hex(TOKENS.ink);
  const variants = [];
  for (const [family, accent] of Object.entries(FAMILY_ACCENT)) {
    const body = hex(accent);
    const base = { body, bodyDark: shade(body, G.facetShade), shadow: ink };
    variants.push({ name: `pin-${family}`, colors: { ...base, face: white, glyph: body } });
    for (const status of ['amber', 'signal', 'alert']) {
      const face = hex(TOKENS[status]);
      // Amber is too light for a white glyph.
      const glyph = status === 'amber' ? ink : white;
      variants.push({ name: `pin-${family}-${status}`, colors: { ...base, face, glyph } });
    }
  }
  const rival = hex(MACHINE_SPRITE.rivalPad);
  variants.push({
    name: 'pin-rival',
    colors: {
      body: rival,
      bodyDark: shade(rival, G.facetShade),
      shadow: ink,
      face: white,
      glyph: rival,
    },
  });

  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });
  for (const v of variants) {
    for (const s of SCALES) {
      await writeFile(path.join(OUT_DIR, `${v.name}@${s}x.png`), render(v.colors, s));
    }
  }

  const lines = [
    '// GENERATED by `node scripts/sprites/build-pins.mjs`. Do not edit by hand.',
    '//',
    '// Flat teardrop pins for machines below the street-life zoom (@2x/@3x PNGs).',
    '',
    '/** Pin image size in points (icon-size 1). */',
    `export const PIN_SIZE = { width: ${G.width}, height: ${G.height} } as const;`,
    '',
    '/**',
    " * The pin tip sits this many points above the image bottom (ground shadow below it):",
    " * with `icon-anchor: 'bottom'` use `icon-offset: PIN_ICON_OFFSET` so the tip lands on the point.",
    ' */',
    `export const PIN_ICON_OFFSET: [number, number] = [0, ${G.height - G.tipY}];`,
    '',
    'export const PIN_IMAGES: Record<string, number> = {',
    ...variants.map(
      (v) => `  '${v.name}': require('../../assets/sprites/pins/${v.name}.png'),`,
    ),
    '};',
    '',
  ];
  const options = (await prettier.resolveConfig(GENERATED)) ?? {};
  await writeFile(
    GENERATED,
    await prettier.format(lines.join('\n'), { ...options, filepath: GENERATED }),
  );
  console.log(`pins: ${variants.length} images × ${SCALES.length} scales -> ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
