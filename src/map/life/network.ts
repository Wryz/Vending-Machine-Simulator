import type {
  AsphaltInput,
  AsphaltKind,
  LifeSurfaceInput,
  LngLatBox,
  RoadInput,
  RoadKind,
  WaterInput,
} from './types';

/**
 * Road network for the street-life sim: the rendered road features of the
 * view, projected to local meters (east, north) around an origin, with a
 * segment grid for "what road continues here?" lookups.
 *
 * Rendered features come from vector tiles, so one street arrives as several
 * pieces (split and overlapped at tile edges) and ways often end on another
 * way's interior vertex (T-junctions). Agents therefore don't need a topology:
 * at the end of a piece they look for any other piece passing near the end
 * point and continue on it (see sim.ts).
 */

const M_PER_DEG_LAT = 111_320;
const GRID_M = 30;

export interface Road {
  kind: RoadKind;
  xs: Float64Array;
  ys: Float64Array;
  /** Cumulative length at each vertex. */
  cum: Float64Array;
  length: number;
}

export interface RoadHit {
  road: number;
  /** Distance along the road of the closest point. */
  s: number;
  /** Distance from the query point. */
  d: number;
}

const gridKey = (ix: number, iy: number) => (ix + 32768) * 65536 + (iy + 32768);

export class RoadNetwork {
  readonly lng0: number;
  readonly lat0: number;
  /** Meters per degree of longitude at the origin. */
  readonly kx: number;
  readonly ky = M_PER_DEG_LAT;
  readonly roads: Road[] = [];
  private readonly grid = new Map<number, number[]>();

