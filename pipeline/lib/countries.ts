/**
 * Country of a point, for the city picker's flags: Natural Earth admin-0
 * countries 1:50m (public domain, https://www.naturalearthdata.com),
 * downloaded to out/naturalearth/ by list-regions.ts. Pipeline only: nothing
 * from it ships in the app except the two-letter codes.
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_admin_0_countries.geojson';
const FILE = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'out',
  'naturalearth',
  'ne_50m_admin_0_countries.geojson',
);

type Ring = [number, number][];
interface Country {
  cc: string;
  polys: Ring[][];
  bbox: [number, number, number, number];
}

let countries: Country[] | null = null;

function load(): Country[] {
  if (countries) return countries;
  if (!existsSync(FILE)) {
    mkdirSync(dirname(FILE), { recursive: true });
    execFileSync('curl', ['-sL', '-o', FILE, URL], { stdio: 'inherit' });
  }
  const geo = JSON.parse(readFileSync(FILE, 'utf8')) as {
    features: {
      properties: Record<string, string>;
      geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown };
    }[];
  };
  countries = geo.features.map((f) => {
    // ISO_A2 is "-99" for a few (France, Norway, Kosovo…); the _EH column fills them in.
    const raw = f.properties.ISO_A2_EH !== '-99' ? f.properties.ISO_A2_EH : f.properties.ISO_A2;
    const polys = (
      f.geometry.type === 'Polygon'
        ? [f.geometry.coordinates as Ring[]]
        : (f.geometry.coordinates as Ring[][])
    ) as Ring[][];
    let w = 180;
    let s = 90;
    let e = -180;
    let n = -90;
    for (const p of polys)
      for (const [x, y] of p[0]) {
        w = Math.min(w, x);
        e = Math.max(e, x);
        s = Math.min(s, y);
        n = Math.max(n, y);
      }
    return { cc: raw && raw !== '-99' ? raw.toUpperCase() : '', polys, bbox: [w, s, e, n] };
  });
  return countries;
}

function inRing(ring: Ring, x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** ISO 3166-1 alpha-2 code of the country containing the point, or '' (sea, disputed). */
export function countryAt(lat: number, lng: number): string {
  for (const c of load()) {
    const [w, s, e, n] = c.bbox;
    if (lng < w || lng > e || lat < s || lat > n) continue;
    for (const poly of c.polys)
      if (inRing(poly[0], lng, lat) && !poly.slice(1).some((h) => inRing(h, lng, lat))) return c.cc;
  }
  return '';
}

/** Country of a point, or of the closest point nudged around it (coastal cities). */
export function countryNear(lat: number, lng: number): string {
  const direct = countryAt(lat, lng);
  if (direct) return direct;
  for (const d of [0.05, 0.15, 0.3])
    for (const [a, b] of [
      [d, 0],
      [-d, 0],
      [0, d],
      [0, -d],
    ]) {
      const cc = countryAt(lat + a, lng + b);
      if (cc) return cc;
    }
  return '';
}
