import { waterFromFeatures } from './life/network';
import type { WaterInput } from './life/types';
import type { TileSchema } from './style';

/**
 * Environment probe (pure; no React Native): how far the view center is from
 * the places that make ambience (water for waves, green for birds and
 * crickets), from the polygons the map has drawn. CityMap runs it once the
 * camera settles; the soundscape mixer turns distances into volumes.
 *
 * Works on tile-clipped polygons: a point inside any piece is "on" it (0 m),
 * otherwise the distance to the nearest piece is the distance to the real
 * shore (a clip edge lies inside the area, never closer than its boundary).
 */

/** Polygons as [lng, lat] rings: outer ring first, then holes. */
export type PolygonInput = WaterInput;

const M_PER_DEG_LAT = 110_574;
const M_PER_DEG_LNG_EQ = 111_320;

/**
 * Distance in meters from `center` ([lng, lat]) to the nearest polygon:
 * 0 inside one, null when none is within `rangeM`.
 */
export function distanceToPolygonsM(
  center: readonly [number, number],
  polys: readonly PolygonInput[],
  rangeM: number,
): number | null {
  const [lng0, lat0] = center;
  if (!Number.isFinite(lng0) || !Number.isFinite(lat0) || !(rangeM > 0)) return null;
  const kx = M_PER_DEG_LNG_EQ * Math.cos((lat0 * Math.PI) / 180);
  const ky = M_PER_DEG_LAT;
  // Range as a degree box, to skip far polygons and vertices cheaply.
  const dLng = rangeM / Math.max(1, kx);
  const dLat = rangeM / ky;
  let best = Infinity;
  for (const poly of polys) {
    if (!boxNear(poly, lng0, lat0, dLng, dLat)) continue;
    let inside = false;
    for (const ring of poly.rings) {
      const n = ring.length;
      if (n < 2) continue;
      let [px, py] = local(ring[n - 1], lng0, lat0, kx, ky);
      for (let i = 0; i < n; i++) {
        const [x, y] = local(ring[i], lng0, lat0, kx, ky);
        // Even-odd ray cast from the origin toward +x (holes cancel out).
        if (py > 0 !== y > 0 && 0 < px + ((0 - py) / (y - py)) * (x - px)) inside = !inside;
        const d = segDist(px, py, x, y);
        if (d < best) best = d;
        px = x;
        py = y;
      }
    }
    if (inside) return 0;
  }
  return best <= rangeM ? best : null;
}

function local(
  p: readonly [number, number],
  lng0: number,
  lat0: number,
  kx: number,
  ky: number,
): [number, number] {
  return [(p[0] - lng0) * kx, (p[1] - lat0) * ky];
}

/** Distance from the origin to segment (ax, ay)-(bx, by). */
function segDist(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 > 0 ? Math.min(1, Math.max(0, -(ax * dx + ay * dy) / len2)) : 0;
  return Math.hypot(ax + t * dx, ay + t * dy);
}

/** Is the polygon's bounding box within the range box around the center? */
function boxNear(poly: PolygonInput, lng0: number, lat0: number, dLng: number, dLat: number) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const ring of poly.rings)
    for (const [x, y] of ring) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  return x0 <= lng0 + dLng && x1 >= lng0 - dLng && y0 <= lat0 + dLat && y1 >= lat0 - dLat;
}

export interface EnvProbeResult {
  /** Meters to the nearest water (0 = over it), null = none within range. */
  waterDistM: number | null;
  /** Meters to the nearest park or green (0 = in it), null = none within range. */
  parkDistM: number | null;
}

/** Distances from the view center to the water and green drawn around it. */
export function probeEnvironment(
  center: readonly [number, number],
  water: readonly PolygonInput[],
  parks: readonly PolygonInput[],
  rangeM: number,
): EnvProbeResult {
  return {
    waterDistM: distanceToPolygonsM(center, water, rangeM),
    parkDistM: distanceToPolygonsM(center, parks, rangeM),
  };
}

/**
 * Same, from the map's rendered features (`queryRenderedFeatures` on
 * WATER_LAYER_ID and PARK_LAYER_IDS). Polygons are read like street life's
 * water (life/network.ts); anything else (points, lines) is ignored.
 */
export function probeFromFeatures(
  center: readonly [number, number],
  waterFeatures: readonly GeoJSON.Feature[],
  parkFeatures: readonly GeoJSON.Feature[],
  rangeM: number,
): EnvProbeResult {
  return probeEnvironment(
    center,
    waterFromFeatures(waterFeatures),
    waterFromFeatures(parkFeatures),
    rangeM,
  );
}

/** The rendered water fill (both tile schemas, see style.ts). */
export const WATER_LAYER_ID = 'water';

/** Rendered park/green fills per tile schema (see style.ts). */
export const PARK_LAYER_IDS: Record<TileSchema, readonly string[]> = {
  protomaps: ['landuse-park'],
  openmaptiles: ['landuse-park', 'landuse-park-2', 'parks'],
};
