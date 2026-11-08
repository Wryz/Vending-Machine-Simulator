/**
 * list-regions.ts — choose the "your area" regions to build (SPEC §6.5): the
 * H3 res-5 cells around the world's larger cities, from the same Protomaps
 * OpenStreetMap build (`places` layer, kind=locality, OSM population).
 *
 *   npx tsx list-regions.ts                 # population ≥ 300k (default)
 *   npx tsx list-regions.ts --min=100000
 *   npx tsx list-regions.ts --ring-min=1000000   # plus outer districts of 1M+ cities
 *
 * Writes out/regions.json: [{ res5, name, pop, lat, lng, cc, center, ring? }],
 * the cities' own regions (biggest first), then the ring of 6 neighbouring
 * regions around each city of --ring-min people or more (its outer districts).
 * `center` is where the game opens: the city's point (downtown) for its own
 * region; ring regions find their busiest spot when built. `cc` is the
 * country (Natural Earth, lib/countries.ts) for the picker's flags.
 * Every city is a region, including the former built-in nine; `tz` is its
 * IANA time zone so a city picked from afar keeps its own local time.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cellToLatLng, gridDisk, latLngToCell } from 'h3-js';
// Time zones: timezone-boundary-builder (ODbL) via tz-lookup, pipeline only.
import tzlookup from 'tz-lookup';
import type { RegionDir } from '../src/data/types';
import { countryNear } from './lib/countries';
import { features, openArchive, readTile, tilePointToLngLat } from './lib/mvt';

const PLANET_URL = process.env.PLANET_URL ?? 'https://build.protomaps.com/20261107.pmtiles';
const GO_PMTILES = process.env.GO_PMTILES ?? 'pmtiles';
const Z = 6;

export interface RegionTarget {
  res5: string;
  name: string;
  pop: number;
  lat: number;
  lng: number;
  /** ISO 3166-1 alpha-2 country, '' if unknown. */
  cc: string;
  /** IANA time zone, e.g. "Asia/Ho_Chi_Minh". */
  tz: string;
  /** Where the game opens (downtown); ring regions: chosen at build time. */
  center?: { lat: number; lng: number };
  /** Outer district: the res-5 of the city it surrounds, and which side of it. */
  ring?: string;
  dir?: RegionDir;
}

const DIRS: RegionDir[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
/** Compass side of b seen from a. */
function sideOf(a: { lat: number; lng: number }, b: { lat: number; lng: number }): RegionDir {
  const dx = (b.lng - a.lng) * Math.cos((a.lat * Math.PI) / 180);
  const dy = b.lat - a.lat;
  const deg = ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
  return DIRS[Math.round(deg / 45) % 8];
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
  const ringMin = Number(
    process.argv.find((a) => a.startsWith('--ring-min='))?.slice(11) ?? Infinity,
  );
  mkdirSync(OUT, { recursive: true });
  const file = join(OUT, `world-z${Z}.pmtiles`);
  if (!existsSync(file))
    execFileSync(GO_PMTILES, ['extract', PLANET_URL, file, `--maxzoom=${Z}`], {
      stdio: ['ignore', 'ignore', 'inherit'],
    });
  const { pm, close } = await openArchive(file);
  const byId = new Map<string, Omit<RegionTarget, 'res5' | 'cc' | 'tz'>>();
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
    const res5 = latLngToCell(c.lat, c.lng, 5);
    if (!regions.has(res5))
      regions.set(res5, {
        res5,
        ...c,
        cc: countryNear(c.lat, c.lng),
        tz: tzlookup(c.lat, c.lng),
        center: { lat: Math.round(c.lat * 1e5) / 1e5, lng: Math.round(c.lng * 1e5) / 1e5 },
      });
  }
  const list = [...regions.values()];
  // Outer districts: the ring around each big city, unless another city claims it.
  for (const r of list.filter((x) => !x.ring && x.pop >= ringMin)) {
    for (const h of gridDisk(r.res5, 1)) {
      if (regions.has(h)) continue;
      const [lat, lng] = cellToLatLng(h);
      const ring: RegionTarget = {
        res5: h,
        name: r.name,
        pop: 0,
        lat,
        lng,
        cc: countryNear(lat, lng) || r.cc,
        tz: tzlookup(lat, lng),
        ring: r.res5,
        dir: sideOf(r, { lat, lng }),
      };
      regions.set(h, ring);
      list.push(ring);
    }
  }
  writeFileSync(join(OUT, 'regions.json'), JSON.stringify(list, null, 1));
  console.log(
    `${list.length} regions (population ≥ ${min}, ${list.filter((r) => r.ring).length} outer districts); top: ${list
      .slice(0, 8)
      .map((r) => r.name)
      .join(', ')}`,
  );
}

await main();
