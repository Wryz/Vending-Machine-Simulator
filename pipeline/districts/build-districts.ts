/**
 * build-districts.ts — district / municipality boundary polygons for the 9
 * fallback cities, from OpenStreetMap administrative boundaries via the public
 * Overpass API. The app uses them for the tab bar's "District · City" line
 * (src/map/districts.ts).
 *
 *   npx tsx districts/build-districts.ts            # all 9 cities
 *   npx tsx districts/build-districts.ts tokyo paris
 *   npx tsx districts/build-districts.ts --cached   # reuse out/districts/raw/*.json
 *
 * Per city: one Overpass query (sequential, polite), assemble each relation's
 * outer/inner ways into rings, clip to a square of ±radius around the city
 * center, simplify (Douglas-Peucker), quantize to 1e-5° and write
 * assets/cities/districts/{cityId}.json (format: DistrictFile in
 * src/map/districts.ts). See README.md next to this file.
 *
 * Data: © OpenStreetMap contributors, ODbL 1.0.
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FALLBACK_CITIES, type CityId } from '../../src/config/cities';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const OUT_DIR = join(ROOT, 'assets', 'cities', 'districts');
const RAW_DIR = join(HERE, '..', 'out', 'districts', 'raw');

const OVERPASS_URL = process.env.OVERPASS_URL ?? 'https://overpass-api.de/api/interpreter';
const USER_AGENT = 'Coinline-pipeline (myphungquoc@gmail.com)';
/** Pause between cities, to be polite to the public Overpass instance. */
const PAUSE_MS = 8_000;
/** Douglas-Peucker tolerance. */
const SIMPLIFY_M = 25;
/** Coordinates are stored as integers of 1e-5 degrees (~1.1 m). */
const SCALE = 1e5;

/** Name tags kept, as stored key → OSM tags in order of preference. */
const NAME_TAGS: Record<string, string[]> = {
  en: ['name:en'],
  ja: ['name:ja'],
  ko: ['name:ko'],
  zh: ['name:zh-Hans', 'name:zh'],
  fr: ['name:fr'],
  es: ['name:es'],
  de: ['name:de'],
  pt: ['name:pt-BR', 'name:pt'],
};

interface CityRule {
  /** admin_levels to fetch. Where they nest, the finer (higher) level wins in the app. */
  levels: number[];
  /** Half-size of the clip square, km. */
  radiusKm: number;
  /** Extra relations by exact name and level (e.g. the City of London at level 6). */
  extra?: { level: number; name: string }[];
  /** Drop these `name`s (a parent that a finer level already covers). */
  exclude?: string[];
  /** Name cleanup applied to `name` and every translation. */
  rename?: [RegExp, string][];
}

/**
 * Levels verified by inspecting is_in results at each center (Nov 2026):
 * - New York: 7 = boroughs (Manhattan…); 5 = the city, 6 = counties. New
 *   Jersey and Westchester municipalities are 8 (towns 7, villages 8).
 * - Los Angeles: 8 = cities (Los Angeles, Santa Monica, Beverly Hills…). OSM
 *   has no admin neighbourhoods inside LA; the app falls back to place points.
 * - Chicago: 10 = the 77 community areas; suburbs (Evanston, Oak Park) are 8
 *   and Chicago itself (8) is excluded. 7 = townships, skipped.
 * - London: 8 = London boroughs (and districts outside Greater London); the
 *   City of London is a sui generis level 6.
 * - Paris: 9 = arrondissements; 8 = communes around Paris (Paris excluded).
 * - Tokyo: 7 = special wards and the Tama cities.
 * - Seoul: 6 = gu, and the Gyeonggi cities.
 * - Singapore: 6 = URA planning areas (5 = regions, 7 = subzones).
 * - Sydney: 6 = LGAs (City of Sydney…); 9 = suburbs.
 */
