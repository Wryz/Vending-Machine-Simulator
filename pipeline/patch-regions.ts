/**
 * patch-regions.ts — bring regions built before 2026-11-08 up to date without
 * rebuilding them: set the pack's and meta's downtown `center`, country `cc`
 * and time zone `tz` (and `dir` for outer districts) from out/regions.json.
 * Patched regions are dropped from out/regions-uploaded.txt so
 * upload-regions.sh sends them again.
 *
 *   npx tsx patch-regions.ts
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';
import type { RegionPack } from '../src/data/types';
import type { RegionMeta } from '../workers/data-api/src/meta';
import type { RegionTarget } from './list-regions';

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'out');
const REGIONS = join(OUT, 'regions');
const UPLOADED = join(OUT, 'regions-uploaded.txt');

const all = JSON.parse(readFileSync(join(OUT, 'regions.json'), 'utf8')) as RegionTarget[];
const patched = new Set<string>();
for (const r of all) {
  const packFile = join(REGIONS, `${r.res5}.json.gz`);
  const metaFile = join(REGIONS, `${r.res5}.meta.json`);
  if (!existsSync(packFile) || !existsSync(metaFile)) continue;
  const pack = JSON.parse(gunzipSync(readFileSync(packFile)).toString('utf8')) as RegionPack;
  const meta = JSON.parse(readFileSync(metaFile, 'utf8')) as RegionMeta;
  if (meta.tz && meta.cc !== undefined && meta.center) continue;
  // Busiest cell for outer districts (no city point of their own).
  const busiest = pack.cells.reduce(
    (b, c) => (!b || c.places.length > b.places.length ? c : b),
    null as RegionPack['cells'][number] | null,
  );
  const center = r.center ?? (busiest ? { lat: busiest.lat, lng: busiest.lng } : pack.center);
  const extra = { center, cc: r.cc, tz: r.tz, ...(r.dir ? { dir: r.dir } : {}) };
  writeFileSync(
    packFile,
    gzipSync(JSON.stringify({ ...pack, name: r.name, ...extra }), { level: 9 }),
  );
  writeFileSync(metaFile, JSON.stringify({ ...meta, name: r.name, ...extra }));
  patched.add(r.res5);
}
if (existsSync(UPLOADED)) {
  const keep = readFileSync(UPLOADED, 'utf8')
    .split('\n')
    .filter((id) => id && !patched.has(id));
  writeFileSync(UPLOADED, keep.join('\n') + (keep.length ? '\n' : ''));
}
console.log(`patched ${patched.size} regions`);
