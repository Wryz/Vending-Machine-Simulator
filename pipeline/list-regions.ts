/**
 * list-regions.ts — choose the "your area" regions to build (SPEC §6.5): the
 * H3 res-5 cells around the world's larger cities, from the same Protomaps
 * OpenStreetMap build (`places` layer, kind=locality, OSM population).
 *
 *   npx tsx list-regions.ts                 # population ≥ 300k (default)
 *   npx tsx list-regions.ts --min=100000
 *
 * Writes out/regions.json: [{ res5, name, pop, lat, lng }] biggest first.
 * Cities within reach of a bundled fallback city are skipped (the data API
 * already sends those players to the city).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { latLngToCell } from 'h3-js';
import { FALLBACK_CITIES } from '../src/config/cities';
import { features, openArchive, readTile, tilePointToLngLat } from './lib/mvt';

const PLANET_URL = process.env.PLANET_URL ?? 'https://build.protomaps.com/20261107.pmtiles';
const GO_PMTILES = process.env.GO_PMTILES ?? 'pmtiles';
const Z = 6;
/** Fallback cities already cover this radius (workers/data-api/src/config.ts). */
const NEAR_CITY_KM = 25;

export interface RegionTarget {
  res5: string;
  name: string;
  pop: number;
  lat: number;
  lng: number;
}

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out');

function km(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dx = (bLng - aLng) * 111.32 * Math.cos((aLat * Math.PI) / 180);
  const dy = (bLat - aLat) * 111.32;
  return Math.hypot(dx, dy);
}

async function main(): Promise<void> {
  const min = Number(process.argv.find((a) => a.startsWith('--min='))?.slice(6) ?? 300_000);
  mkdirSync(OUT, { recursive: true });
  const file = join(OUT, `world-z${Z}.pmtiles`);
  if (!existsSync(file))
    execFileSync(GO_PMTILES, ['extract', PLANET_URL, file, `--maxzoom=${Z}`], {
      stdio: ['ignore', 'ignore', 'inherit'],
    });
  const { pm, close } = await openArchive(file);
  const byId = new Map<string, Omit<RegionTarget, 'res5'>>();
  const n = 2 ** Z;
  for (let x = 0; x < n; x++)
    for (let y = 0; y < n; y++) {
      const tile = await readTile(pm, Z, x, y);
      if (!tile) continue;
      for (const f of features(tile, 'places')) {
        if (f.properties.kind !== 'locality') continue;
        const p = f.loadGeometry()[0]?.[0];
        if (!p || p.x < 0 || p.y < 0 || p.x >= f.extent || p.y >= f.extent) continue;
        const pop = Number(f.properties.population ?? 0);
        if (!(pop >= min)) continue;
        const [lng, lat] = tilePointToLngLat(Z, x, y, f.extent, p);
        const name = String(f.properties['name:en'] ?? f.properties.name ?? '').trim();
        if (!name) continue;
        const key = String(f.properties.wikidata ?? `${lat.toFixed(2)},${lng.toFixed(2)}`);
        const prev = byId.get(key);
        if (!prev || prev.pop < pop) byId.set(key, { name, pop, lat, lng });
      }
    }
  await close?.();
  // One region per res-5 cell, named after its biggest city.
  const regions = new Map<string, RegionTarget>();
  for (const c of [...byId.values()].sort((a, b) => b.pop - a.pop)) {
    if (FALLBACK_CITIES.some((f) => km(c.lat, c.lng, f.lat, f.lng) <= NEAR_CITY_KM)) continue;
    const res5 = latLngToCell(c.lat, c.lng, 5);
    if (!regions.has(res5)) regions.set(res5, { res5, ...c });
  }
  const list = [...regions.values()];
  writeFileSync(join(OUT, 'regions.json'), JSON.stringify(list, null, 1));
  console.log(
    `${list.length} regions (population ≥ ${min}); top: ${list
      .slice(0, 8)
      .map((r) => r.name)
      .join(', ')}`,
  );
}

await main();
