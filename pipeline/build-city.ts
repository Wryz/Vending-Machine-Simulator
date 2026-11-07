/**
 * build-city.ts — build a fallback-city RegionPack (SPEC §6.3 / §6.5) from
 * OpenStreetMap data in the Protomaps daily planet build.
 *
 *   npx tsx build-city.ts new-york            # one city
 *   npx tsx build-city.ts --all               # all 9 cities
 *   npx tsx build-city.ts tokyo --skip-extract  # reuse out/extracts/tokyo.pmtiles
 *
 * Env:
 *   PLANET_URL  Protomaps planet archive (default: https://build.protomaps.com/20261104.pmtiles)
 *   GO_PMTILES  path to the go-pmtiles binary (default: `pmtiles` on PATH)
 *
 * Steps per city:
 *   1. `pmtiles extract` a box of ±(HALF_SIZE_M + DEMAND_RADIUS_M) around the
 *      SPEC §6.3 center, z15 only → out/extracts/{id}.pmtiles.
 *   2. Decode z15 `pois`, `buildings`, `landuse` layers (Protomaps v4 schema).
 *   3. Map POI kinds → PlaceCategory (table below). Estimate residents and
 *      office floor space from building footprints × height (see estimate()).
 *   4. Aggregate to H3 res-9 CellData; write assets/cities/{id}.json.gz
 *      (RegionPack) and out/{id}.meta.json (RegionMeta for the data API).
 *
 * Data: © OpenStreetMap contributors, ODbL 1.0. See README.md.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { cellArea, cellToLatLng, gridDisk, latLngToCell, polygonToCells } from 'h3-js';
import { FALLBACK_CITIES, type City, type CityId } from '../src/config/cities';
import { DEMAND_RADIUS_M, distanceDecay } from '../src/config/places';
import {
  PLACE_CATEGORIES,
  type CategoryNumbers,
  type CellData,
  type NamedPlace,
  type PlaceCategory,
  type RegionPack,
  type Supplier,
} from '../src/data/types';
import type { RegionMeta } from '../workers/data-api/src/meta';
import {
  areaAndCentroid,
  clipRing,
  features,
  latToTileY,
  lngToTileX,
  metresPerUnit,
  openArchive,
  osmIdFromFeatureId,
  pointInRings,
  readTile,
  ringsBBox,
  tilePointToLngLat,
  type Pt,
} from './lib/mvt';

// ---------------------------------------------------------------------------
// Tunables
// ---------------------------------------------------------------------------
const PLANET_URL = process.env.PLANET_URL ?? 'https://build.protomaps.com/20261104.pmtiles';
const PLANET_BUILD = /(\d{8})\.pmtiles$/.exec(PLANET_URL)?.[1] ?? 'unknown';
const GO_PMTILES = process.env.GO_PMTILES ?? 'pmtiles';
const Z = 15;
const H3_RES = 9;
/** Cells are emitted for a square of ±HALF_SIZE_M (6×6 km) around the center. */
const HALF_SIZE_M = 3000;
/** Named places kept per category per cell. */
const MAX_NAMED_PER_CATEGORY = 4;
/** Pack budget (gzip). If exceeded, the per-category cap is lowered. */
const MAX_PACK_BYTES = 1.5 * 1024 * 1024;

/** Residential gross floor area per resident (m²). */
const M2_PER_RESIDENT = 45;
/** Storey height used to turn building height into floors (m). */
const STOREY_M = 3.2;
/** Height assumed for buildings without a height tag (m) ≈ 2–3 storeys. */
const DEFAULT_HEIGHT_M = 8;
/** Office floor area that counts as one synthetic "office" place (m²). */
const OFFICE_M2_PER_PLACE = 15_000;
/** Isolation = 1 / (1 + activity / ISOLATION_K); activity = Σ nearby + pop / RESIDENTS_PER_PLACE. */
const ISOLATION_K = 5;
const RESIDENTS_PER_PLACE = 200;

