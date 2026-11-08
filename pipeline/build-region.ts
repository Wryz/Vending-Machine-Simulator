/**
 * build-region.ts — build "your area" region packs (SPEC §6.5) for the data
 * API: the same steps as build-city.ts, over every res-9 cell of one H3 res-5
 * region (about 250 km²), from the Protomaps OpenStreetMap build.
 *
 *   npx tsx list-regions.ts                     # writes out/regions.json
 *   npx tsx build-region.ts                     # every listed region not built yet
 *   npx tsx build-region.ts --limit=50          # the first 50 of them
 *   npx tsx build-region.ts 852a1073fffffff     # one region by id
 *   npx tsx build-region.ts --shard=0/4         # every 4th region (run 4 in parallel)
 *
 * Writes out/regions/{res5}.json.gz (RegionPack), {res5}-roads.json.gz
 * (RoadNet) and {res5}.meta.json (RegionMeta). upload-regions.sh copies them
 * to R2 as cells/… for the Worker.
 */
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cellToBoundary, cellToChildren, cellToLatLng } from 'h3-js';
import { DEMAND_RADIUS_M } from '../src/config/places';
import { buildArea, type AreaTarget } from './build-city';
import type { RegionTarget } from './list-regions';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out');
const REGIONS = join(OUT, 'regions');
/** A region holds ~7× a city's cells; its pack may be bigger. */
const MAX_REGION_PACK_BYTES = 3 * 1024 * 1024;
const M_PER_DEG_LAT = 111_320;

export function regionTarget(r: RegionTarget): AreaTarget {
  const ring = cellToBoundary(r.res5);
  const lats = ring.map(([lat]) => lat);
  const lngs = ring.map(([, lng]) => lng);
  const [lat, lng] = cellToLatLng(r.res5);
  const padM = DEMAND_RADIUS_M + 200;
  const dLat = padM / M_PER_DEG_LAT;
  const dLng = padM / (M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180));
  return {
    id: r.res5,
    name: r.name,
    lat,
    lng,
    res5: r.res5,
    box: [
      Math.min(...lngs) - dLng,
      Math.min(...lats) - dLat,
      Math.max(...lngs) + dLng,
      Math.max(...lats) + dLat,
    ],
    emit: cellToChildren(r.res5, 9),
    packFile: join(REGIONS, `${r.res5}.json.gz`),
    roadsFile: join(REGIONS, `${r.res5}-roads.json.gz`),
    metaFile: join(REGIONS, `${r.res5}.meta.json`),
    maxPackBytes: MAX_REGION_PACK_BYTES,
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const all = JSON.parse(readFileSync(join(OUT, 'regions.json'), 'utf8')) as RegionTarget[];
  const ids = args.filter((a) => !a.startsWith('--'));
  const limit = Number(args.find((a) => a.startsWith('--limit='))?.slice(8) ?? Infinity);
  const [shard, shards] = (args.find((a) => a.startsWith('--shard='))?.slice(8) ?? '0/1')
    .split('/')
    .map(Number);
  const todo = (ids.length ? all.filter((r) => ids.includes(r.res5)) : all)
    .filter((_, i) => i % shards === shard)
    .filter((r) => ids.length || !existsSync(join(REGIONS, `${r.res5}.meta.json`)))
    .slice(0, limit);
  console.log(`${todo.length} regions to build`);
  let done = 0;
  for (const r of todo) {
    const t0 = Date.now();
    try {
      await buildArea(regionTarget(r), false);
    } catch (e) {
      console.error(`[${r.res5}] ${r.name} failed: ${String(e)}`);
    }
    // Extracts are large and only needed once.
    rmSync(join(OUT, 'extracts', `${r.res5}.pmtiles`), { force: true });
    done++;
    console.log(`(${done}/${todo.length}) ${r.name} in ${Math.round((Date.now() - t0) / 1000)} s`);
  }
}

await main();
