/**
 * build-index.ts — the city picker's list (CityIndexEntry[], src/data/types.ts):
 * every built region in out/regions.json, cities biggest first, then outer
 * districts. Writes assets/cities/regions-index.json (bundled, so the picker
 * works before the first download) and out/regions-index.json for R2
 * (index/regions.json, served at GET /regions/index.json).
 *
 *   npx tsx build-index.ts
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CityIndexEntry } from '../src/data/types';
import type { RegionMeta } from '../workers/data-api/src/meta';
import type { RegionTarget } from './list-regions';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out');
const r5 = (v: number) => Math.round(v * 1e4) / 1e4;

const all = JSON.parse(readFileSync(join(OUT, 'regions.json'), 'utf8')) as RegionTarget[];
// Only regions already on R2 (upload-regions.sh), so every listed city downloads.
const uploadedFile = join(OUT, 'regions-uploaded.txt');
const uploaded = new Set(
  existsSync(uploadedFile) ? readFileSync(uploadedFile, 'utf8').split('\n').filter(Boolean) : [],
);
const index: CityIndexEntry[] = [];
for (const r of all) {
  if (!uploaded.has(r.res5)) continue;
  const metaFile = join(OUT, 'regions', `${r.res5}.meta.json`);
  if (!existsSync(metaFile)) continue;
  const meta = JSON.parse(readFileSync(metaFile, 'utf8')) as RegionMeta;
  // Regions too empty to ever pass SPEC §6.2 (sea, farmland) aren't worth listing.
  if (meta.totals.namedPlaces < 150 || meta.totals.pop < 20_000) continue;
  const at = meta.center ?? r.center ?? { lat: r.lat, lng: r.lng };
  index.push({
    r: r.res5,
    n: r.name,
    c: r.cc,
    z: r.tz,
    a: r5(at.lat),
    o: r5(at.lng),
    p: r.ring ? 0 : r.pop,
    ...(r.dir ? { d: r.dir } : {}),
  });
}
const json = JSON.stringify(index);
writeFileSync(join(HERE, '..', 'assets', 'cities', 'regions-index.json'), json);
writeFileSync(join(OUT, 'regions-index.json'), json);
console.log(
  `${index.length} cities (${index.filter((e) => e.d).length} outer districts), ${Math.round(json.length / 1024)} KB`,
);