const RULES: Record<CityId, CityRule> = {
  'new-york': { levels: [7, 8], radiusKm: 18 },
  'los-angeles': { levels: [8], radiusKm: 22 },
  chicago: { levels: [8, 10], radiusKm: 18, exclude: ['Chicago'] },
  london: {
    levels: [8],
    radiusKm: 20,
    extra: [{ level: 6, name: 'City of London' }],
    rename: [
      [/^(?:London|Royal) Borough of /, ''],
      [/^City of Westminster$/, 'Westminster'],
    ],
  },
  paris: { levels: [8, 9], radiusKm: 12, exclude: ['Paris'], rename: [[/^Paris (?=\d)/, '']] },
  tokyo: { levels: [7], radiusKm: 20 },
  seoul: { levels: [6], radiusKm: 20 },
  singapore: { levels: [6], radiusKm: 20 },
  sydney: { levels: [6], radiusKm: 20 },
};

// ---------------------------------------------------------------- Overpass

interface LatLon {
  lat: number;
  lon: number;
}
interface OsmMember {
  type: string;
  ref: number;
  role: string;
  geometry?: (LatLon | null)[];
}
interface OsmRelation {
  type: 'relation';
  id: number;
  tags: Record<string, string>;
  members: OsmMember[];
}

function query(lat: number, lng: number, rule: CityRule): string {
  const r = Math.round(rule.radiusKm * 1000 * Math.SQRT2);
  const levels = rule.levels.join('|');
  const extra = (rule.extra ?? [])
    .map(
      (e) =>
        `rel(around:${r},${lat},${lng})[boundary=administrative][admin_level=${e.level}]["name"="${e.name}"];`,
    )
    .join('');
  return (
    `[out:json][timeout:300];(` +
    `rel(around:${r},${lat},${lng})[boundary=administrative][admin_level~"^(${levels})$"];` +
    `${extra});out geom;`
  );
}