// ---------------------------------------------------------------------------
// Category mapping: Protomaps v4 `pois.kind` → game PlaceCategory (SPEC §6.4).
// Kinds were taken from real z15 tiles (see inspect-kinds.ts). Anything not
// listed is ignored (benches, ATMs, artwork, bus stops, offices of services…).
//
// | Category    | Protomaps POI kinds                                                     |
// |-------------|-------------------------------------------------------------------------|
// | school      | school, kindergarten, childcare, prep_school, language_school,          |
// |             | music_school, dancing_school                                            |
// | university  | university, college                                                     |
// | gym         | fitness_centre, sports_centre, sports_hall, dojo, swimming_pool,        |
// |             | ice_rink, climbing                                                      |
// | office      | office, coworking_space, company, government, research_institute,       |
// |             | courthouse, townhall, public_building, embassy, diplomatic             |
// |             | + synthetic places from office floor space (see estimate())             |
// | hospital    | hospital                                                                |
// | clinic      | clinic, doctors, dentist, healthcare                                    |
// | station     | station, railway_station, train_station, halt, bus_station,             |
// |             | ferry_terminal, subway_station (subway_entrance is NOT counted)         |
// | stadium     | stadium, arena                                                          |
// | park        | park, garden*, playground*, dog_park, recreation_ground, common,        |
// |             | village_green, nature_reserve   (*named only)                          |
// | beach       | beach                                                                   |
// | nightlife   | bar, pub, nightclub, biergarten, karaoke, karaoke_box, music_venue,     |
// |             | lounge, hookah_lounge, casino, stripclub, theatre, cinema               |
// | cafe        | cafe, coffee, ice_cream, internet_cafe, bubble_tea                      |
// | restaurant  | restaurant, food_court, bbq                                             |
// | fastfood    | fast_food                                                               |
// | shopping    | supermarket, mall, department_store, marketplace and retail shop kinds  |
// |             | (clothes, shoes, books, electronics, pharmacy, bakery, …: SHOP_KINDS)   |
// |             | plus bank and post_office (walk-in foot traffic)                        |
// | hotel       | hotel, hostel, motel, guest_house, apartment (tourism), resort          |
// | airport     | aerodrome / airport / terminal (named; heliports excluded)              |
// | convention  | conference_centre, exhibition_centre, events_venue, convention_centre   |
// | religious   | place_of_worship, church, mosque, temple, shrine, synagogue             |
// | competitor  | convenience, vending_machine (never named), kiosk, newsagent, general   |
// ---------------------------------------------------------------------------
const KIND_TO_CATEGORY: Record<string, PlaceCategory> = {};
const map = (cat: PlaceCategory, kinds: string[]) =>
  kinds.forEach((k) => (KIND_TO_CATEGORY[k] = cat));
map('school', [
  'school',
  'kindergarten',
  'childcare',
  'prep_school',
  'language_school',
  'music_school',
  'dancing_school',
]);
map('university', ['university', 'college']);
map('gym', [
  'fitness_centre',
  'sports_centre',
  'sports_hall',
  'dojo',
  'swimming_pool',
  'ice_rink',
  'climbing',
]);
map('office', [
  'office',
  'coworking_space',
  'company',
  'government',
  'research_institute',
  'courthouse',
  'townhall',
  'public_building',
  'embassy',
  'diplomatic',
]);
map('hospital', ['hospital']);
map('clinic', ['clinic', 'doctors', 'dentist', 'healthcare']);
map('station', [
  'station',
  'railway_station',
  'train_station',
  'halt',
  'bus_station',
  'ferry_terminal',
  'subway_station',
]);
map('stadium', ['stadium', 'arena']);
map('park', [
  'park',
  'garden',
  'playground',
  'dog_park',
  'recreation_ground',
  'common',
  'village_green',
  'nature_reserve',
]);
map('beach', ['beach']);
map('nightlife', [
  'bar',
  'pub',
  'nightclub',
  'biergarten',
  'karaoke',
  'karaoke_box',
  'music_venue',
  'lounge',
  'hookah_lounge',
  'casino',
  'stripclub',
  'theatre',
  'cinema',
]);
map('cafe', ['cafe', 'coffee', 'ice_cream', 'internet_cafe', 'bubble_tea']);
map('restaurant', ['restaurant', 'food_court', 'bbq']);
map('fastfood', ['fast_food']);
/**
 * POI kinds a delivery van can load at (SPEC §4.1 Service). Plain `wholesale`
 * is left out: in OSM it is mostly furniture, clothing and other non-food trade.
 */
