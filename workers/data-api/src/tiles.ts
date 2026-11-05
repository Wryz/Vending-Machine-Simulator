import { PMTiles, ResolvedValueCache, TileType, type RangeResponse, type Source } from 'pmtiles';
import { CACHE } from './config';
import type { BucketObject, DataBucket, Env } from './env';
import { badRequest, json, notFound } from './http';

export const archiveKey = (name: string) => `tiles/${name}.pmtiles`;
const NAME_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/i;
export const isArchiveName = (name: string) => NAME_RE.test(name) && !name.includes('..');

/** pmtiles Source that reads byte ranges straight out of R2. */
export class R2Source implements Source {
  constructor(
    private readonly bucket: DataBucket,
    private readonly key: string,
  ) {}

  getKey(): string {
    return this.key;
  }

  async getBytes(offset: number, length: number): Promise<RangeResponse> {
    // pmtiles asks for the first 16 KiB for the header; clamp to the object size.
    const size = await objectSize(this.bucket, this.key);
    if (size === null) throw new ArchiveNotFound(this.key);
    const len = Math.max(0, Math.min(length, size - offset));
    const obj = await this.bucket.get(this.key, { range: { offset, length: len } });
    if (!obj) throw new ArchiveNotFound(this.key);
    return { data: await obj.arrayBuffer(), etag: obj.httpEtag };
  }
}

export class ArchiveNotFound extends Error {}

/**
 * Per-isolate cache of object sizes and parsed directories. Workers cannot
 * share promises across requests, hence ResolvedValueCache.
 */
const sizeCache = new WeakMap<
  DataBucket,
  Map<string, { size: number; etag: string; at: number }>
>();
const SIZE_TTL_MS = 5 * 60_000;
const archives = new WeakMap<DataBucket, Map<string, PMTiles>>();

async function headCached(bucket: DataBucket, key: string): Promise<BucketObject | null> {
  let m = sizeCache.get(bucket);
  if (!m) sizeCache.set(bucket, (m = new Map()));
  const hit = m.get(key);
  if (hit && Date.now() - hit.at < SIZE_TTL_MS) return { key, size: hit.size, httpEtag: hit.etag };
  const head = await bucket.head(key);
  if (!head) {
    m.delete(key);
    return null;
  }
  m.set(key, { size: head.size, etag: head.httpEtag, at: Date.now() });
  return head;
}

async function objectSize(bucket: DataBucket, key: string): Promise<number | null> {
  return (await headCached(bucket, key))?.size ?? null;
}

function archiveFor(bucket: DataBucket, name: string): PMTiles {
  let m = archives.get(bucket);
  if (!m) archives.set(bucket, (m = new Map()));
  let p = m.get(name);
  if (!p) {
    p = new PMTiles(new R2Source(bucket, archiveKey(name)), new ResolvedValueCache(25));
    m.set(name, p);
  }
  return p;
}

const TILE_CONTENT_TYPE: Partial<Record<TileType, string>> = {
  [TileType.Mvt]: 'application/vnd.mapbox-vector-tile',
  [TileType.Png]: 'image/png',
  [TileType.Jpeg]: 'image/jpeg',
  [TileType.Webp]: 'image/webp',
  [TileType.Avif]: 'image/avif',
};

/** GET /tiles/{name}/{z}/{x}/{y}.mvt — fallback when native pmtiles:// is unavailable. */
export async function tile(
  env: Env,
  name: string,
  zs: string,
  xs: string,
  ys: string,
): Promise<Response> {
  if (!isArchiveName(name)) return badRequest('bad_archive_name');
  const z = Number(zs);
  const x = Number(xs);
  const y = Number(ys);
  if (![z, x, y].every(Number.isInteger) || z < 0 || z > 26 || x >= 2 ** z || y >= 2 ** z) {
    return badRequest('bad_tile_coords');
  }
  const pm = archiveFor(env.DATA, name);
  try {
    const header = await pm.getHeader();
    if (z < header.minZoom || z > header.maxZoom) return notFound('tile_out_of_range');
    const t = await pm.getZxy(z, x, y);
    const headers: Record<string, string> = {
      'Content-Type': TILE_CONTENT_TYPE[header.tileType] ?? 'application/octet-stream',
      'Cache-Control': CACHE.tiles,
    };
    // Vector tiles: an absent tile is an empty tile (MapLibre treats 204 as empty).
    if (!t)
      return header.tileType === TileType.Mvt
        ? new Response(null, { status: 204, headers })
        : notFound('tile_not_found');
    return new Response(t.data, { status: 200, headers });
  } catch (e) {
    if (e instanceof ArchiveNotFound) return notFound('archive_not_found');
    throw e;
  }
}

