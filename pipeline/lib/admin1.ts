/**
 * State / province of a point (ISO 3166-2, e.g. "US-TX", "VN-HN"), for the
 * expansion ladder (BRANCHES.reach: chapter 3 opens your state or province).
 * Natural Earth admin-1 states and provinces 1:10m (public domain), downloaded
 * once to out/naturalearth/. Pipeline only: the app gets the codes.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_1_states_provinces.geojson';
const FILE = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'out',
  'naturalearth',
  'ne_10m_admin_1_states_provinces.geojson',
);

type Ring = [number, number][];
interface Area {
  code: string;
  polys: Ring[][];
  bbox: [number, number, number, number];
}

let areas: Area[] | null = null;

function load(): Area[] {
  if (areas) return areas;
  if (!existsSync(FILE)) {
    mkdirSync(dirname(FILE), { recursive: true });
    execFileSync('curl', ['-sL', '-o', FILE, URL], { stdio: 'inherit' });
  }
  const geo = JSON.parse(readFileSync(FILE, 'utf8')) as {
    features: {
      properties: Record<string, string | null>;
      geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown } | null;
    }[];
  };
  areas = [];
  for (const f of geo.features) {
    if (!f.geometry) continue;
    const code = String(f.properties.iso_3166_2 ?? '').trim();
    if (!code || code.endsWith('~') || !code.includes('-')) continue;
    const polys = (
      f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
    ) as Ring[][];
    let [w, s, e, n] = [180, 90, -180, -90];
    for (const p of polys)
      for (const [x, y] of p[0]) {
        w = Math.min(w, x);
        e = Math.max(e, x);
        s = Math.min(s, y);
        n = Math.max(n, y);
      }
    areas.push({ code, polys, bbox: [w, s, e, n] });
  }
  return areas;
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

/** ISO 3166-2 code of the state/province containing the point, or '' (none mapped, sea). */
export function stateAt(lat: number, lng: number): string {
  for (const a of load()) {
    const [w, s, e, n] = a.bbox;
    if (lng < w || lng > e || lat < s || lat > n) continue;
    for (const p of a.polys)
      if (inRing(p[0], lng, lat) && !p.slice(1).some((hole) => inRing(hole, lng, lat)))
        return a.code;
  }
  return '';
}
