#!/usr/bin/env node
/**
 * Spike previews (SPEC §12): renders our MapLibre style with MapLibre GL JS
 * over a local Protomaps PMTiles extract, with machine sprites from the atlas,
 * plus three.js close-ups, into docs/spikes/images/.
 *
 *   node scripts/preview/render-previews.mjs --pmtiles=/path/to/nyc-midtown.pmtiles
 *       [--only=map|closeup|life] [--zoom=15.5] [--shots=day,night] [--light-mix=0.6]
 *
 * `--only=life` renders only the street-life close-ups (no tiles or sprites needed).
 *
 * Needs `npm run sprites` first (atlas + GLBs).
 */
import { createReadStream } from 'node:fs';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
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
const SHOTS_FILTER = arg('shots', process.argv.includes('--life') ? 'day,night' : undefined)?.split(
  ',',
);
/**
 * Experiment: blend the map light color toward white by this fraction
 * (0 = style as built). Dawn/dusk extrusions go saturated orange otherwise.
 */
const LIGHT_MIX = Number(arg('light-mix', 0));
const OUT = path.join(ROOT, 'docs/spikes/images');
/**
 * --life: street life (cars, pedestrians) from the real sim on the rendered
 * roads, at zoom 17.5 by default, day + night -> map-life-{day,night}.png.
 * Needs `npm run life-sprites` first. --life-above draws it above buildings.
 */
const LIFE = process.argv.includes('--life');
const LIFE_ABOVE = process.argv.includes('--life-above');

const CENTER = { lat: 40.754, lng: -73.984 };
/** --life looks up 6th Avenue from W 43rd St (street canyon, not Bryant Park's lawn). */
const VIEW_CENTER = LIFE ? { lat: 40.7551, lng: -73.984 } : CENTER;
// --life looks up 6th Avenue (Manhattan's grid runs ~29° east of north).
const CAMERA = {
  zoom: Number(arg('zoom', LIFE ? 17.5 : 15.5)),
  pitch: 55,
  bearing: Number(arg('bearing', LIFE ? 29 : -20)),
};
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
  const lifeCode = LIFE ? await bundle('scripts/preview/life-entry.ts', 'LifePreview') : '';
  const lifeDir = path.join(ROOT, 'assets/sprites/life');
  const lifeFiles = LIFE
    ? Object.fromEntries(
        (await readdir(lifeDir))
          .filter((f) => f.endsWith('.png'))
          .map((f) => [`/life/${f}`, { file: path.join(lifeDir, f), type: 'image/png' }]),
      )
    : {};
  const spritesDir = path.join(ROOT, 'assets/sprites');
  const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="${MAPLIBRE}/maplibre-gl.css">
<style>html,body,#map{margin:0;width:100%;height:100%}</style></head>
<body><div id="map"></div>
<script src="${PMTILES_JS}"></script>
<script src="/bundle.js"></script>
${LIFE ? '<script src="/life.js"></script>' : ''}
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
    '/life.js': { body: lifeCode, type: 'text/javascript' },
    ...lifeFiles,
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
      async ({
        when,
        CENTER,
        VIEW_CENTER,
        CAMERA,
        MACHINES,
        origin,
        iconOffset,
        LIGHT_MIX,
        TILES_OVERRIDE,
      }) => {
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
          center: [VIEW_CENTER.lng, VIEW_CENTER.lat],
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
      {
        when,
        CENTER,
        VIEW_CENTER,
        CAMERA,
        MACHINES,
        origin,
        iconOffset,
        LIGHT_MIX,
        TILES_OVERRIDE,
      },
    );
    if (LIFE) {
      const life = await page.evaluate(
        async ({ when, origin, LIFE_ABOVE }) => {
          const map = window.__map;
          const stats = await window.LifePreview.addLife(map, {
            date: when,
            spriteBase: `${origin}/life`,
            seed: 7,
            seconds: 25,
            beforeId: LIFE_ABOVE ? 'machines' : 'buildings',
          });
          await new Promise((resolve) => {
            const t = setTimeout(resolve, 20_000);
            map.once('idle', () => {
              clearTimeout(t);
              resolve();
            });
          });
          await new Promise((r) => setTimeout(r, 300));
          stats.drawn = map.queryRenderedFeatures({ layers: ['life-sprites'] }).length;
          return stats;
        },
        { when, origin, LIFE_ABOVE },
      );
      console.log('    life:', JSON.stringify(life));
      const file = path.join(OUT, `map-life-${shot.name}${LIFE_ABOVE ? '-above' : ''}.png`);
      await page.screenshot({ path: file });
      console.log(`  ${path.relative(ROOT, file)}`);
      findings.push({ shot: shot.name, life });
      continue;
    }
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

