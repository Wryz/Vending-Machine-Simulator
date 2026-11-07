import { ROADS } from '@/config/deliveries';
import type { RoadNet } from '@/data/types';

import { distanceM } from './geo';

/**
 * Street routing for delivery vans: a graph of every road vertex from the
 * city's RoadNet, A* by driving time (bigger roads are faster, so vans keep to
 * them like real drivers), and a nearest-vertex index. Pure: no I/O.
 */

export interface RoadGraph {
  lng: Float64Array;
  lat: Float64Array;
  /** CSR adjacency: neighbours of node i are nbr[off[i]..off[i+1]). */
  off: Int32Array;
  nbr: Int32Array;
  /** Edge length in meters and driving time in seconds, per adjacency entry. */
  lenM: Float32Array;
  costS: Float32Array;
  /** Nodes of the biggest connected network, bucketed by grid cell. */
  buckets: Map<number, number[]>;
  bucketDeg: number;
}

export interface RoadRoute {
  /** [lng, lat] from start to end, including the off-road ends. */
  path: [number, number][];
  lengthM: number;
}

export function buildRoadGraph(net: RoadNet): RoadGraph {
  const n = 2 ** net.z * net.res;
  const ids = new Map<number, number>();
  const lng: number[] = [];
  const lat: number[] = [];
  const edges: [number, number, number][] = [];
  const node = (x: number, y: number): number => {
    const k = x * 33_554_432 + y;
    let id = ids.get(k);
    if (id === undefined) {
      id = lng.length;
      ids.set(k, id);
      lng.push((x / n) * 360 - 180);
      lat.push((Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI);
    }
    return id;
  };
  net.lines.forEach((flat, li) => {
    const cls = net.cls[li] ?? 2;
    let x = net.ox + flat[0];
    let y = net.oy + flat[1];
    let prev = node(x, y);
    for (let i = 2; i + 1 < flat.length; i += 2) {
      x += flat[i];
      y += flat[i + 1];
      const cur = node(x, y);
      if (cur !== prev) edges.push([prev, cur, cls]);
      prev = cur;
    }
  });
  const count = lng.length;
  const deg = new Int32Array(count + 1);
  for (const [a, b] of edges) {
    deg[a + 1]++;
    deg[b + 1]++;
  }
  for (let i = 0; i < count; i++) deg[i + 1] += deg[i];
  const off = deg.slice();
  const fill = deg.slice(0, count);
  const nbr = new Int32Array(edges.length * 2);
  const lenM = new Float32Array(edges.length * 2);
  const costS = new Float32Array(edges.length * 2);
  for (const [a, b, cls] of edges) {
    const d = distanceM({ lat: lat[a], lng: lng[a] }, { lat: lat[b], lng: lng[b] });
    const s = d / (ROADS.speedKmhByClass[cls] / 3.6);
    for (const [u, v] of [
      [a, b],
      [b, a],
    ]) {
      const j = fill[u]++;
      nbr[j] = v;
      lenM[j] = d;
      costS[j] = s;
    }
  }
  const g: RoadGraph = {
    lng: Float64Array.from(lng),
    lat: Float64Array.from(lat),
    off,
    nbr,
    lenM,
    costS,
    buckets: new Map(),
    bucketDeg: ROADS.bucketDeg,
  };
  // Index only the biggest connected network, so a route never starts on an island.
  const comp = new Int32Array(count).fill(-1);
  let best = -1;
  let bestSize = 0;
  for (let s = 0, c = 0; s < count; s++) {
    if (comp[s] >= 0) continue;
    let size = 0;
    const stack = [s];
    comp[s] = c;
    while (stack.length) {
      const u = stack.pop()!;
      size++;
      for (let j = off[u]; j < off[u + 1]; j++)
        if (comp[nbr[j]] < 0) {
          comp[nbr[j]] = c;
          stack.push(nbr[j]);
        }
    }
    if (size > bestSize) {
      bestSize = size;
      best = c;
    }
    c++;
  }
  for (let i = 0; i < count; i++) {
    if (comp[i] !== best) continue;
    const k = bucketKey(g, g.lat[i], g.lng[i]);
    const list = g.buckets.get(k);
    if (list) list.push(i);
    else g.buckets.set(k, [i]);
  }
  return g;
}

function bucketKey(g: RoadGraph, lat: number, lng: number): number {
  return Math.floor(lat / g.bucketDeg) * 100_000 + Math.floor(lng / g.bucketDeg);
}

/** The closest road vertex (on the main network), searching outward ring by ring. */
export function nearestNode(g: RoadGraph, p: { lat: number; lng: number }): number {
  const r0 = Math.floor(p.lat / g.bucketDeg);
  const c0 = Math.floor(p.lng / g.bucketDeg);
  let best = -1;
  let bestD = Infinity;
  for (let ring = 0; ring <= ROADS.maxSnapRings; ring++) {
    for (let r = r0 - ring; r <= r0 + ring; r++)
      for (let c = c0 - ring; c <= c0 + ring; c++) {
        if (Math.max(Math.abs(r - r0), Math.abs(c - c0)) !== ring) continue;
        for (const i of g.buckets.get(r * 100_000 + c) ?? []) {
          const d = distanceM(p, { lat: g.lat[i], lng: g.lng[i] });
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        }
      }
    // A hit in this ring may still lose to one in the next (cell corners); one more ring settles it.
    if (best >= 0 && ring >= 1) break;
  }
  return best;
}

/** The fastest drive from a to b along the streets, or null when off the network. */
export function routeOnRoads(
  g: RoadGraph,
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): RoadRoute | null {
  const s = nearestNode(g, a);
  const t = nearestNode(g, b);
  if (s < 0 || t < 0) return null;
  const count = g.lng.length;
  const cost = new Float64Array(count).fill(Infinity);
  const from = new Int32Array(count).fill(-1);
  const vmax = Math.max(...ROADS.speedKmhByClass) / 3.6;
  const goal = { lat: g.lat[t], lng: g.lng[t] };
  const h = (i: number) => distanceM({ lat: g.lat[i], lng: g.lng[i] }, goal) / vmax;
  const heap = new MinHeap();
  cost[s] = 0;
  heap.push(s, h(s));
  while (heap.size) {
    const u = heap.pop();
    if (u === t) break;
    for (let j = g.off[u]; j < g.off[u + 1]; j++) {
      const v = g.nbr[j];
      const c = cost[u] + g.costS[j];
      if (c < cost[v]) {
        cost[v] = c;
        from[v] = u;
        heap.push(v, c + h(v));
      }
    }
  }
  if (s !== t && from[t] < 0) return null;
  const nodes: number[] = [];
  for (let u = t; u >= 0; u = u === s ? -1 : from[u]) nodes.push(u);
  nodes.reverse();
  const path: [number, number][] = [[a.lng, a.lat]];
  for (const i of nodes) path.push([g.lng[i], g.lat[i]]);
  path.push([b.lng, b.lat]);
  return { path, lengthM: pathLengthM(path) };
}

export function pathLengthM(path: readonly (readonly [number, number])[]): number {
  let d = 0;
  for (let i = 1; i < path.length; i++)
    d += distanceM(
      { lng: path[i - 1][0], lat: path[i - 1][1] },
      { lng: path[i][0], lat: path[i][1] },
    );
  return d;
}

/** The point a share k (0..1) of the way along a path, and whether it heads east. */
export function pointAlong(
  path: readonly (readonly [number, number])[],
  k: number,
): { at: [number, number]; east: boolean; index: number } {
  if (path.length === 1) return { at: [path[0][0], path[0][1]], east: true, index: 0 };
  const total = pathLengthM(path);
  let left = Math.max(0, Math.min(1, k)) * total;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const d = distanceM({ lng: a[0], lat: a[1] }, { lng: b[0], lat: b[1] });
    if (left <= d || i === path.length - 1) {
      const f = d > 0 ? Math.min(1, left / d) : 1;
      return {
        at: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f],
        east: b[0] >= a[0],
        index: i,
      };
    }
    left -= d;
  }
  const last = path[path.length - 1];
  return { at: [last[0], last[1]], east: true, index: path.length - 1 };
}

/** Binary min-heap of node ids by priority. */
class MinHeap {
  private ids: number[] = [];
  private pr: number[] = [];
  get size() {
    return this.ids.length;
  }
  push(id: number, p: number) {
    const ids = this.ids;
    const pr = this.pr;
    let i = ids.length;
    ids.push(id);
    pr.push(p);
    while (i > 0) {
      const up = (i - 1) >> 1;
      if (pr[up] <= p) break;
      ids[i] = ids[up];
      pr[i] = pr[up];
      i = up;
    }
    ids[i] = id;
    pr[i] = p;
  }
  pop(): number {
    const ids = this.ids;
    const pr = this.pr;
    const top = ids[0];
    const lastId = ids.pop()!;
    const lastP = pr.pop()!;
    if (ids.length) {
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        if (l >= ids.length) break;
        const r = l + 1;
        const c = r < ids.length && pr[r] < pr[l] ? r : l;
        if (pr[c] >= lastP) break;
        ids[i] = ids[c];
        pr[i] = pr[c];
        i = c;
      }
      ids[i] = lastId;
      pr[i] = lastP;
    }
    return top;
  }
}
