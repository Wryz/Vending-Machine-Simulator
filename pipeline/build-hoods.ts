/**
 * Named neighbourhoods for every region (SPEC §4.4 districts): the points the
 * app turns into neighbourhood areas (each map cell joins its nearest name),
 * so chapter unlocks follow real places (SoHo, Tribeca…) instead of circles.
 *
 *   npx tsx build-hoods.ts            # every region in out/regions.json, skipping done ones
 *   npx tsx build-hoods.ts 8529a1d7fffffff …
 *
 * Reads the Protomaps planet `places` layer at z12 (neighbourhoods, quarters and
 * small localities are all present at that zoom), one small extract per region,
 * deleted afterwards. Output: out/hoods/{res5}.json  { v: 1, hoods: [{ n, a, o, k }] }
 *   n name · a lat · o lng · k 'n' neighbourhood | 'm' macrohood/quarter | 'l' locality
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cellToBoundary } from 'h3-js';

import { features, latToTileY, lngToTileX, openArchive, readTile, tilePointToLngLat } from './lib/mvt';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out');
const PLANET_URL = process.env.PLANET_URL ?? 'https://build.protomaps.com/20261107.pmtiles';
const GO_PMTILES = process.env.GO_PMTILES ?? 'pmtiles';
const Z = 12;
/** Margin around the region hexagon (degrees): names just outside still own their edge cells. */
const MARGIN = 0.02;

export interface Hood {
  n: string;
  a: number;
  o: number;
  k: 'n' | 'm' | 'l';
}

function kindOf(kind: string, detail: string): Hood['k'] | null {
  if (kind === 'neighbourhood') return detail === 'suburb' ? 'm' : 'n';
  if (kind === 'macrohood') return 'm';
  // Towns and villages in outer districts act as neighbourhoods; big cities don't.
  if (kind === 'locality' && ['town', 'village', 'hamlet', 'suburb', 'quarter'].includes(detail))
    return 'l';
  return null;
}

async function buildOne(res5: string): Promise<number> {
  const ring = cellToBoundary(res5);
  const lats = ring.map((p) => p[0]);
  const lngs = ring.map((p) => p[1]);
  const [s, n] = [Math.min(...lats) - MARGIN, Math.max(...lats) + MARGIN];
  const [w, e] = [Math.min(...lngs) - MARGIN, Math.max(...lngs) + MARGIN];
  mkdirSync(join(OUT, 'extracts'), { recursive: true });
  const file = join(OUT, 'extracts', `hoods-${res5}.pmtiles`);
  execFileSync(
    GO_PMTILES,
    ['extract', PLANET_URL, file, `--bbox=${w},${s},${e},${n}`, `--minzoom=${Z}`, `--maxzoom=${Z}`],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  );
  const { pm, close } = await openArchive(file);
  const byName = new Map<string, Hood>();
  try {
    for (let x = lngToTileX(w, Z); x <= lngToTileX(e, Z); x++)
      for (let y = latToTileY(n, Z); y <= latToTileY(s, Z); y++) {
        const tile = await readTile(pm, Z, x, y);
        if (!tile) continue;
        for (const f of features(tile, 'places')) {
          const k = kindOf(String(f.properties.kind ?? ''), String(f.properties.kind_detail ?? ''));
          if (!k) continue;
          const p = f.loadGeometry()[0]?.[0];
          if (!p || p.x < 0 || p.y < 0 || p.x >= f.extent || p.y >= f.extent) continue;
          const [lng, lat] = tilePointToLngLat(Z, x, y, f.extent, p);
          if (lat < s || lat > n || lng < w || lng > e) continue;
          const name = String(f.properties['name:en'] ?? f.properties.name ?? '').trim();
          // Bare numbers ("14", "918") are block or plot labels, not neighbourhoods.
          if (!name || /^[\d\s.-]+$/.test(name)) continue;
          // Keep the finest kind for a name seen twice (a neighbourhood beats a quarter).
          const prev = byName.get(name);
          const rank = { n: 0, l: 1, m: 2 };
          if (!prev || rank[k] < rank[prev.k])
            byName.set(name, {
              n: name,
              a: Math.round(lat * 1e5) / 1e5,
              o: Math.round(lng * 1e5) / 1e5,
              k,
            });
        }
      }
  } finally {
    await close?.();
    rmSync(file, { force: true });
  }
  const hoods = [...byName.values()].sort((a, b) => a.n.localeCompare(b.n));
  writeFileSync(join(OUT, 'hoods', `${res5}.json`), JSON.stringify({ v: 1, hoods }));
  return hoods.length;
}

async function main(): Promise<void> {
  mkdirSync(join(OUT, 'hoods'), { recursive: true });
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const all = (JSON.parse(readFileSync(join(OUT, 'regions.json'), 'utf8')) as { res5: string }[]).map(
    (r) => r.res5,
  );
  const list = args.length ? args : all;
  let done = 0;
  for (const res5 of list) {
    done++;
    if (!args.length && existsSync(join(OUT, 'hoods', `${res5}.json`))) continue;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const n = await buildOne(res5);
        console.log(`[${done}/${list.length}] ${res5}: ${n} names`);
        break;
      } catch (e) {
        if (attempt === 3) console.error(`[${done}/${list.length}] ${res5}: failed (${String(e)})`);
      }
    }
  }
}

void main();
