/**
 * Helpers for reading a local PMTiles archive of Protomaps v4 vector tiles
 * and doing a little tile-space geometry. Node only.
 */
import { open, type FileHandle } from 'node:fs/promises';
import { VectorTile, type VectorTileFeature } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import { PMTiles, type Source } from 'pmtiles';

export interface Pt {
  x: number;
  y: number;
}

class NodeFileSource implements Source {
  constructor(
    private readonly path: string,
    private readonly fh: FileHandle,
  ) {}
  getKey(): string {
    return this.path;
  }
  async getBytes(offset: number, length: number) {
    const buf = Buffer.alloc(length);
    const { bytesRead } = await this.fh.read(buf, 0, length, offset);
    return { data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + bytesRead) as ArrayBuffer };
  }
}

export async function openArchive(
  path: string,
): Promise<{ pm: PMTiles; close: () => Promise<void> }> {
  const fh = await open(path, 'r');
  return { pm: new PMTiles(new NodeFileSource(path, fh)), close: () => fh.close() };
}

export function lngToTileX(lng: number, z: number): number {
  return Math.floor(((lng + 180) / 360) * 2 ** z);
}

export function latToTileY(lat: number, z: number): number {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
}

/** Tile-local coordinates → lng/lat. */
export function tilePointToLngLat(
  z: number,
  tx: number,
  ty: number,
  extent: number,
  p: Pt,
): [number, number] {
  const n = 2 ** z;
  const wx = (tx + p.x / extent) / n;
  const wy = (ty + p.y / extent) / n;
  const lng = wx * 360 - 180;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - 2 * wy))) * 180) / Math.PI;
  return [lng, lat];
}

/** Ground metres per tile unit at the tile's center latitude (Web Mercator). */
export function metresPerUnit(z: number, ty: number, extent: number): number {
  const [, lat] = tilePointToLngLat(z, 0, ty, extent, { x: 0, y: extent / 2 });
  return ((2 * Math.PI * 6378137) / 2 ** z / extent) * Math.cos((lat * Math.PI) / 180);
}

export async function readTile(
  pm: PMTiles,
  z: number,
  x: number,
  y: number,
): Promise<VectorTile | null> {
  const t = await pm.getZxy(z, x, y);
  if (!t) return null;
  return new VectorTile(new PbfReader(new Uint8Array(t.data)));
}

export function* features(tile: VectorTile, layer: string): Generator<VectorTileFeature> {
  const l = tile.layers[layer];
  if (!l) return;
  for (let i = 0; i < l.length; i++) yield l.feature(i);
}

/** Clip one ring to the square [0, extent]² (Sutherland–Hodgman); keeps winding. */
export function clipRing(ring: Pt[], extent: number): Pt[] {
  type Edge = { inside: (p: Pt) => boolean; cut: (a: Pt, b: Pt) => Pt };
  const edges: Edge[] = [
    {
      inside: (p) => p.x >= 0,
      cut: (a, b) => ({ x: 0, y: a.y + ((b.y - a.y) * (0 - a.x)) / (b.x - a.x) }),
    },
    {
      inside: (p) => p.x <= extent,
      cut: (a, b) => ({ x: extent, y: a.y + ((b.y - a.y) * (extent - a.x)) / (b.x - a.x) }),
    },
    {
      inside: (p) => p.y >= 0,
      cut: (a, b) => ({ x: a.x + ((b.x - a.x) * (0 - a.y)) / (b.y - a.y), y: 0 }),
    },
    {
      inside: (p) => p.y <= extent,
      cut: (a, b) => ({ x: a.x + ((b.x - a.x) * (extent - a.y)) / (b.y - a.y), y: extent }),
    },
  ];
  let out = ring;
  for (const e of edges) {
    const input = out;
    out = [];
    if (input.length === 0) break;
    let prev = input[input.length - 1];
    for (const cur of input) {
      if (e.inside(cur)) {
        if (!e.inside(prev)) out.push(e.cut(prev, cur));
        out.push(cur);
      } else if (e.inside(prev)) {
        out.push(e.cut(prev, cur));
      }
      prev = cur;
    }
  }
  return out;
}

/**
 * Net signed area and centroid of a polygon feature's rings (outer rings and
 * holes have opposite winding in MVT, so summing signed areas subtracts holes).
 */
export function areaAndCentroid(rings: Pt[][]): { area: number; cx: number; cy: number } {
  let a2 = 0;
  let cx = 0;
  let cy = 0;
  for (const r of rings) {
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const cross = r[j].x * r[i].y - r[i].x * r[j].y;
      a2 += cross;
      cx += (r[j].x + r[i].x) * cross;
      cy += (r[j].y + r[i].y) * cross;
    }
  }
  if (a2 === 0) return { area: 0, cx: 0, cy: 0 };
  // MVT exterior rings are clockwise in y-down space → positive here.
  return { area: Math.abs(a2 / 2), cx: cx / (3 * a2), cy: cy / (3 * a2) };
}

/** Even–odd point-in-polygon over all rings (holes handled). */
export function pointInRings(p: Pt, rings: Pt[][]): boolean {
  let inside = false;
  for (const r of rings) {
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const a = r[i];
      const b = r[j];
      if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x)
        inside = !inside;
    }
  }
  return inside;
}

export function ringsBBox(rings: Pt[][]): [number, number, number, number] {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const r of rings)
    for (const p of r) {
      if (p.x < x0) x0 = p.x;
      if (p.y < y0) y0 = p.y;
      if (p.x > x1) x1 = p.x;
      if (p.y > y1) y1 = p.y;
    }
  return [x0, y0, x1, y1];
}

/**
 * Protomaps (Planetiler) feature ids encode the OSM element type in the high
 * bits: id = type × 2^44 + osmId, with 1 = node, 2 = way, 3 = relation.
 */
export function osmIdFromFeatureId(id: number | undefined): string | null {
  if (id === undefined || !Number.isFinite(id) || id <= 0) return null;
  const type = Math.floor(id / 2 ** 44);
  const osm = id - type * 2 ** 44;
  const t = type === 1 ? 'n' : type === 2 ? 'w' : type === 3 ? 'r' : null;
  return t ? `osm:${t}${osm}` : null;
}
