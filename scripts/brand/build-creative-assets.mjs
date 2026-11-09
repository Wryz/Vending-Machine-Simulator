#!/usr/bin/env node
/**
 * App Store creative assets (needs ImageMagick 7: `magick`).
 *
 *   node scripts/brand/build-creative-assets.mjs
 *
 * Product page headers (21:9, 3840×1646, no text) and search results art
 * (3:2, 3840×2560, one headline) for the default page and each custom
 * product page. Built from the raw Simulator captures in
 * docs/app-store/screenshots on the brand rays, with the can on both sides.
 * Important content stays inside Apple's safe areas:
 * header x 1097–2743, y 493–1154; search x 836–3004, y 765–1795.
 * Writes docs/app-store/creative/<set>-header.png and <set>-search.png (PNG: the upload field only takes PNG).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const RAW = path.join(ROOT, 'docs/app-store/screenshots');
const OUT = path.join(ROOT, 'docs/app-store/creative');
const RAYS = path.join(ROOT, 'assets/brand/rays.png');
const CAN = path.join(ROOT, 'assets/brand/can.png');
const FONT = path.join(ROOT, 'node_modules/@expo-google-fonts/nunito/900Black/Nunito_900Black.ttf');
const INK = '#2B2340';
const SHADOW = '#B8410F';

/** One set per product page: [left, centre, right] captures and the search headline. */
export const SETS = {
  main: {
    phones: ['6.9in-06-vans.jpg', '6.9in-01-customers.jpg', '6.9in-02-globe.jpg'],
    headline: 'Run vending machines\non a real map',
  },
  'real-map': {
    phones: ['6.9in-03-spot.jpg', '6.9in-02-globe.jpg', '6.9in-01-customers.jpg'],
    headline: 'Start in any city\non Earth',
  },
  tycoon: {
    phones: ['6.9in-05-machine.jpg', '6.9in-07-company.jpg', '6.9in-08-research.jpg'],
    headline: 'Grow one machine\ninto an empire',
  },
  routes: {
    phones: ['6.9in-05-machine.jpg', '6.9in-06-vans.jpg', '6.9in-03-spot.jpg'],
    headline: 'Vans drive your\ncity’s real streets',
  },
};

const magick = (...args) => execFileSync('magick', args.flat(), { stdio: 'inherit' });
const tmp = mkdtempSync(path.join(tmpdir(), 'coinline-creative-'));
mkdirSync(OUT, { recursive: true });

/** A capture in a rounded ink frame with a soft shadow, optionally tilted. */
function phone(file, width, angle) {
  const name = `${path.basename(file, '.jpg')}-${width}-${angle}`;
  const screen = path.join(tmp, `${name}-screen.png`);
  const out = path.join(tmp, `${name}.png`);
  const h = Math.round((width * 2868) / 1320);
  const bezel = Math.round(width * 0.018);
  const radius = Math.round(width * 0.095);
  magick(
    path.join(RAW, file),
    '-resize',
    `${width}x${h}!`,
    '(',
    '+clone',
    '-alpha',
    'transparent',
    '-fill',
    'white',
    '-draw',
    `roundrectangle 0,0 ${width - 1},${h - 1} ${radius - bezel},${radius - bezel}`,
    ')',
    '-alpha',
    'set',
    '-compose',
    'DstIn',
    '-composite',
    `PNG32:${screen}`,
  );
  const fw = width + bezel * 2;
  const fh = h + bezel * 2;
  magick(
    '-size',
    `${fw}x${fh}`,
    'xc:none',
    '-fill',
    INK,
    '-draw',
    `roundrectangle 0,0 ${fw - 1},${fh - 1} ${radius},${radius}`,
    screen,
    '-geometry',
    `+${bezel}+${bezel}`,
    '-composite',
    '-background',
    'none',
    '-rotate',
    String(angle),
    '(',
    '+clone',
    '-background',
    '#7A2A08',
    '-shadow',
    `45x${Math.round(width * 0.05)}+0+${Math.round(width * 0.04)}`,
    ')',
    '+swap',
    '-background',
    'none',
    '-layers',
    'merge',
    '+repage',
    `PNG32:${out}`,
  );
  return out;
}

function can(size, angle, flop) {
  const out = path.join(tmp, `can-${size}-${angle}-${flop}.png`);
  magick(
    CAN,
    '-fuzz',
    '6%',
    '-fill',
    'none',
    '-draw',
    'color 2,2 floodfill',
    ...(flop ? ['-flop'] : []),
    '-resize',
    `${size}x${size}`,
    '-background',
    'none',
    '-rotate',
    String(angle),
    '(',
    '+clone',
    '-background',
    '#7A2A08',
    '-shadow',
    '35x30+0+24',
    ')',
    '+swap',
    '-background',
    'none',
    '-layers',
    'merge',
    '+repage',
    `PNG32:${out}`,
  );
  return out;
}

function rays(w, h) {
  const out = path.join(tmp, `rays-${w}x${h}.png`);
  const s = Math.max(w, h);
  magick(RAYS, '-resize', `${s}x${s}`, '-gravity', 'center', '-crop', `${w}x${h}+0+0`, '+repage', out);
  return out;
}

/** Composite layers given as [file, centreX, top]. */
function compose(bg, layers, extra, out) {
  const args = [bg];
  for (const [file, cx, top] of layers) {
    const w = Number(execFileSync('magick', ['identify', '-format', '%w', file]).toString());
    args.push(file, '-gravity', 'northwest', '-geometry', `+${Math.round(cx - w / 2)}+${top}`, '-composite');
  }
  magick(...args, ...extra, '-alpha', 'off', '-strip', out);
}

for (const [set, { phones, headline }] of Object.entries(SETS)) {
  const [left, centre, right] = phones;

  // Header 21:9: three phones, the centre one inside the safe area; cans out wide. No text.
  compose(
    rays(3840, 1646),
    [
      [can(820, -14, false), 430, 420],
      [can(820, 14, true), 3410, 420],
      [phone(left, 560, -8), 1140, 300],
      [phone(right, 560, 8), 2700, 300],
      [phone(centre, 640, 0), 1920, 120],
    ],
    [],
    path.join(OUT, `${set}-header.png`),
  );

  // Search results 3:2: headline at the top of the safe area, phones below it.
  compose(
    rays(3840, 2560),
    [
      [can(900, -14, false), 420, 1230],
      [can(900, 14, true), 3420, 1230],
      [phone(left, 620, -8), 1060, 1420],
      [phone(right, 620, 8), 2780, 1420],
      [phone(centre, 720, 0), 1920, 1290],
    ],
    [
      '-font',
      FONT,
      '-pointsize',
      '190',
      '-interline-spacing',
      '-10',
      '-gravity',
      'north',
      '-fill',
      `${SHADOW}88`,
      '-annotate',
      '+0+784',
      headline,
      '-fill',
      '#FFFFFF',
      '-annotate',
      '+0+770',
      headline,
    ],
    path.join(OUT, `${set}-search.png`),
  );
  console.log(`  ${set}`);
}