const SUPPLIER_KINDS: Record<string, Supplier['kind']> = {
  cash_and_carry: 'wholesale',
  supermarket: 'supermarket',
};
const MAX_SUPPLIERS = 400;

const SHOP_KINDS = [
  'supermarket',
  'mall',
  'department_store',
  'marketplace',
  'clothes',
  'shoes',
  'gift',
  'jewelry',
  'books',
  'electronics',
  'mobile_phone',
  'pharmacy',
  'chemist',
  'cosmetics',
  'beauty',
  'hairdresser',
  'bakery',
  'pastry',
  'deli',
  'butcher',
  'greengrocer',
  'grocery',
  'confectionery',
  'chocolate',
  'alcohol',
  'wine',
  'beverages',
  'tea',
  'furniture',
  'hardware',
  'doityourself',
  'houseware',
  'florist',
  'optician',
  'perfumery',
  'stationery',
  'toys',
  'sports',
  'outdoor',
  'bicycle',
  'variety_store',
  'second_hand',
  'charity',
  'boutique',
  'fashion_accessories',
  'bag',
  'watches',
  'computer',
  'video_games',
  'music',
  'art',
  'antiques',
  'gallery',
  'pet',
  'tobacco',
  'e-cigarette',
  'cannabis',
  'dry_cleaning',
  'laundry',
  'massage',
  'nail_salon',
  'tattoo',
  'travel_agency',
  'copyshop',
  'photo',
  'camera',
  'fabric',
  'craft',
  'interior_decoration',
  'kitchen',
  'lighting',
  'bed',
  'health_food',
  'nutrition_supplements',
  'seafood',
  'cheese',
  'frozen_food',
  'spices',
  'garden_centre',
  'shop',
  'retail',
  'general_store',
  'discount',
  'hifi',
  'appliance',
  'paint',
  'baby_goods',
  'games',
  'anime',
  'manga',
  'hobby',
  'medical_supply',
  'herbalist',
  'bank',
  'post_office',
];
map('shopping', SHOP_KINDS);
map('hotel', ['hotel', 'hostel', 'motel', 'guest_house', 'apartment', 'resort']);
map('airport', ['aerodrome', 'airport', 'terminal']);
map('convention', ['conference_centre', 'exhibition_centre', 'events_venue', 'convention_centre']);
map('religious', ['place_of_worship', 'church', 'mosque', 'temple', 'shrine', 'synagogue']);
map('competitor', ['convenience', 'vending_machine', 'kiosk', 'newsagent', 'general']);

/** Kinds that only count when named (unnamed ones are mostly tiny/private). */
const NAMED_ONLY = new Set([
  'garden',
  'playground',
  'swimming_pool',
  'apartment',
  'terminal',
  'aerodrome',
  'airport',
]);

export function categorize(kind: string, name: string | null): PlaceCategory | null {
  const cat = KIND_TO_CATEGORY[kind];
  if (!cat) return null;
  if (NAMED_ONLY.has(kind) && !name) return null;
  if (cat === 'airport' && name && /heli(port|pad)|seaplane|water ?aerodrome/i.test(name))
    return null;
  return cat;
}

// ---------------------------------------------------------------------------
// Landuse classes used for the building estimate.
// ---------------------------------------------------------------------------
type LanduseClass = 'residential' | 'commercial' | 'nonresidential';
const LANDUSE_CLASS: Record<string, LanduseClass> = {
  residential: 'residential',
  commercial: 'commercial',
  retail: 'commercial',
  industrial: 'nonresidential',
  railway: 'nonresidential',
  school: 'nonresidential',
  university: 'nonresidential',
  college: 'nonresidential',
  hospital: 'nonresidential',
  military: 'nonresidential',
  aerodrome: 'nonresidential',
  cemetery: 'nonresidential',
  park: 'nonresidential',
  pitch: 'nonresidential',
  stadium: 'nonresidential',
  zoo: 'nonresidential',
  theme_park: 'nonresidential',
  platform: 'nonresidential',
  pier: 'nonresidential',
  kindergarten: 'nonresidential',
  religious: 'nonresidential',
  garages: 'nonresidential',
  parking: 'nonresidential',
};
/** When polygons overlap, the more specific class wins. */
const LANDUSE_PRIORITY: Record<LanduseClass, number> = {
  nonresidential: 3,
  commercial: 2,
  residential: 1,
};