  constructor(inputs: readonly RoadInput[], origin: readonly [number, number]) {
    this.lng0 = origin[0];
    this.lat0 = origin[1];
    this.kx = M_PER_DEG_LAT * Math.cos((this.lat0 * Math.PI) / 180);
    const seen = new Set<string>();
    for (const r of inputs) {
      const n = r.coords.length;
      if (n < 2) continue;
      // Tiles repeat features; drop exact duplicates.
      const a = r.coords[0];
      const b = r.coords[n - 1];
      const key = `${r.kind}|${n}|${a[0].toFixed(6)},${a[1].toFixed(6)}|${b[0].toFixed(6)},${b[1].toFixed(6)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      this.addRoad(r);
    }
  }

  private addRoad(r: RoadInput) {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const [lng, lat] of r.coords) {
      const x = (lng - this.lng0) * this.kx;
      const y = (lat - this.lat0) * this.ky;
      const k = xs.length;
      // Skip repeated vertices (zero-length segments).
      if (k && Math.abs(xs[k - 1] - x) < 0.05 && Math.abs(ys[k - 1] - y) < 0.05) continue;
      xs.push(x);
      ys.push(y);
    }
    if (xs.length < 2) return;
    const cum = new Float64Array(xs.length);
    for (let i = 1; i < xs.length; i++)
      cum[i] = cum[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);
    const length = cum[xs.length - 1];
    if (length < 6) return;
    const idx = this.roads.length;
    this.roads.push({
      kind: r.kind,
      xs: Float64Array.from(xs),
      ys: Float64Array.from(ys),
      cum,
      length,
    });
    // Index every segment in each grid cell its bounding box touches.
    for (let i = 0; i < xs.length - 1; i++) {
      const x0 = Math.floor(Math.min(xs[i], xs[i + 1]) / GRID_M);
      const x1 = Math.floor(Math.max(xs[i], xs[i + 1]) / GRID_M);
      const y0 = Math.floor(Math.min(ys[i], ys[i + 1]) / GRID_M);
      const y1 = Math.floor(Math.max(ys[i], ys[i + 1]) / GRID_M);
      for (let gx = x0; gx <= x1; gx++)
        for (let gy = y0; gy <= y1; gy++) {
          const k = gridKey(gx, gy);
          let list = this.grid.get(k);
          if (!list) this.grid.set(k, (list = []));
          list.push(idx * 65536 + i);
        }
    }
  }

  toLocal(lng: number, lat: number): [number, number] {
    return [(lng - this.lng0) * this.kx, (lat - this.lat0) * this.ky];
  }

  toLngLatInto(x: number, y: number, out: { lng: number; lat: number }): void {
    out.lng = this.lng0 + x / this.kx;
    out.lat = this.lat0 + y / this.ky;
  }

  /** Local-meter box of a lng/lat box. */
  boxToLocal(b: LngLatBox): { x0: number; y0: number; x1: number; y1: number } {
    const [x0, y0] = this.toLocal(b.west, b.south);
    const [x1, y1] = this.toLocal(b.east, b.north);
    return { x0, y0, x1, y1 };
  }

  /** Index of the segment containing distance `s` (binary search). */
  segmentAt(road: Road, s: number): number {
    const c = road.cum;
    let lo = 0;
    let hi = c.length - 2;
    if (s <= 0) return 0;
    if (s >= road.length) return hi;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (c[mid] <= s) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  /** Centerline point at distance `s` (clamped to the road). */
  pointAt(road: Road, s: number, out: { x: number; y: number }): void {
    const i = this.segmentAt(road, s);
    const segLen = road.cum[i + 1] - road.cum[i];
    const t = segLen > 0 ? Math.min(1, Math.max(0, (s - road.cum[i]) / segLen)) : 0;
    out.x = road.xs[i] + (road.xs[i + 1] - road.xs[i]) * t;
    out.y = road.ys[i] + (road.ys[i + 1] - road.ys[i]) * t;
  }

  /**
   * Smoothed unit tangent (road coordinate order) at `s`: the chord over
   * ±`halfSpan` meters, so headings and sidewalk offsets turn smoothly through
   * polyline vertices instead of snapping.
   */
  tangentAt(road: Road, s: number, halfSpan: number, out: { x: number; y: number }): void {
    const a = Math.max(0, s - halfSpan);
    const b = Math.min(road.length, s + halfSpan);
    this.pointAt(road, a, out);
    const ax = out.x;
    const ay = out.y;
    this.pointAt(road, b, out);
    let dx = out.x - ax;
    let dy = out.y - ay;
    let len = Math.hypot(dx, dy);
    if (len < 1e-6) {
      const i = this.segmentAt(road, s);
      dx = road.xs[i + 1] - road.xs[i];
      dy = road.ys[i + 1] - road.ys[i];
      len = Math.hypot(dx, dy) || 1;
    }
    out.x = dx / len;
    out.y = dy / len;
  }

  /** Every road passing within `radius` of (x, y), closest point per road. */
  near(x: number, y: number, radius: number, out: RoadHit[] = []): RoadHit[] {
    out.length = 0;
    const gx0 = Math.floor((x - radius) / GRID_M);
    const gx1 = Math.floor((x + radius) / GRID_M);
    const gy0 = Math.floor((y - radius) / GRID_M);
    const gy1 = Math.floor((y + radius) / GRID_M);
    for (let gx = gx0; gx <= gx1; gx++)
      for (let gy = gy0; gy <= gy1; gy++) {
        const list = this.grid.get(gridKey(gx, gy));
        if (!list) continue;
        for (const packed of list) {
          const ri = Math.floor(packed / 65536);
          const si = packed % 65536;
          const r = this.roads[ri];
          const ax = r.xs[si];
          const ay = r.ys[si];
          const dx = r.xs[si + 1] - ax;
          const dy = r.ys[si + 1] - ay;
          const l2 = dx * dx + dy * dy;
          const t = l2 > 0 ? Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
          const d = Math.hypot(ax + dx * t - x, ay + dy * t - y);
          if (d > radius) continue;
          const s = r.cum[si] + Math.sqrt(l2) * t;
          const prev = out.find((h) => h.road === ri);
          if (prev) {
            if (d < prev.d) {
              prev.d = d;
              prev.s = s;
            }
          } else out.push({ road: ri, s, d });
        }
      }
    return out;
  }

  /** Closest point of one road to (x, y): distance along it and from it. */
  project(ri: number, x: number, y: number, out: RoadHit): RoadHit {
    const r = this.roads[ri];
    out.road = ri;
    out.d = Infinity;
    out.s = 0;
    for (let i = 0; i < r.xs.length - 1; i++) {
      const ax = r.xs[i];
      const ay = r.ys[i];
      const dx = r.xs[i + 1] - ax;
      const dy = r.ys[i + 1] - ay;
      const l2 = dx * dx + dy * dy;
      const t = l2 > 0 ? Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
      const d = Math.hypot(ax + dx * t - x, ay + dy * t - y);
      if (d < out.d) {
        out.d = d;
        out.s = r.cum[i] + Math.sqrt(l2) * t;
      }
    }
    return out;
  }

  /** Road length per kind inside a local box and within `radius` of (cx, cy). */
  lengthWithin(
    box: { x0: number; y0: number; x1: number; y1: number },
    cx: number,
    cy: number,
    radius: number,
  ): Record<RoadKind, number> {
    const out: Record<RoadKind, number> = { major: 0, minor: 0, path: 0, pedestrian: 0 };
    const r2 = radius * radius;
    for (const r of this.roads) {
      for (let i = 0; i < r.xs.length - 1; i++) {
        const mx = (r.xs[i] + r.xs[i + 1]) / 2;
        const my = (r.ys[i] + r.ys[i + 1]) / 2;
        if (mx < box.x0 || mx > box.x1 || my < box.y0 || my > box.y1) continue;
        if ((mx - cx) ** 2 + (my - cy) ** 2 > r2) continue;
        out[r.kind] += r.cum[i + 1] - r.cum[i];
      }
    }
    return out;
  }
}

/**
 * Rendered map layers street life reads (ids shared by both tile schemas,
 * see src/map/style.ts): streets, paths and water.
 */
export const LIFE_QUERY_LAYERS = ['roads-minor', 'roads-major', 'paths', 'water'] as const;

/**
 * Rendered features of LIFE_QUERY_LAYERS -> sim inputs: the ways people walk,
 * plus the drawn asphalt and water they keep off.
 */
export function lifeInputsFromFeatures(features: readonly GeoJSON.Feature[]): {
  roads: RoadInput[];
  surface: LifeSurfaceInput;
} {
  return {
    roads: roadsFromFeatures(features),
    surface: { asphalt: asphaltFromFeatures(features), water: waterFromFeatures(features) },
  };
}

/** Each line of a (Multi)LineString feature. */
function linesOf(g: GeoJSON.Geometry | null): [number, number][][] {
  if (!g) return [];
  if (g.type === 'LineString') return [g.coordinates as [number, number][]];
  if (g.type === 'MultiLineString') return g.coordinates as [number, number][][];
  return [];
}

/**
 * Basemap road features (OpenMapTiles or Protomaps schema, as returned by
 * `queryRenderedFeatures`) -> sim roads: streets with sidewalks, paths and
 * pedestrian streets. Tunnels are already filtered out by the layers; bridges
 * are left out (their sidewalks would hang over water or traffic).
 */
export function roadsFromFeatures(features: readonly GeoJSON.Feature[]): RoadInput[] {
  const out: RoadInput[] = [];
  for (const f of features) {
    const p = (f.properties ?? {}) as Record<string, unknown>;
    const kind = roadKindOf(p);
    if (!kind) continue;
    for (const coords of linesOf(f.geometry)) out.push({ coords, kind });
  }
  return out;
}

/** Every drawn roadway (walked or not, bridges included): asphalt to keep off. */
export function asphaltFromFeatures(features: readonly GeoJSON.Feature[]): AsphaltInput[] {
  const out: AsphaltInput[] = [];
  for (const f of features) {
    const kind = asphaltKindOf((f.properties ?? {}) as Record<string, unknown>);
    if (!kind) continue;
    for (const coords of linesOf(f.geometry)) out.push({ coords, kind });
  }
  return out;
}

/** Water polygons of the rendered `water` fill. */
export function waterFromFeatures(features: readonly GeoJSON.Feature[]): WaterInput[] {
  const out: WaterInput[] = [];
  for (const f of features) {
    const g = f.geometry;
    if (!g) continue;
    if (g.type === 'Polygon') out.push({ rings: g.coordinates as [number, number][][] });
    else if (g.type === 'MultiPolygon')
      for (const poly of g.coordinates) out.push({ rings: poly as [number, number][][] });
  }
  return out;
}

const OMT_MAJOR = new Set(['primary', 'secondary', 'tertiary']);
const OMT_ASPHALT_MAJOR = new Set(['motorway', 'trunk', 'primary', 'secondary', 'tertiary']);
const OMT_ASPHALT_MINOR = new Set(['minor', 'service', 'track', 'raceway']);

const isBridge = (p: Record<string, unknown>) =>
  p.brunnel === 'bridge' || p.is_bridge === true || p.is_bridge === 1 || p.is_bridge === 'true';

/**
 * Walk kind of a road feature, or null where nobody walks (highways, service
 * roads, rail, bridges).
 */
export function roadKindOf(p: Record<string, unknown>): RoadKind | null {
  if (isBridge(p)) return null;
  const cls = typeof p.class === 'string' ? p.class : null;
  if (cls) {
    // OpenMapTiles
    if (OMT_MAJOR.has(cls)) return 'major';
    if (cls === 'minor') return 'minor';
    if (cls === 'pedestrian') return 'pedestrian';
    if (cls === 'path') return p.subclass === 'pedestrian' ? 'pedestrian' : 'path';
    return null;
  }
  const kind = typeof p.kind === 'string' ? p.kind : null; // Protomaps v4
  if (kind === 'major_road') return 'major';
  if (kind === 'minor_road' && p.kind_detail !== 'service') return 'minor';
  if (kind === 'path') return p.kind_detail === 'pedestrian' ? 'pedestrian' : 'path';
  return null;
}

/** Drawn roadway class of a feature (as styled by roads-minor / roads-major), or null. */
export function asphaltKindOf(p: Record<string, unknown>): AsphaltKind | null {
  const cls = typeof p.class === 'string' ? p.class : null;
  if (cls) {
    if (OMT_ASPHALT_MAJOR.has(cls)) return 'major';
    if (OMT_ASPHALT_MINOR.has(cls)) return 'minor';
    return null;
  }
  const kind = typeof p.kind === 'string' ? p.kind : null;
  if (kind === 'major_road' || kind === 'highway') return 'major';
  if (kind === 'minor_road' || kind === 'other') return 'minor';
  return null;
}