/** GET /tiles/{name}.json — TileJSON pointing at the /tiles/{name}/{z}/{x}/{y} route. */
export async function tileJson(env: Env, name: string, origin: string): Promise<Response> {
  if (!isArchiveName(name)) return badRequest('bad_archive_name');
  try {
    const tj = await archiveFor(env.DATA, name).getTileJson(`${origin}/tiles/${name}`);
    return json(tj, 200, { 'Cache-Control': CACHE.tiles });
  } catch (e) {
    if (e instanceof ArchiveNotFound) return notFound('archive_not_found');
    throw e;
  }
}

export type ParsedRange = { offset: number; length: number } | 'unsatisfiable' | null;

/**
 * Parse a single-range `Range: bytes=…` header against an object of `size` bytes.
 * Returns null for no/ignorable header (serve 200), 'unsatisfiable' for 416.
 * Multi-range requests are ignored (served as 200), which RFC 9110 allows.
 */
export function parseRange(header: string | null, size: number): ParsedRange {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m) return null;
  const [, a, b] = m;
  if (a === '' && b === '') return null;
  if (a === '') {
    const suffix = Number(b);
    if (suffix === 0) return 'unsatisfiable';
    const len = Math.min(suffix, size);
    return { offset: size - len, length: len };
  }
  const start = Number(a);
  if (start >= size) return 'unsatisfiable';
  const end = b === '' ? size - 1 : Math.min(Number(b), size - 1);
  if (end < start) return 'unsatisfiable';
  return { offset: start, length: end - start + 1 };
}

/** GET/HEAD /pmtiles/{name}.pmtiles — raw archive with HTTP Range (206) for native pmtiles://. */
export async function rawArchive(request: Request, env: Env, name: string): Promise<Response> {
  if (!isArchiveName(name)) return badRequest('bad_archive_name');
  const key = archiveKey(name);
  const head = await headCached(env.DATA, key);
  if (!head) return notFound('archive_not_found');

  const base: Record<string, string> = {
    'Content-Type': 'application/vnd.pmtiles',
    'Accept-Ranges': 'bytes',
    ETag: head.httpEtag,
    'Cache-Control': CACHE.tiles,
  };
  const range = parseRange(request.headers.get('Range'), head.size);
  if (range === 'unsatisfiable') {
    return new Response(null, {
      status: 416,
      headers: { ...base, 'Content-Range': `bytes */${head.size}` },
    });
  }
  if (request.method === 'HEAD') {
    const len = range ? range.length : head.size;
    const headers: Record<string, string> = { ...base, 'Content-Length': String(len) };
    if (range)
      headers['Content-Range'] =
        `bytes ${range.offset}-${range.offset + range.length - 1}/${head.size}`;
    return new Response(null, { status: range ? 206 : 200, headers });
  }
  const obj = await env.DATA.get(key, range ? { range } : undefined);
  if (!obj) return notFound('archive_not_found');
  if (!range) {
    return new Response(obj.body, {
      status: 200,
      headers: { ...base, 'Content-Length': String(head.size) },
    });
  }
  return new Response(obj.body, {
    status: 206,
    headers: {
      ...base,
      'Content-Length': String(range.length),
      'Content-Range': `bytes ${range.offset}-${range.offset + range.length - 1}/${head.size}`,
    },
  });
}
