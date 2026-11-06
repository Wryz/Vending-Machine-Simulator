#!/usr/bin/env node
/**
 * App Store screenshots with captions (needs ImageMagick 7: `magick`).
 *
 *   node scripts/brand/build-store-shots.mjs
 *
 * Each raw 6.9" Simulator capture (docs/app-store/screenshots/6.9in-*.jpg) is
 * set in a rounded phone frame on the brand rays with a short headline above.
 * Writes docs/app-store/marketing/6.9in-NN.jpg (1320×2868) and 6.3in-NN.jpg
 * (1206×2622), the two sizes App Store Connect asks for.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const RAW = path.join(ROOT, 'docs/app-store/screenshots');
const OUT = path.join(ROOT, 'docs/app-store/marketing');
const RAYS = path.join(ROOT, 'assets/brand/rays.png');
const FONT = path.join(ROOT, 'node_modules/@expo-google-fonts/nunito/900Black/Nunito_900Black.ttf');
const INK = '#2B2340';
const SHADOW = '#B8410F';

/** Order on the store page, and the headline for each. */
export const SHOTS = [
  ['6.9in-01-sheet-2.jpg', 'Watch customers\nwalk up and buy'],
  ['6.9in-02-map-1.jpg', 'Build an empire\non a real map'],
  ['6.9in-03-company-1.jpg', 'Grow a side hustle\ninto a tycoon'],
  ['6.9in-04-orders-1.jpg', 'Hit daily orders,\nearn trophies'],
];

const W = 1320;
const H = 2868;
const PHONE_W = 1010; // screen width inside the frame
const BEZEL = 18;
const RADIUS = 96;
const TOP = 640; // frame top; the headline sits above

const magick = (...args) => execFileSync('magick', args.flat(), { stdio: 'inherit' });
const tmp = mkdtempSync(path.join(tmpdir(), 'coinline-shots-'));
mkdirSync(OUT, { recursive: true });

// Background: the rays, glow centred behind the phone.
const bg = path.join(tmp, 'bg.png');
magick(RAYS, '-resize', `${H}x${H}`, '-gravity', 'center', '-crop', `${W}x${H}+0+0`, '+repage', bg);

SHOTS.forEach(([file, caption], i) => {
  const n = String(i + 1).padStart(2, '0');
  const screenH = Math.round((PHONE_W * 2868) / 1320);
  const frameW = PHONE_W + BEZEL * 2;
  const frameH = screenH + BEZEL * 2;
  const screen = path.join(tmp, `screen-${n}.png`);
  const frame = path.join(tmp, `frame-${n}.png`);

  // Screen with rounded corners.
  magick(
    path.join(RAW, file),
    '-resize',
    `${PHONE_W}x${screenH}!`,
    '(',
    '+clone',
    '-alpha',
    'transparent',
    '-fill',
    'white',
    '-draw',
    `roundrectangle 0,0 ${PHONE_W - 1},${screenH - 1} ${RADIUS - BEZEL},${RADIUS - BEZEL}`,
    ')',
    '-alpha',
    'set',
    '-compose',
    'DstIn',
    '-composite',
    `PNG32:${screen}`,
  );
  // Ink bezel, the screen inside it, and a soft drop shadow.
  magick(
    '-size',
    `${frameW}x${frameH}`,
    'xc:none',
    '-fill',
    INK,
    '-draw',
    `roundrectangle 0,0 ${frameW - 1},${frameH - 1} ${RADIUS},${RADIUS}`,
    screen,
    '-geometry',
    `+${BEZEL}+${BEZEL}`,
    '-composite',
    '(',
    '+clone',
    '-background',
    '#7A2A08',
    '-shadow',
    '45x34+0+26',
    ')',
    '+swap',
    '-background',
    'none',
    '-layers',
    'merge',
    '+repage',
    `PNG32:${frame}`,
  );

  const out69 = path.join(OUT, `6.9in-${n}.jpg`);
  magick(
    bg,
    // Headline: soft shadow, then white.
    '-font',
    FONT,
    '-pointsize',
    '112',
    '-interline-spacing',
    '-6',
    '-gravity',
    'north',
    '-fill',
    `${SHADOW}88`,
    '-annotate',
    '+0+196',
    caption,
    '-fill',
    '#FFFFFF',
    '-annotate',
    '+0+188',
    caption,
    frame,
    '-gravity',
    'north',
    '-geometry',
    `+0+${TOP - 40}`,
    '-composite',
    '-alpha',
    'off',
    '-quality',
    '92',
    '-strip',
    out69,
  );
  magick(
    out69,
    '-resize',
    '1206x2622!',
    '-quality',
    '92',
    '-strip',
    path.join(OUT, `6.3in-${n}.jpg`),
  );
  console.log(`  ${n}: ${caption.replace('\n', ' ')}`);
});