async function fetchCity(id: CityId, lat: number, lng: number, cached: boolean) {
  const rawPath = join(RAW_DIR, `${id}.json`);
  if (cached && existsSync(rawPath)) {
    return JSON.parse(readFileSync(rawPath, 'utf8')) as { elements: OsmRelation[] };
  }
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ data: query(lat, lng, RULES[id]) }),
      signal: AbortSignal.timeout(330_000),
    });
    if (res.ok) {
      const text = await res.text();
      mkdirSync(RAW_DIR, { recursive: true });
      writeFileSync(rawPath, text);
      return JSON.parse(text) as { elements: OsmRelation[] };
    }
    if (attempt >= 3 || (res.status !== 429 && res.status < 500)) {
      throw new Error(`${id}: Overpass HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    console.warn(`  ${id}: HTTP ${res.status}, retrying in 60 s`);
    await sleep(60_000);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- geometry

type Pt = [number, number]; // [lng, lat]
type Ring = Pt[];

/** Joins way pieces into closed rings by matching end points. */
function assembleRings(ways: Pt[][]): Ring[] {
  const key = (p: Pt) => `${p[0]},${p[1]}`;
  const pool = ways.filter((w) => w.length >= 2).map((w) => w.slice());
  const rings: Ring[] = [];
  while (pool.length) {
    let ring = pool.pop()!;
    let guard = 0;
    while (key(ring[0]) !== key(ring[ring.length - 1]) && guard++ < 100_000) {
      const end = key(ring[ring.length - 1]);
      const i = pool.findIndex((w) => key(w[0]) === end || key(w[w.length - 1]) === end);
      if (i < 0) break; // unclosed: dropped below
      const w = pool.splice(i, 1)[0];
      ring = ring.concat((key(w[0]) === end ? w : w.slice().reverse()).slice(1));
    }
    if (ring.length >= 4 && key(ring[0]) === key(ring[ring.length - 1])) rings.push(ring);
  }
  return rings;
}

function pointInRing(x: number, y: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Sutherland-Hodgman clip of a closed ring to an axis-aligned box. */
function clipRing(ring: Ring, [x0, y0, x1, y1]: [number, number, number, number]): Ring {
  type Edge = (p: Pt) => boolean;
  const sides: [Edge, (a: Pt, b: Pt) => Pt][] = [
    [(p) => p[0] >= x0, (a, b) => [x0, a[1] + ((b[1] - a[1]) * (x0 - a[0])) / (b[0] - a[0])]],
    [(p) => p[0] <= x1, (a, b) => [x1, a[1] + ((b[1] - a[1]) * (x1 - a[0])) / (b[0] - a[0])]],
    [(p) => p[1] >= y0, (a, b) => [a[0] + ((b[0] - a[0]) * (y0 - a[1])) / (b[1] - a[1]), y0]],
    [(p) => p[1] <= y1, (a, b) => [a[0] + ((b[0] - a[0]) * (y1 - a[1])) / (b[1] - a[1]), y1]],
  ];
  let pts = ring.slice(0, -1);
  for (const [inside, cut] of sides) {
    const out: Pt[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[(i + pts.length - 1) % pts.length];
      const b = pts[i];
      if (inside(b)) {
        if (!inside(a)) out.push(cut(a, b));
        out.push(b);
      } else if (inside(a)) out.push(cut(a, b));
    }
    pts = out;
    if (!pts.length) return [];
  }
  return pts.length >= 3 ? [...pts, pts[0]] : [];
}

/** Douglas-Peucker on a closed ring, tolerance in meters around `lat0`. */
function simplifyRing(ring: Ring, lat0: number, tolM: number): Ring {
  const kx = Math.cos((lat0 * Math.PI) / 180) * 111_320;
  const ky = 110_540;
  const xy = ring.map(([x, y]) => [x * kx, y * ky] as Pt);
  const keep = new Uint8Array(ring.length);
  keep[0] = keep[ring.length - 1] = 1;
  // Split the closed ring at its farthest point from the start so DP has a chord.
  let far = 1;
  let farD = -1;
  for (let i = 1; i < ring.length - 1; i++) {
    const d = Math.hypot(xy[i][0] - xy[0][0], xy[i][1] - xy[0][1]);
    if (d > farD) [farD, far] = [d, i];
  }
  keep[far] = 1;
  const stack: [number, number][] = [
    [0, far],
    [far, ring.length - 1],
  ];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = xy[a];
    const [bx, by] = xy[b];
    const len = Math.hypot(bx - ax, by - ay);
    let maxD = -1;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = xy[i];
      const d =
        len === 0
          ? Math.hypot(px - ax, py - ay)
          : Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / len;
      if (d > maxD) [maxD, idx] = [d, i];
    }
    if (maxD > tolM && idx > 0) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return ring.filter((_, i) => keep[i]);
}

function ringAreaM2(ring: Ring, lat0: number): number {
  const kx = Math.cos((lat0 * Math.PI) / 180) * 111_320;
  let s = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    s += ring[j][0] * kx * ring[i][1] * 110_540 - ring[i][0] * kx * ring[j][1] * 110_540;
  }
  return Math.abs(s / 2);
}

/** Integer 1e-5° coordinates, delta-encoded: [x0, y0, dx1, dy1, …], closing point dropped. */
function encodeRing(ring: Ring): number[] {
  const out: number[] = [];
  let px = 0;
  let py = 0;
  let prev = '';
  for (const [x, y] of ring.slice(0, -1)) {
    const ix = Math.round(x * SCALE);
    const iy = Math.round(y * SCALE);
    if (`${ix},${iy}` === prev) continue;
    prev = `${ix},${iy}`;
    out.push(ix - px, iy - py);
    px = ix;
    py = iy;
  }
  return out;
}

// ---------------------------------------------------------------- build

interface DistrictOut {
  /** admin_level. */
  l: number;
  /** Names: `""` = OSM `name`, others = language codes (only when different). */
  n: Record<string, string>;
  /** Polygons: each is [outer, ...holes], rings encoded by encodeRing. */
  p: number[][][];
}

function names(tags: Record<string, string>, rule: CityRule): Record<string, string> {
  const clean = (s: string) => {
    let out = s.split(';')[0].split(' / ')[0].trim();
    for (const [re, to] of rule.rename ?? []) out = out.replace(re, to);
    return out;
  };
  const base = clean(tags.name);
  const n: Record<string, string> = { '': base };
  for (const [lang, keys] of Object.entries(NAME_TAGS)) {
    const v = keys.map((k) => tags[k]).find((x) => x && x.trim());
    if (v && clean(v) !== base) n[lang] = clean(v);
  }
  return n;
}

function buildCity(id: CityId, lat: number, lng: number, rels: OsmRelation[]) {
  const rule = RULES[id];
  const dLat = rule.radiusKm / 110.54;
  const dLng = rule.radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  const box: [number, number, number, number] = [lng - dLng, lat - dLat, lng + dLng, lat + dLat];
  const minArea = (SIMPLIFY_M * 4) ** 2;
  const seen = new Set<number>();
  const out: DistrictOut[] = [];
  for (const rel of rels) {
    if (rel.type !== 'relation' || seen.has(rel.id) || !rel.tags?.name) continue;
    seen.add(rel.id);
    if (rule.exclude?.includes(rel.tags.name)) continue;
    const outerWays: Pt[][] = [];
    const innerWays: Pt[][] = [];
    for (const m of rel.members) {
      if (m.type !== 'way' || !m.geometry) continue;
      const pts = m.geometry.filter((g): g is LatLon => !!g).map((g) => [g.lon, g.lat] as Pt);
      (m.role === 'inner' ? innerWays : outerWays).push(pts);
    }
    const outers = assembleRings(outerWays);
    const inners = assembleRings(innerWays);
    const polys: Ring[][] = outers.map((o) => [o]);
    for (const h of inners) {
      const owner = polys.find((p) => pointInRing(h[0][0], h[0][1], p[0]));
      owner?.push(h);
    }
    const enc: number[][][] = [];
    for (const poly of polys) {
      const rings = poly
        .map((r) => clipRing(r, box))
        .map((r) => (r.length ? simplifyRing(r, lat, SIMPLIFY_M) : r));
      if (rings[0].length < 4 || ringAreaM2(rings[0], lat) < minArea) continue;
      const holes = rings
        .slice(1)
        .filter((r) => r.length >= 4 && ringAreaM2(r, lat) >= minArea);
      enc.push([rings[0], ...holes].map(encodeRing));
    }
    if (!enc.length) continue;
    out.push({ l: Number(rel.tags.admin_level), n: names(rel.tags, rule), p: enc });
  }
  out.sort((a, b) => a.l - b.l || a.n[''].localeCompare(b.n['']));
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const cached = args.includes('--cached');
  const ids = args.filter((a) => !a.startsWith('--'));
  const cities = FALLBACK_CITIES.filter((c) => !ids.length || ids.includes(c.id));
  mkdirSync(OUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  let total = 0;
  for (const [i, c] of cities.entries()) {
    if (i > 0 && !cached) await sleep(PAUSE_MS);
    console.log(`${c.id}: querying Overpass…`);
    const data = await fetchCity(c.id, c.lat, c.lng, cached);
    const districts = buildCity(c.id, c.lat, c.lng, data.elements);
    const file = {
      v: 1,
      city: c.id,
      source: `© OpenStreetMap contributors (ODbL), Overpass ${stamp}`,
      d: districts,
    };
    const path = join(OUT_DIR, `${c.id}.json`);
    writeFileSync(path, JSON.stringify(file));
    const size = statSync(path).size;
    total += size;
    const byLevel = districts.reduce<Record<number, number>>(
      (m, d) => ((m[d.l] = (m[d.l] ?? 0) + 1), m),
      {},
    );
    console.log(
      `  ${districts.length} districts ${JSON.stringify(byLevel)}, ${(size / 1024).toFixed(1)} KB`,
    );
  }
  console.log(`total ${(total / 1024).toFixed(1)} KB`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
