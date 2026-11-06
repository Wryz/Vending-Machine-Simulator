import { DISTRICT_FILES } from '../../assets/cities/districts';

/**
 * District / municipality under a point (borough, ward, arrondissement,
 * community area, LGA), from bundled OSM boundary polygons built by
 * `pipeline/districts/build-districts.ts`. Pure: no React or I/O beyond the
 * bundled JSON, parsed once per city on first use.
 */

/** One district as stored (see pipeline/districts/README.md). */
export interface DistrictRecord {
  /** OSM admin_level. Where districts nest, the higher (finer) level wins. */
  l: number;
  /** Names: `""` = local `name`; language codes (en, ja, zh, pt…) when different. */
  n: Record<string, string>;
  /** Polygons, each [outer, ...holes]; rings are 1e-5° integers, delta-encoded [x, y, dx, dy, …]. */
  p: number[][][];
}

export interface DistrictFile {
  v: number;
  city: string;
  /** Language of the local `name` (`n[""]`); a translation equal to it isn't stored. */
  lang?: string;
  source?: string;
  d: DistrictRecord[];
}

interface District {
  level: number;
  names: Record<string, string>;
  /** [minLng, minLat, maxLng, maxLat] in degrees. */
  bbox: [number, number, number, number];
  /** Rings as flat [lng, lat, lng, lat, …] degrees; polygons as [outer, ...holes]. */
  polys: Float64Array[][];
  /** Rough area (deg²), to prefer the smaller of two overlapping districts. */
  area: number;
}

export interface DistrictIndex {
  districts: District[];
  /** Language of the local names. */
  lang: string;
}

function decodeRing(enc: readonly number[]): Float64Array {
  const out = new Float64Array(enc.length);
  let x = 0;
  let y = 0;
  for (let i = 0; i + 1 < enc.length; i += 2) {
    x += enc[i];
    y += enc[i + 1];
    out[i] = x / 1e5;
    out[i + 1] = y / 1e5;
  }
  return out;
}

function ringArea(r: Float64Array): number {
  let s = 0;
  const n = r.length;
  for (let i = 0, j = n - 2; i < n; j = i, i += 2) s += r[j] * r[i + 1] - r[i] * r[j + 1];
  return Math.abs(s / 2);
}

/** Builds a lookup index from a district file. */
export function buildDistrictIndex(file: DistrictFile): DistrictIndex {
  const districts: District[] = [];
  for (const rec of file.d) {
    const polys = rec.p.map((poly) => poly.map(decodeRing));
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
    let area = 0;
    for (const poly of polys) {
      const outer = poly[0];
      if (!outer) continue;
      for (let i = 0; i < outer.length; i += 2) {
        x0 = Math.min(x0, outer[i]);
        x1 = Math.max(x1, outer[i]);
        y0 = Math.min(y0, outer[i + 1]);
        y1 = Math.max(y1, outer[i + 1]);
      }
      area += ringArea(outer) - poly.slice(1).reduce((s, h) => s + ringArea(h), 0);
    }
    if (!polys.length || x0 > x1) continue;
    districts.push({ level: rec.l, names: rec.n, bbox: [x0, y0, x1, y1], polys, area });
  }
  return { districts, lang: langKey(file.lang) ?? 'en' };
}

/** Even-odd ray cast over a flat, implicitly closed ring. */
function inRing(x: number, y: number, r: Float64Array): boolean {
  let inside = false;
  const n = r.length;
  for (let i = 0, j = n - 2; i < n; j = i, i += 2) {
    const yi = r[i + 1];
    const yj = r[j + 1];
    if (yi > y !== yj > y && x < ((r[j] - r[i]) * (y - yi)) / (yj - yi) + r[i]) inside = !inside;
  }
  return inside;
}

function contains(d: District, x: number, y: number): boolean {
  const [x0, y0, x1, y1] = d.bbox;
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  for (const poly of d.polys) {
    if (!inRing(x, y, poly[0])) continue;
    let inHole = false;
    for (let h = 1; h < poly.length && !inHole; h++) inHole = inRing(x, y, poly[h]);
    if (!inHole) return true;
  }
  return false;
}

/** "zh-Hans" → "zh", "pt-BR" → "pt", "EN" → "en". */
function langKey(lang: string | undefined): string | undefined {
  return lang ? lang.split(/[-_]/)[0].toLowerCase() : undefined;
}

/**
 * Display name: requested language, else English, else the local name.
 * `localLang` is the language of the local name, used when it has no separate
 * translation (Tokyo's `name` is already Japanese).
 */
export function districtName(
  names: Record<string, string>,
  lang?: string,
  localLang = 'en',
): string {
  const k = langKey(lang);
  if (k && names[k]) return names[k];
  if (k === localLang) return names[''];
  return names.en || names[''];
}

/**
 * The finest (then smallest) district containing the point, or null. With
 * `exclude`, a district any of whose names equals it counts as none (the game
 * city itself, e.g. Los Angeles, in whatever language).
 */
export function lookUpDistrict(
  index: DistrictIndex,
  lng: number,
  lat: number,
  lang?: string,
  exclude?: string,
): string | null {
  let best: District | null = null;
  for (const d of index.districts) {
    if (best && (d.level < best.level || (d.level === best.level && d.area >= best.area))) continue;
    if (contains(d, lng, lat)) best = d;
  }
  if (!best || (exclude && Object.values(best.names).includes(exclude))) return null;
  return districtName(best.names, lang, index.lang);
}

const cache = new Map<string, DistrictIndex | null>();

/** The city's district index, parsed once; null when the city has no district data. */
export function districtIndexFor(cityId: string): DistrictIndex | null {
  let index = cache.get(cityId);
  if (index === undefined) {
    const load = DISTRICT_FILES[cityId];
    index = load ? buildDistrictIndex(load() as DistrictFile) : null;
    cache.set(cityId, index);
  }
  return index;
}

/** Whether a city ships district boundaries. */
export function hasDistricts(cityId: string): boolean {
  return cityId in DISTRICT_FILES;
}

/**
 * Name of the district / municipality at a point in a fallback city, in `lang`
 * when OSM has it (else English, else the local name). Null outside the
 * bundled polygons, for a city without district data, or when the district is
 * `exclude` (see lookUpDistrict).
 */
export function districtAt(
  cityId: string,
  lng: number,
  lat: number,
  lang?: string,
  exclude?: string,
): string | null {
  const index = districtIndexFor(cityId);
  return index ? lookUpDistrict(index, lng, lat, lang, exclude) : null;
}
