#!/usr/bin/env node
/**
 * Coinline brand assets -> assets/images/ and docs/site/ (needs ImageMagick 7: `magick`).
 *
 *   node scripts/brand/build-brand.mjs
 *
 * The mark is our own soda can (the game's cola art) on tangerine, with lighter
 * orange light rays shining from behind it. Sources in assets/brand/, made with
 * ChatGPT image generation from the in-game can (2026-11-06):
 *   icon-art.png  1024², the full icon (can, rays, contact shadow)
 *   can.png       the can alone, transparent
 *   rays.png      1024², the rays background alone
 *
 * Outputs:
 * - icon.png                     1024², opaque (App Store / iOS)
 * - splash-icon.png              transparent: can + "Coinline" wordmark (splash bg is tangerine)
 * - android-icon-foreground.png  432², can inside the adaptive icon's 66dp safe circle
 * - android-icon-background.png  432², the rays
 * - android-icon-monochrome.png  432², white can silhouette (themed icons)
 * - favicon.png                  48²
 * - docs/site/icon.png 512², docs/site/og.png 1200×630 (link previews)
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(ROOT, 'assets/brand');
const OUT = path.join(ROOT, 'assets/images');
const SITE = path.join(ROOT, 'docs/site');
const FONT = path.join(ROOT, 'node_modules/@expo-google-fonts/nunito/900Black/Nunito_900Black.ttf');
export const BRAND = '#FF6B2C';

const art = path.join(SRC, 'icon-art.png');
const can = path.join(SRC, 'can.png');
const rays = path.join(SRC, 'rays.png');

const magick = (...args) => execFileSync('magick', args.flat(), { stdio: 'inherit' });
const opaque = ['-background', BRAND, '-alpha', 'remove', '-alpha', 'off', '-strip'];
const done = (f, size) => console.log(`  ${path.relative(ROOT, f)}: ${size}`);

// App icon: opaque, no alpha (App Store requirement).
magick(art, '-resize', '1024x1024', opaque, path.join(OUT, 'icon.png'));
done(path.join(OUT, 'icon.png'), '1024×1024');

// Splash: the can with the wordmark under it, on transparency.
{
  const out = path.join(OUT, 'splash-icon.png');
  magick(
    '-size',
    '600x760',
    'xc:none',
    '(',
    can,
    '-resize',
    '520x520',
    ')',
    '-gravity',
    'north',
    '-geometry',
    '+0+40',
    '-composite',
    '-font',
    FONT,
    '-fill',
    '#FFFFFF',
    '-pointsize',
    '64',
    '-gravity',
    'south',
    '-annotate',
    '+0+24',
    'Coinline',
    '-strip',
    `PNG32:${out}`,
  );
  done(out, '600×760');
}

// Android adaptive icon (108dp canvas, safe circle 66dp ≈ 264 px of 432).
magick(rays, '-resize', '432x432', opaque, path.join(OUT, 'android-icon-background.png'));
done(path.join(OUT, 'android-icon-background.png'), '432×432');
magick(
  '-size',
  '432x432',
  'xc:none',
  '(',
  can,
  '-resize',
  '236x236',
  ')',
  '-gravity',
  'center',
  '-composite',
  '-strip',
  `PNG32:${path.join(OUT, 'android-icon-foreground.png')}`,
);
done(path.join(OUT, 'android-icon-foreground.png'), '432×432');
magick(
  '-size',
  '432x432',
  'xc:none',
  '(',
  can,
  '-resize',
  '236x236',
  '-alpha',
  'extract',
  '-threshold',
  '50%',
  '-background',
  'white',
  '-alpha',
  'shape',
  ')',
  '-gravity',
  'center',
  '-composite',
  '-strip',
  `PNG32:${path.join(OUT, 'android-icon-monochrome.png')}`,
);
done(path.join(OUT, 'android-icon-monochrome.png'), '432×432');

// Favicon.
magick(art, '-resize', '48x48', opaque, path.join(OUT, 'favicon.png'));
done(path.join(OUT, 'favicon.png'), '48×48');

// Website: icon and a link-preview card (rays, can, wordmark).
magick(art, '-resize', '512x512', opaque, path.join(SITE, 'icon.png'));
done(path.join(SITE, 'icon.png'), '512×512');
magick(
  '(',
  rays,
  '-resize',
  '1200x1200',
  '-gravity',
  'center',
  '-crop',
  '1200x630+0+0',
  '+repage',
  ')',
  '(',
  can,
  '-resize',
  '470x470',
  ')',
  '-gravity',
  'west',
  '-geometry',
  '+90+0',
  '-composite',
  '-font',
  FONT,
  '-gravity',
  'west',
  // Soft shadow first so the white type reads over the bright rays.
  '-fill',
  '#B8410F66',
  '-pointsize',
  '120',
  '-annotate',
  '+584-46',
  'Coinline',
  '-pointsize',
  '36',
  '-annotate',
  '+590+52',
  'A vending tycoon on a real map',
  '-fill',
  '#FFFFFF',
  '-pointsize',
  '120',
  '-annotate',
  '+580-50',
  'Coinline',
  '-pointsize',
  '36',
  '-annotate',
  '+586+48',
  'A vending tycoon on a real map',
  ...opaque,
  path.join(SITE, 'og.png'),
);
done(path.join(SITE, 'og.png'), '1200×630');