/**
 * Split a building's gross floor area into residential / office shares.
 * Protomaps v4 buildings carry no `building=*` type, so this uses landuse
 * where mapped and building height otherwise (tall towers skew to offices).
 */
export function estimate(
  heightM: number | null,
  landuse: LanduseClass | null,
): { res: number; office: number } {
  if (landuse === 'residential') return { res: 0.9, office: 0 };
  if (landuse === 'commercial') return { res: 0.15, office: 0.6 };
  if (landuse === 'nonresidential') return { res: 0, office: 0 };
  const h = heightM ?? DEFAULT_HEIGHT_M;
  if (h < 25) return { res: 0.75, office: 0.1 };
  if (h < 60) return { res: 0.55, office: 0.3 };
  return { res: 0.35, office: 0.55 };
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------
const M_PER_DEG_LAT = 111_320;
function distM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const kx = M_PER_DEG_LAT * Math.cos(((aLat + bLat) / 2) * (Math.PI / 180));
  const dx = (bLng - aLng) * kx;
  const dy = (bLat - aLat) * M_PER_DEG_LAT;
  return Math.sqrt(dx * dx + dy * dy);
}
function boxAround(city: City, halfM: number): [number, number, number, number] {
  const dLat = halfM / M_PER_DEG_LAT;
  const dLng = halfM / (M_PER_DEG_LAT * Math.cos((city.lat * Math.PI) / 180));
  return [city.lng - dLng, city.lat - dLat, city.lng + dLng, city.lat + dLat];
}
const r5 = (v: number) => Math.round(v * 1e5) / 1e5;
const r2 = (v: number) => Math.round(v * 100) / 100;

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------
interface Place {
  id: string;
  name: string | null;
  category: PlaceCategory;
  lat: number;
  lng: number;
  /** 1 for real POIs; fractional for synthetic office floor space. */
  weight: number;
}

interface CellAcc {
  pop: number;
  buildingM2: number;
  places: Place[];
}

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out');
const ASSETS = join(HERE, '..', 'assets', 'cities');

function extract(city: City, file: string): void {
  const [w, s, e, n] = boxAround(city, HALF_SIZE_M + DEMAND_RADIUS_M + 200);
  const bbox = `${w.toFixed(5)},${s.toFixed(5)},${e.toFixed(5)},${n.toFixed(5)}`;
  console.log(`[${city.id}] extract ${bbox} z${Z} from ${PLANET_URL}`);
  execFileSync(
    GO_PMTILES,
    ['extract', PLANET_URL, file, `--bbox=${bbox}`, `--minzoom=${Z}`, `--maxzoom=${Z}`],
    {
      stdio: ['ignore', 'ignore', 'inherit'],
    },
  );
}

function nameOf(props: Record<string, unknown>): string | null {
  const en = props['name:en'];
  const n = props.name;
  const v = typeof en === 'string' && en.trim() ? en : typeof n === 'string' && n.trim() ? n : null;
  return v ? v.trim() : null;
}

export interface CityStats {
  cityId: string;
  cells: number;
  namedPlaces: number;
  placesInPack: number;
  categories: number;
  pop: number;
  popDensityPerKm2: number;
  packBytes: number;
}

