#!/usr/bin/env node
/**
 * Spike previews (SPEC §12): renders our MapLibre style with MapLibre GL JS
 * over a local Protomaps PMTiles extract, with machine sprites from the atlas,
 * plus three.js close-ups, into docs/spikes/images/.
 *
 *   node scripts/preview/render-previews.mjs --pmtiles=/path/to/nyc-midtown.pmtiles
 *       [--only=map|closeup] [--zoom=15.5] [--shots=day,night] [--light-mix=0.6]
 *
 * Needs `npm run sprites` first (atlas + GLBs).
 */
import { createReadStream } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

import { b64ToBuf, bundle, loadPlaywright, ROOT } from '../sprites/lib/harness.mjs';
import { encodePNG } from '../sprites/lib/png.mjs';

const MAPLIBRE = 'https://unpkg.com/maplibre-gl@6.16.0/dist';
const PMTILES_JS = 'https://unpkg.com/pmtiles@4.5.0/dist/pmtiles.js';

const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const PMTILES = arg('pmtiles', process.env.PMTILES_PATH);
/** --tiles=openfreemap renders against OpenFreeMap's public instance (OpenMapTiles schema). */
const TILES_MODE = arg('tiles', 'pmtiles');
const TILES_OVERRIDE =
  TILES_MODE === 'openfreemap'
    ? { kind: 'tilejson', url: 'https://tiles.openfreemap.org/planet', schema: 'openmaptiles' }
    : null;
const ONLY = arg('only');
const SHOTS_FILTER = arg('shots')?.split(',');
/**
 * Experiment: blend the map light color toward white by this fraction
 * (0 = style as built). Dawn/dusk extrusions go saturated orange otherwise.
 */
const LIGHT_MIX = Number(arg('light-mix', 0));
const OUT = path.join(ROOT, 'docs/spikes/images');

const CENTER = { lat: 40.754, lng: -73.984 };
const CAMERA = { zoom: Number(arg('zoom', 15.5)), pitch: 55, bearing: -20 };
const VIEWPORT = { width: 390, height: 700 };

/** A few machines around Bryant Park (hb = world heading / 45°). */
const MACHINES = [
  { lng: -73.98325, lat: 40.75365, model: 'snacks', hb: 4 },
  { lng: -73.98612, lat: 40.75478, model: 'drinks', hb: 6 },
  { lng: -73.98452, lat: 40.75528, model: 'capsules', hb: 1 },
  { lng: -73.98502, lat: 40.75302, model: 'hotFood', hb: 3 },
  { lng: -73.98285, lat: 40.75595, model: 'tech', hb: 2 },
  { lng: -73.98175, lat: 40.75415, model: 'rival', hb: 5 },
  { lng: -73.9858, lat: 40.7522, model: 'alcohol', hb: 7 },
];

async function readSpriteConsts() {
  const src = await readFile(path.join(ROOT, 'src/map/spriteImages.ts'), 'utf8');
  const off = src.match(/SPRITE_ICON_OFFSET[^=]*=\s*\[\s*([\d.]+),\s*([\d.]+)\s*\]/);
  return { iconOffset: [Number(off[1]), Number(off[2])] };
}