/** Street life (pedestrians, cars, reflection) in the app's close-up framing, day and night. */
async function renderLife(browser) {
  const code = await bundle('scripts/preview/closeup-entry.ts', 'Closeup');
  const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') console.error('[page]', m.text());
  });
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: code });
  const date = await page.evaluate((c) => window.Closeup.pickDate(c.lat, c.lng), CENTER);
  // The close-up viewport is the top 46% of a 390 × 844 pt phone.
  const W = 390 * 2;
  const H = Math.round(844 * 0.46) * 2;
  const SEED = 20261105;
  for (const typeId of ['snack', 'combo']) {
    const b = await page.evaluate((t) => window.Closeup.budgetReport(t), typeId);
    console.log(
      `  budget (${typeId}): worst case ${Math.round(b.total)} tris = static ${Math.round(b.staticTris)} (machine ${b.machine}, ×2 with reflection) + ` +
        `10 people × ${b.perPerson} × 2 + 4 cars × ${b.perCar} × 2 (kinds ${b.carKinds.join('/')})`,
    );
  }
  const shots = [
    { name: 'day', hh: 13, mm: 0, crowd: 0.8, traffic: 0.75, orbitDeg: 14, sale: 900 },
    { name: 'night', hh: 22, mm: 0, crowd: 0.55, traffic: 0.6, orbitDeg: -16 },
  ];
  for (const shot of shots.filter((s) => !SHOTS_FILTER || SHOTS_FILTER.includes(s.name))) {
    const dateIso = await page.evaluate(
      ([d, s]) => window.Closeup.nyDate(d.y, d.m, d.d, s.hh, s.mm).toISOString(),
      [date, shot],
    );
    const tS = await page.evaluate(
      ([seed, crowd]) => window.Closeup.pickLifeTime(seed, crowd),
      [SEED, shot.crowd],
    );
    const tWide = await page.evaluate(
      ([seed, crowd, traffic, around]) => window.Closeup.pickWideTime(seed, crowd, traffic, around),
      [SEED, shot.crowd, shot.traffic, tS],
    );
    for (const view of ['closeup', 'wide']) {
      const r = await page.evaluate((o) => window.Closeup.renderCloseupLife(o), {
        dateIso,
        lat: CENTER.lat,
        lng: CENTER.lng,
        width: view === 'closeup' ? W : 390 * 2,
        height: view === 'closeup' ? H : 520 * 2,
        supersample: 2,
        crowd: shot.crowd,
        traffic: shot.traffic,
        tS: view === 'closeup' ? tS : tWide,
        view,
        orbitDeg: view === 'closeup' ? shot.orbitDeg : 18,
        seed: SEED,
        saleAgoMs: view === 'closeup' ? shot.sale : undefined,
      });
      const w = view === 'closeup' ? W : 390 * 2;
      const h = view === 'closeup' ? H : 520 * 2;
      const png = encodePNG({ width: w, height: h, data: b64ToBuf(r.rgba) }, { alpha: false });
      const file = `closeup-life-${shot.name}${view === 'wide' ? '-wide' : ''}.png`;
      await writeFile(path.join(OUT, file), png);
      console.log(
        `  ${file}: preset ${r.preset}, night ${r.night.toFixed(2)}, t=${view === 'closeup' ? tS : tWide.toFixed(1)}s, walkers ${r.stats.walkers}, cars ${r.stats.cars}, ` +
          `street tris ${r.stats.triangles}, machine tris ${r.stats.machineTriangles}, scene tris ${r.stats.sceneTriangles}, ` +
          `drawn ${r.stats.drawn.triangles} tris / ${r.stats.drawn.calls} calls (incl. shadow pass)`,
      );
    }
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
    if (!ONLY || ONLY === 'map') await renderMaps(browser);
    if (!ONLY || ONLY === 'closeup') await renderCloseups(browser);
    if (!ONLY || ONLY === 'life') await renderLife(browser);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