async function buildCity(city: City, skipExtract: boolean): Promise<CityStats> {
  mkdirSync(join(OUT, 'extracts'), { recursive: true });
  mkdirSync(ASSETS, { recursive: true });
  const file = join(OUT, 'extracts', `${city.id}.pmtiles`);
  if (!skipExtract || !existsSync(file)) extract(city, file);

  const { pm, close } = await openArchive(file);
  const header = await pm.getHeader();
  const places: Place[] = [];
  const suppliers: Supplier[] = [];
  const buildings: { lat: number; lng: number; pop: number; officeM2: number; m2: number }[] = [];
  const heights: number[] = [];

  const x0 = lngToTileX(header.minLon, Z);
  const x1 = lngToTileX(header.maxLon, Z);
  const y0 = latToTileY(header.maxLat, Z);
  const y1 = latToTileY(header.minLat, Z);
  for (let tx = x0; tx <= x1; tx++) {
    for (let ty = y0; ty <= y1; ty++) {
      const tile = await readTile(pm, Z, tx, ty);
      if (!tile) continue;

      // --- POIs: points inside this tile's extent only (buffer copies belong to neighbours).
      for (const f of features(tile, 'pois')) {
        if (f.type !== 1) continue;
        const p = f.loadGeometry()[0]?.[0];
        if (!p || p.x < 0 || p.y < 0 || p.x >= f.extent || p.y >= f.extent) continue;
        const kind = String(f.properties.kind ?? '');
        // Vending machines are named after their operator/brand in OSM: keep them
        // as (unnamed) competitors so no brand names reach the game (CLAUDE.md).
        const name = kind === 'vending_machine' ? null : nameOf(f.properties);
        const supplierKind = SUPPLIER_KINDS[kind];
        if (supplierKind && name) {
          const [lng, lat] = tilePointToLngLat(Z, tx, ty, f.extent, p);
          const id = osmIdFromFeatureId(f.id) ?? `osm:z${Z}/${tx}/${ty}/s${suppliers.length}`;
          suppliers.push({ id, name, kind: supplierKind, lat: r5(lat), lng: r5(lng) });
        }
        const category = categorize(kind, name);
        if (!category) continue;
        const [lng, lat] = tilePointToLngLat(Z, tx, ty, f.extent, p);
        const id = osmIdFromFeatureId(f.id) ?? `osm:z${Z}/${tx}/${ty}/${places.length}`;
        places.push({ id, name, category, lat, lng, weight: 1 });
      }

      // --- Landuse polygons (tile space) for building classification.
      const landuse: {
        cls: LanduseClass;
        rings: Pt[][];
        bbox: [number, number, number, number];
      }[] = [];
      for (const f of features(tile, 'landuse')) {
        if (f.type !== 3) continue;
        const cls = LANDUSE_CLASS[String(f.properties.kind ?? '')];
        if (!cls) continue;
        const rings = f.loadGeometry() as Pt[][];
        landuse.push({ cls, rings, bbox: ringsBBox(rings) });
      }

      // --- Buildings: clip to the tile so parts are counted exactly once.
      const mpu = metresPerUnit(Z, ty, tile.layers.buildings?.extent ?? 4096);
      for (const f of features(tile, 'buildings')) {
        if (f.type !== 3 || f.properties.kind !== 'building') continue;
        const rings = (f.loadGeometry() as Pt[][])
          .map((r) => clipRing(r, f.extent))
          .filter((r) => r.length >= 3);
        const { area, cx, cy } = areaAndCentroid(rings);
        if (area <= 0) continue;
        const m2 = area * mpu * mpu;
        const h =
          typeof f.properties.height === 'number' && f.properties.height > 0
            ? f.properties.height
            : null;
        if (h !== null) heights.push(h);
        let cls: LanduseClass | null = null;
        for (const lu of landuse) {
          const [bx0, by0, bx1, by1] = lu.bbox;
          if (cx < bx0 || cx > bx1 || cy < by0 || cy > by1) continue;
          if (!pointInRings({ x: cx, y: cy }, lu.rings)) continue;
          if (!cls || LANDUSE_PRIORITY[lu.cls] > LANDUSE_PRIORITY[cls]) cls = lu.cls;
        }
        const floors = Math.max(1, Math.round((h ?? DEFAULT_HEIGHT_M) / STOREY_M));
        const gfa = m2 * floors;
        const share = estimate(h, cls);
        const [lng, lat] = tilePointToLngLat(Z, tx, ty, f.extent, { x: cx, y: cy });
        buildings.push({
          lat,
          lng,
          m2,
          pop: (gfa * share.res) / M2_PER_RESIDENT,
          officeM2: gfa * share.office,
        });
      }
    }
  }
  await close();

  // --- Synthetic office places from office floor space (Protomaps has few office POIs).
  for (const b of buildings) {
    if (b.officeM2 <= 0) continue;
    places.push({
      id: '',
      name: null,
      category: 'office',
      lat: b.lat,
      lng: b.lng,
      weight: b.officeM2 / OFFICE_M2_PER_PLACE,
    });
  }

  // --- Bucket everything by res-9 cell.
  const acc = new Map<string, CellAcc>();
  const cellOf = (lat: number, lng: number): CellAcc => {
    const h = latLngToCell(lat, lng, H3_RES);
    let c = acc.get(h);
    if (!c) acc.set(h, (c = { pop: 0, buildingM2: 0, places: [] }));
    return c;
  };
  for (const p of places) cellOf(p.lat, p.lng).places.push(p);
  for (const b of buildings) {
    const c = cellOf(b.lat, b.lng);
    c.pop += b.pop;
    c.buildingM2 += b.m2;
  }

  // --- Cells to emit: res-9 cells whose centers fall in the ±HALF_SIZE_M square.
  const [w, s, e, n] = boxAround(city, HALF_SIZE_M);
  const emit = polygonToCells(
    [
      [s, w],
      [s, e],
      [n, e],
      [n, w],
    ],
    H3_RES,
  );

  const buildCells = (cap: number): CellData[] => {
    const cells: CellData[] = [];
    for (const id of emit) {
      const own = acc.get(id);
      const [lat, lng] = cellToLatLng(id);
      const counts: CategoryNumbers = {};
      const raw: Partial<Record<PlaceCategory, number>> = {};
      for (const p of own?.places ?? []) raw[p.category] = (raw[p.category] ?? 0) + p.weight;
      for (const [k, v] of Object.entries(raw) as [PlaceCategory, number][]) {
        const rounded = Math.round(v);
        if (rounded > 0) counts[k] = rounded;
      }
      const pop = Math.round(own?.pop ?? 0);
      const hasSignal = pop > 0 || Object.keys(counts).length > 0 || (own?.buildingM2 ?? 0) > 0;
      if (!hasSignal) continue;

      const nearby: Partial<Record<PlaceCategory, number>> = {};
      let competitors = 0;
      for (const nb of gridDisk(id, 2)) {
        for (const p of acc.get(nb)?.places ?? []) {
          const d = distM(lat, lng, p.lat, p.lng);
          if (d > DEMAND_RADIUS_M) continue;
          nearby[p.category] = (nearby[p.category] ?? 0) + p.weight * distanceDecay(d);
          if (p.category === 'competitor') competitors++;
        }
      }
      const nearbyOut: CategoryNumbers = {};
      let activity = 0;
      for (const [k, v] of Object.entries(nearby) as [PlaceCategory, number][]) {
        if (v >= 0.01) nearbyOut[k] = r2(v);
        if (k !== 'competitor') activity += v;
      }
      activity += pop / RESIDENTS_PER_PLACE;
      const isolation = Math.round((1 / (1 + activity / ISOLATION_K)) * 1000) / 1000;

      // Named places in the cell, closest to the center first, capped per category.
      const perCat = new Map<PlaceCategory, number>();
      const named: NamedPlace[] = [];
      const candidates = (own?.places ?? [])
        .filter((p) => p.name && p.id)
        .map((p) => ({ p, d: distM(lat, lng, p.lat, p.lng) }))
        .sort((a, b) => a.d - b.d || a.p.id.localeCompare(b.p.id));
      for (const { p } of candidates) {
        const k = perCat.get(p.category) ?? 0;
        if (k >= cap) continue;
        perCat.set(p.category, k + 1);
        named.push({
          id: p.id,
          name: p.name!,
          category: p.category,
          lat: r5(p.lat),
          lng: r5(p.lng),
        });
      }

      cells.push({
        id,
        lat: r5(lat),
        lng: r5(lng),
        pop,
        counts,
        nearby: nearbyOut,
        places: named,
        competitors,
        isolation,
      });
    }
    return cells.sort((a, b) => a.id.localeCompare(b.id));
  };

  let cap = MAX_NAMED_PER_CATEGORY;
  let cells = buildCells(cap);
  // Delivery vans load at the nearest wholesaler or supermarket (wholesalers first).
  const packSuppliers = suppliers
    .sort(
      (a, b) =>
        (a.kind === b.kind ? 0 : a.kind === 'wholesale' ? -1 : 1) ||
        distM(city.lat, city.lng, a.lat, a.lng) - distM(city.lat, city.lng, b.lat, b.lng) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, MAX_SUPPLIERS);
  const pack = (): RegionPack => ({
    schemaVersion: 1,
    cityId: city.id,
    name: city.name,
    center: { lat: city.lat, lng: city.lng },
    generatedAt: new Date().toISOString(),
    sources: [
      `Places & buildings: © OpenStreetMap contributors (ODbL 1.0), via Protomaps basemap build ${PLANET_BUILD}`,
      'Population: estimated from OpenStreetMap building footprints and heights (Coinline pipeline v1)',
    ],
    cells,
    suppliers: packSuppliers,
  });
  let gz = gzipSync(JSON.stringify(pack()), { level: 9 });
  while (gz.byteLength > MAX_PACK_BYTES && cap > 1) {
    cap--;
    cells = buildCells(cap);
    gz = gzipSync(JSON.stringify(pack()), { level: 9 });
  }
  writeFileSync(join(ASSETS, `${city.id}.json.gz`), gz);

  // --- Meta for the data API (§6.2 thresholds without downloading the pack).
  const inCells = new Set(cells.map((c) => c.id));
  const namedByCell = new Map<string, { n: number; mask: number }>();
  for (const p of places) {
    if (!p.name || !p.id) continue;
    const h = latLngToCell(p.lat, p.lng, H3_RES);
    if (!inCells.has(h)) continue;
    const v = namedByCell.get(h) ?? { n: 0, mask: 0 };
    v.n++;
    v.mask |= 1 << PLACE_CATEGORIES.indexOf(p.category);
    namedByCell.set(h, v);
  }
  let allMask = 0;
  let namedTotal = 0;
  const metaCells: RegionMeta['cells'] = cells.map((c) => {
    const v = namedByCell.get(c.id) ?? { n: 0, mask: 0 };
    allMask |= v.mask;
    namedTotal += v.n;
    return [c.id, v.n, v.mask, c.pop];
  });
  const categories = PLACE_CATEGORIES.filter((_, i) => allMask & (1 << i)).length;
  const pop = cells.reduce((t, c) => t + c.pop, 0);
  const meta: RegionMeta = {
    schemaVersion: 1,
    cityId: city.id,
    name: city.name,
    generatedAt: new Date().toISOString(),
    totals: { cells: cells.length, namedPlaces: namedTotal, categories, pop },
    cells: metaCells,
  };
  writeFileSync(join(OUT, `${city.id}.meta.json`), JSON.stringify(meta));

  const landKm2 = cells.reduce((t, c) => t + cellArea(c.id, 'km2'), 0) || 1;
  const stats: CityStats = {
    cityId: city.id,
    cells: cells.length,
    namedPlaces: namedTotal,
    placesInPack: cells.reduce((t, c) => t + c.places.length, 0),
    categories,
    pop,
    popDensityPerKm2: Math.round(pop / landKm2),
    packBytes: gz.byteLength,
  };
  const medianH = heights.sort((a, b) => a - b)[heights.length >> 1] ?? 0;
  console.log(
    `[${city.id}] cells=${stats.cells} named=${stats.namedPlaces} inPack=${stats.placesInPack} (cap ${cap}) ` +
      `cats=${categories} pop=${pop} (~${stats.popDensityPerKm2}/km² of kept cells) buildings=${buildings.length} ` +
      `withHeight=${heights.length} medianH=${medianH}m pack=${(gz.byteLength / 1024).toFixed(0)}KB`,
  );
  return stats;
}

// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const skipExtract = args.includes('--skip-extract');
  const ids = args.includes('--all')
    ? FALLBACK_CITIES.map((c) => c.id)
    : (args.filter((a) => !a.startsWith('--')) as CityId[]);
  if (ids.length === 0) {
    console.error('usage: tsx build-city.ts <cityId…> | --all  [--skip-extract]');
    process.exit(1);
  }
  const stats: CityStats[] = [];
  for (const id of ids) {
    const city = FALLBACK_CITIES.find((c) => c.id === id);
    if (!city) throw new Error(`Unknown city id: ${id}`);
    stats.push(await buildCity(city, skipExtract));
  }
  writeFileSync(join(OUT, 'stats.json'), JSON.stringify(stats, null, 2));
  console.table(stats);
}

await main();