function serve(files) {
  const server = http.createServer(async (req, res) => {
    const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const entry = files[url];
    if (!entry) {
      res.writeHead(404).end();
      return;
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (typeof entry === 'object' && 'body' in entry) {
      res.writeHead(200, { 'Content-Type': entry.type }).end(entry.body);
      return;
    }
    const file = entry.file;
    const { size } = await stat(file);
    const range = req.headers.range?.match(/bytes=(\d+)-(\d*)/);
    if (range) {
      const start = Number(range[1]);
      const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      res.writeHead(206, {
        'Content-Type': entry.type,
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Content-Length': end - start + 1,
        'Accept-Ranges': 'bytes',
      });
      createReadStream(file, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Type': entry.type,
        'Content-Length': size,
        'Accept-Ranges': 'bytes',
      });
      createReadStream(file).pipe(res);
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function renderMaps(browser) {
  if (!PMTILES && !TILES_OVERRIDE)
    throw new Error('pass --pmtiles=<file> (or PMTILES_PATH), or --tiles=openfreemap');
  const code = await bundle('scripts/preview/map-entry.ts', 'Preview');
  const spritesDir = path.join(ROOT, 'assets/sprites');
  const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="${MAPLIBRE}/maplibre-gl.css">
<style>html,body,#map{margin:0;width:100%;height:100%}</style></head>
<body><div id="map"></div>
<script src="${PMTILES_JS}"></script>
<script src="/bundle.js"></script>
<script type="module">
import * as ml from '${MAPLIBRE}/maplibre-gl.mjs';
const maplibregl = ml.default ?? ml;
const protocol = new pmtiles.Protocol();
maplibregl.addProtocol('pmtiles', protocol.tile);
window.maplibregl = maplibregl;
window.mapReady = true;
</script></body></html>`;
  const json = { file: path.join(spritesDir, 'atlas.json'), type: 'application/json' };
  const png = { file: path.join(spritesDir, 'atlas.png'), type: 'image/png' };
  const server = await serve({
    '/': { body: html, type: 'text/html' },
    '/bundle.js': { body: code, type: 'text/javascript' },
    ...(PMTILES
      ? { '/tiles/nyc.pmtiles': { file: PMTILES, type: 'application/octet-stream' } }
      : {}),
    '/sprites/atlas.json': json,
    '/sprites/atlas@2x.json': json,
    '/sprites/atlas.png': png,
    '/sprites/atlas@2x.png': png,
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const { iconOffset } = await readSpriteConsts();

  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  await page.goto(origin + '/');
  await page.waitForFunction(() => window.mapReady === true, null, { timeout: 60_000 });

  const date = await page.evaluate((c) => window.Preview.pickDate(c.lat, c.lng), CENTER);
  console.log(`  date: ${date.y}-${date.m}-${date.d} (twilight score ${date.score.toFixed(2)})`);
  const findings = [];
  const shots = await page.evaluate(() => window.Preview.SHOTS);
  for (const shot of shots.filter((s) => !SHOTS_FILTER || SHOTS_FILTER.includes(s.name))) {
    const when = await page.evaluate(
      ([d, s]) => window.Preview.nyDate(d.y, d.m, d.d, s.hh, s.mm).toISOString(),
      [date, shot],
    );
    const result = await page.evaluate(
      async ({ when, CENTER, CAMERA, MACHINES, origin, iconOffset, LIGHT_MIX, TILES_OVERRIDE }) => {
        const { style, tod } = window.Preview.buildPreviewStyle({
          date: new Date(when),
          lat: CENTER.lat,
          lng: CENTER.lng,
          tilesUrl: `${origin}/tiles/nyc.pmtiles`,
          tiles: TILES_OVERRIDE ?? undefined,
          spriteUrl: `${origin}/sprites/atlas`,
          bearing: CAMERA.bearing,
          pitch: CAMERA.pitch,
          machines: MACHINES,
          iconOffset,
        });
        if (LIGHT_MIX > 0)
          style.light.color = window.Preview.towardWhite(style.light.color, LIGHT_MIX);
        window.__map?.remove();
        const errors = [];
        const missing = new Set();
        const map = new window.maplibregl.Map({
          container: 'map',
          style,
          center: [CENTER.lng, CENTER.lat],
          zoom: CAMERA.zoom,
          pitch: CAMERA.pitch,
          bearing: CAMERA.bearing,
          interactive: false,
          attributionControl: false,
          fadeDuration: 0,
        });
        window.__map = map;
        map.on('error', (e) => errors.push(String(e.error?.message ?? e.error ?? e)));
        map.on('styleimagemissing', (e) => missing.add(e.id));
        await new Promise((resolve) => {
          const t = setTimeout(resolve, 45_000);
          map.once('idle', () => {
            clearTimeout(t);
            resolve();
          });
        });
        await new Promise((r) => setTimeout(r, 300));
        const rendered = map.queryRenderedFeatures({ layers: ['machines'] }).length;
        const buildings = map.queryRenderedFeatures({ layers: ['buildings'] }).length;
        const labels = map
          .queryRenderedFeatures({ layers: ['label-districts', 'label-major-roads'] })
          .map((f) => f.properties['name:en'] ?? f.properties.name);
        return {
          tod,
          errors,
          missing: [...missing],
          rendered,
          buildings,
          labels: [...new Set(labels)],
        };
      },
      { when, CENTER, CAMERA, MACHINES, origin, iconOffset, LIGHT_MIX, TILES_OVERRIDE },
    );
    const suffix =
      (CAMERA.zoom === 15.5 ? '' : `-z${CAMERA.zoom}`) +
      (LIGHT_MIX > 0 ? `-lightmix${LIGHT_MIX}` : '') +
      (TILES_OVERRIDE ? '-openfreemap' : '');
    const file = path.join(OUT, `map-${shot.name}${suffix}.png`);
    await page.screenshot({ path: file });
    const ny = await page.evaluate(
      (w) => new Date(w).toLocaleString('en-US', { timeZone: 'America/New_York' }),
      when,
    );
    console.log(
      `  map-${shot.name}${suffix}: ${ny} NY, sun alt ${result.tod.sun.altitudeDeg.toFixed(1)}° az ${result.tod.sun.bearingDeg.toFixed(0)}°, dominant ${result.tod.dominant}, sprites ${result.tod.light}; ` +
        `machines drawn ${result.rendered}/${MACHINES.length}, buildings ${result.buildings}, labels ${result.labels.length}`,
    );
    if (result.errors.length) console.log('    errors:', result.errors);
    if (result.missing.length) console.log('    missing images:', result.missing);
    findings.push({ shot: shot.name, ...result });
  }
  await page.close();
  server.close();
  return { date, findings };
}

async function renderCloseups(browser) {
  const code = await bundle('scripts/preview/closeup-entry.ts', 'Closeup');
  const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: code });
  const date = await page.evaluate((c) => window.Closeup.pickDate(c.lat, c.lng), CENTER);
  const glb = (await readFile(path.join(ROOT, 'assets/models/machine-snacks.glb'))).toString(
    'base64',
  );
  const W = VIEWPORT.width * 2;
  const H = VIEWPORT.height * 2;
  for (const [name, hh, mm] of [
    ['day', 13, 0],
    ['dusk', 18, 30],
    ['night', 23, 0],
  ]) {
    const dateIso = await page.evaluate(
      ([d, h, m]) => window.Closeup.nyDate(d.y, d.m, d.d, h, m).toISOString(),
      [date, hh, mm],
    );
    const r = await page.evaluate((o) => window.Closeup.renderCloseup(o), {
      glb,
      dateIso,
      lat: CENTER.lat,
      lng: CENTER.lng,
      width: W,
      height: H,
      supersample: 2,
    });
    const png = encodePNG({ width: W, height: H, data: b64ToBuf(r.rgba) }, { alpha: false });
    await writeFile(path.join(OUT, `closeup-${name}.png`), png);
    console.log(
      `  closeup-${name}: preset ${r.preset}, sun alt ${r.sun.altitudeDeg.toFixed(1)}°, glow ${r.lighting.machineGlow.toFixed(2)}, ${(png.length / 1024).toFixed(0)} KB`,
    );
  }
  await page.close();
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({
    args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  try {
    if (ONLY !== 'closeup') await renderMaps(browser);
    if (ONLY !== 'map') await renderCloseups(browser);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
