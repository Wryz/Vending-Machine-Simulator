/**
 * Road network for delivery vans: drivable streets from the Protomaps `roads`
 * layer, as a compact polyline file (`RoadNet`, src/data/types.ts) that the app
 * turns into a routing graph. Vertices are snapped to a global grid
 * (2^Z × RES per axis, about 2 m), so a street cut at a tile edge joins up again
 * and lines that share a vertex share a node.
 */
import type { VectorTileFeature } from '@mapbox/vector-tile';

import type { RoadNet } from '../../src/data/types';
import type { Pt } from './mvt';

export const ROAD_Z = 15;
export const ROAD_RES = 512;
/** Douglas–Peucker tolerance, grid units (~3–4 m). */
const SIMPLIFY = 1.6;

/** Road classes: 0 highway, 1 major road, 2 minor street. */
export function roadClass(props: Record<string, unknown>): 0 | 1 | 2 | null {
  const kind = String(props.kind ?? '');
  const detail = String(props.kind_detail ?? '');
  if (kind === 'highway') return 0;
  if (kind === 'major_road') return 1;
  if (kind === 'minor_road') return detail === 'service' ? null : 2;
  if (kind === 'other' && detail === 'living_street') return 2;
  return null;
}

type Q = [number, number];

export class RoadCollector {
  private lines: { cls: number; pts: Q[] }[] = [];

  /** Add one road feature from tile (tx, ty). */
  add(f: VectorTileFeature, tx: number, ty: number): void {
    const cls = roadClass(f.properties);
    if (cls === null || f.type !== 2) return;
    const e = f.extent;
    const q = (p: Pt): Q => [
      Math.round((tx + p.x / e) * ROAD_RES),
      Math.round((ty + p.y / e) * ROAD_RES),
    ];
    for (const line of f.loadGeometry() as Pt[][]) {
      let cur: Q[] = [];
      for (let i = 1; i < line.length; i++) {
        const seg = clipSegment(line[i - 1], line[i], e);
        if (!seg) {
          if (cur.length > 1) this.lines.push({ cls, pts: cur });
          cur = [];
          continue;
        }
        const a = q(seg[0]);
        const b = q(seg[1]);
        const last = cur[cur.length - 1];
        if (!last || last[0] !== a[0] || last[1] !== a[1]) {
          if (cur.length > 1) this.lines.push({ cls, pts: cur });
          cur = [a];
        }
        if (b[0] !== a[0] || b[1] !== a[1]) cur.push(b);
      }
      if (cur.length > 1) this.lines.push({ cls, pts: cur });
    }
  }

  /** Junction-to-junction segments, de-duplicated and simplified. */
  build(): RoadNet {
    const key = (p: Q) => p[0] * 1e8 + p[1];
    const uses = new Map<number, number>();
    for (const l of this.lines) {
      const seen = new Set<number>();
      l.pts.forEach((p, i) => {
        const k = key(p);
        if (seen.has(k)) return;
        seen.add(k);
        // Ends always count twice: they are nodes.
        uses.set(k, (uses.get(k) ?? 0) + (i === 0 || i === l.pts.length - 1 ? 2 : 1));
      });
    }
    const segs = new Map<string, { cls: number; pts: Q[] }>();
    for (const l of this.lines) {
      let start = 0;
      for (let i = 1; i < l.pts.length; i++) {
        if ((uses.get(key(l.pts[i])) ?? 0) < 2 && i < l.pts.length - 1) continue;
        const pts = l.pts.slice(start, i + 1);
        start = i;
        if (pts.length < 2) continue;
        const fwd = pts.map((p) => `${p[0]},${p[1]}`).join(';');
        const rev = pts
          .slice()
          .reverse()
          .map((p) => `${p[0]},${p[1]}`)
          .join(';');
        const id = fwd < rev ? fwd : rev;
        const prev = segs.get(id);
        if (!prev || l.cls < prev.cls) segs.set(id, { cls: l.cls, pts });
      }
    }
    let ox = Infinity;
    let oy = Infinity;
    for (const s of segs.values())
      for (const p of s.pts) {
        ox = Math.min(ox, p[0]);
        oy = Math.min(oy, p[1]);
      }
    const lines: number[][] = [];
    const cls: number[] = [];
    for (const s of segs.values()) {
      const pts = simplify(s.pts, SIMPLIFY);
      const flat: number[] = [pts[0][0] - ox, pts[0][1] - oy];
      for (let i = 1; i < pts.length; i++)
        flat.push(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      lines.push(flat);
      cls.push(s.cls);
    }
    return { schemaVersion: 1, z: ROAD_Z, res: ROAD_RES, ox, oy, lines, cls };
  }
}

/** Liang–Barsky: the part of segment ab inside [0, e]², or null. */
function clipSegment(a: Pt, b: Pt, e: number): [Pt, Pt] | null {
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const checks: [number, number][] = [
    [-dx, a.x],
    [dx, e - a.x],
    [-dy, a.y],
    [dy, e - a.y],
  ];
  for (const [p, q] of checks) {
    if (p === 0) {
      if (q < 0) return null;
      continue;
    }
    const r = q / p;
    if (p < 0) {
      if (r > t1) return null;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return null;
      if (r < t1) t1 = r;
    }
  }
  return [
    { x: a.x + t0 * dx, y: a.y + t0 * dy },
    { x: a.x + t1 * dx, y: a.y + t1 * dy },
  ];
}

function simplify(pts: Q[], tol: number): Q[] {
  if (pts.length <= 2) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [i, j] = stack.pop()!;
    const [ax, ay] = pts[i];
    const [bx, by] = pts[j];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    let best = -1;
    let bestD = tol;
    for (let k = i + 1; k < j; k++) {
      const d = Math.abs((bx - ax) * (ay - pts[k][1]) - (ax - pts[k][0]) * (by - ay)) / len;
      if (d > bestD) {
        bestD = d;
        best = k;
      }
    }
    if (best >= 0) {
      keep[best] = 1;
      stack.push([i, best], [best, j]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}
