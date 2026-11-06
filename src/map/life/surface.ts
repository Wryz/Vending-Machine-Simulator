import { MAP_LIFE } from '@/config/mapLife';

import { RoadNetwork, type RoadHit } from './network';
import type { AsphaltInput, WaterInput } from './types';

/**
 * What people keep off (pure): water polygons and drawn asphalt, in the local
 * meters of a RoadNetwork. Queried once per sample of a walking line (see
 * StreetLife), so it is indexed rather than fast per call.
 */

const BAND_M = 25;
const SU = MAP_LIFE.surface;

interface WaterPoly {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Edges as x0, y0, x1, y1 quads (all rings). */
  edges: Float64Array;
  /** Horizontal bands -> indices of the edges spanning them. */
  bands: Map<number, number[]>;
}

/** Point-in-water for tile-clipped water polygons (each tested on its own). */
export class WaterIndex {
  private readonly polys: WaterPoly[] = [];

  constructor(water: readonly WaterInput[], toLocal: (lng: number, lat: number) => [number, number]) {
    for (const w of water) {
      const e: number[] = [];
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (const ring of w.rings) {
        const n = ring.length;
        if (n < 3) continue;
        let [px, py] = toLocal(ring[n - 1][0], ring[n - 1][1]);
        for (let i = 0; i < n; i++) {
          const [x, y] = toLocal(ring[i][0], ring[i][1]);
          if (x !== px || y !== py) e.push(px, py, x, y);
          px = x;
          py = y;
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
      if (!e.length) continue;
      const edges = Float64Array.from(e);
      const bands = new Map<number, number[]>();
      for (let k = 0; k < edges.length; k += 4) {
        const b0 = Math.floor(Math.min(edges[k + 1], edges[k + 3]) / BAND_M);
        const b1 = Math.floor(Math.max(edges[k + 1], edges[k + 3]) / BAND_M);
        for (let b = b0; b <= b1; b++) {
          let list = bands.get(b);
          if (!list) bands.set(b, (list = []));
          list.push(k);
        }
      }
      this.polys.push({ x0, y0, x1, y1, edges, bands });
    }
  }

  get size(): number {
    return this.polys.length;
  }

  contains(x: number, y: number): boolean {
    for (const p of this.polys) {
      if (x < p.x0 || x > p.x1 || y < p.y0 || y > p.y1) continue;
      const list = p.bands.get(Math.floor(y / BAND_M));
      if (!list) continue;
      // Even-odd ray cast toward +x (holes cancel out).
      let inside = false;
      const e = p.edges;
      for (const k of list) {
        const ay = e[k + 1];
        const by = e[k + 3];
        if (ay > y === by > y) continue;
        const ax = e[k];
        const bx = e[k + 2];
        if (x < ax + ((y - ay) / (by - ay)) * (bx - ax)) inside = !inside;
      }
      if (inside) return true;
    }
    return false;
  }
}

/** Water + drawn asphalt around the walkways. */
export class Surface {
  readonly water: WaterIndex;
  readonly asphalt: RoadNetwork;
  private readonly searchM: number;
  private readonly hits: RoadHit[] = [];
  private readonly t: { x: number; y: number } = { x: 0, y: 0 };

  constructor(
    asphalt: readonly AsphaltInput[],
    water: readonly WaterInput[],
    origin: readonly [number, number],
  ) {
    this.asphalt = new RoadNetwork(asphalt, origin);
    this.water = new WaterIndex(water, (lng, lat) => this.asphalt.toLocal(lng, lat));
    this.searchM = Math.max(SU.asphaltHalfM.major, SU.asphaltHalfM.minor) + SU.asphaltClearM;
  }

  private halfOf(kind: string): number {
    return kind === 'major' ? SU.asphaltHalfM.major : SU.asphaltHalfM.minor;
  }

  /**
   * Is (x, y) on asphalt? With a walking direction (tx, ty), only roads running
   * alongside count (a street crossed at a corner is a crosswalk).
   */
  onAsphalt(x: number, y: number, tx?: number, ty?: number): boolean {
    const net = this.asphalt;
    const hits = net.near(x, y, this.searchM, this.hits);
    for (const h of hits) {
      const r = net.roads[h.road];
      if (h.d >= this.halfOf(r.kind) + SU.asphaltClearM) continue;
      if (tx === undefined || ty === undefined) return true;
      net.tangentAt(r, h.s, 2, this.t);
      if (Math.abs(this.t.x * tx + this.t.y * ty) >= SU.parallelCos) return true;
    }
    return false;
  }

  /** Nobody may stand here: water or asphalt (any direction). */
  blockedPoint(x: number, y: number): boolean {
    return this.water.contains(x, y) || this.onAsphalt(x, y);
  }

  /** A walker heading along (tx, ty) may not be here: water or asphalt alongside. */
  blockedWalk(x: number, y: number, tx: number, ty: number): boolean {
    return this.water.contains(x, y) || this.onAsphalt(x, y, tx, ty);
  }
}
