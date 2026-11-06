#!/usr/bin/env node
/**
 * Flat, bright brand assets for Coinline (SPEC §3.1, §3.7) -> assets/images/.
 *
 *   node scripts/brand/build-flat-brand.mjs        (needs ImageMagick 7: `magick`)
 *
 * One mark everywhere: a white rounded vending machine with candy-colored
 * products and a gold coin, on tangerine.
 *
 * - icon.png                     1024², opaque, mark on tangerine
 * - splash-icon.png              transparent, mark + "Coinline" wordmark (splash bg is tangerine)
 * - android-icon-foreground.png  432², transparent, mark inside the 66dp safe circle
 * - android-icon-background.png  432², solid tangerine
 * - android-icon-monochrome.png  432², white silhouette (themed icons)
 * - favicon.png                  48², mark on tangerine
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'assets/images');
const FONT = path.join(
  ROOT,
  'node_modules/@expo-google-fonts/instrument-sans/700Bold/InstrumentSans_700Bold.ttf',
);

export const BRAND = '#FF6B2C';
const INDIGO = '#2E3270';
const GOLD = '#FFC23D';
const GOLD_DARK = '#E89A12';
const PANEL = '#ECE6F7';
const PRODUCTS = [
  ['#FF4D4D', '#FFC23D', '#2FA8FF'],
  ['#1FC7A4', '#FF7ABF', '#FFC23D'],
  ['#2FA8FF', '#FF4D4D', '#1FC7A4'],
];

/** The machine mark in a 400 × 560 box. `mono` draws a single-color silhouette. */
function mark({ mono = false } = {}) {
  const fill = (c) => (mono ? '#FFFFFF' : c);
  const cut = mono ? '#000000' : null; // windows punched out of the silhouette
  const products = PRODUCTS.flatMap((row, r) =>
    row.map(
      (c, i) =>
        `<rect x="${98 + i * 54}" y="${136 + r * 82}" width="40" height="58" rx="10" fill="${mono ? '#000000' : c}"/>`,
    ),
  ).join('');
  const shelves = [0, 1, 2]
    .map(
      (r) =>
        `<rect x="92" y="${198 + r * 82}" width="156" height="6" rx="3" fill="${mono ? '#000000' : '#5A5FA8'}"/>`,
    )
    .join('');
  const keypad = [0, 1, 2]
    .flatMap((r) =>
      [0, 1].map(
        (c) =>
          `<rect x="${282 + c * 30}" y="${232 + r * 30}" width="22" height="22" rx="7" fill="${cut ?? PANEL}"/>`,
      ),
    )
    .join('');
  return `
    ${mono ? '' : '<ellipse cx="200" cy="528" rx="150" ry="18" fill="#000000" fill-opacity="0.16"/>'}
    <rect x="40" y="20" width="320" height="496" rx="56" fill="${fill('#FFFFFF')}"/>
    <rect x="80" y="52" width="240" height="40" rx="20" fill="${cut ?? BRAND}"/>
    <rect x="80" y="116" width="180" height="270" rx="26" fill="${cut ?? INDIGO}"/>
    ${mono ? '' : products + shelves}
    <circle cx="308" cy="168" r="24" fill="${cut ?? GOLD}" ${mono ? '' : `stroke="${GOLD_DARK}" stroke-width="6"`}/>
    ${mono ? '' : `<rect x="304" y="154" width="8" height="28" rx="4" fill="${GOLD_DARK}"/>`}
    ${keypad}
    <rect x="80" y="412" width="180" height="62" rx="20" fill="${cut ?? INDIGO}"/>
    <rect x="282" y="420" width="52" height="46" rx="14" fill="${cut ?? PANEL}"/>
  `;
}

function svg(width, height, body, bg) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
${bg ? `<rect width="${width}" height="${height}" fill="${bg}"/>` : ''}
${body}
</svg>`;
}

/** Place the 400 × 560 mark so it is `h` tall and centered at (cx, cy). */
function placed(cx, cy, h, opts) {
  const k = h / 560;
  return `<g transform="translate(${cx - 200 * k} ${cy - 280 * k}) scale(${k})">${mark(opts)}</g>`;
}

const tmp = mkdtempSync(path.join(tmpdir(), 'coinline-brand-'));
function render(name, size, svgText, extra = []) {
  const src = path.join(tmp, `${name}.svg`);
  writeFileSync(src, svgText);
  const out = path.join(OUT, name);
  execFileSync('magick', [
    '-background',
    'none',
    '-density',
    '144',
    src,
    '-resize',
    `${size[0]}x${size[1]}!`,
    ...extra,
    out,
  ]);
  console.log(`  ${name}: ${size[0]}×${size[1]}`);
}

// App icon: opaque, mark on tangerine.
render('icon.png', [1024, 1024], svg(1024, 1024, placed(512, 530, 700), BRAND), [
  '-background',
  BRAND,
  '-alpha',
  'remove',
  '-alpha',
  'off',
]);

// Splash: mark with the wordmark under it, transparent (expo-splash-screen paints the bg).
{
  const w = 600;
  const h = 760;
  const src = path.join(tmp, 'splash.svg');
  writeFileSync(src, svg(w, h, placed(w / 2, 270, 520)));
  const out = path.join(OUT, 'splash-icon.png');
  execFileSync('magick', [
    '-background',
    'none',
    '-density',
    '144',
    src,
    '-resize',
    `${w}x${h}!`,
    '-font',
    FONT,
    '-fill',
    '#FFFFFF',
    '-pointsize',
    '58',
    '-gravity',
    'south',
    '-annotate',
    '+0+18',
    'Coinline',
    out,
  ]);
  console.log(`  splash-icon.png: ${w}×${h}`);
}

// Android adaptive icon: 108dp canvas, keep the mark inside the 66dp safe circle.
render('android-icon-background.png', [432, 432], svg(432, 432, '', BRAND));
render('android-icon-foreground.png', [432, 432], svg(432, 432, placed(216, 220, 250)));
render(
  'android-icon-monochrome.png',
  [432, 432],
  svg(432, 432, placed(216, 220, 250, { mono: true })),
  ['-fuzz', '1%', '-transparent', '#000000'],
);
render('favicon.png', [48, 48], svg(48, 48, placed(24, 25, 38), BRAND));
