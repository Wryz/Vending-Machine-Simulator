import { gzipSync } from 'node:zlib';
import { zxyToTileId } from 'pmtiles';
import type {
  BucketObject,
  BucketObjectBody,
  BucketRange,
  Ctx,
  DataBucket,
  EdgeCache,
  Env,
} from '../src/env';

/** In-memory stand-in for an R2 bucket (head + ranged get). */
export class FakeBucket implements DataBucket {
  readonly objects = new Map<string, Uint8Array>();
  readonly calls: { op: 'head' | 'get'; key: string; range?: BucketRange }[] = [];

  put(key: string, value: Uint8Array | string): this {
    this.objects.set(key, typeof value === 'string' ? new TextEncoder().encode(value) : value);
    return this;
  }

  private meta(key: string, bytes: Uint8Array): BucketObject {
    return { key, size: bytes.byteLength, httpEtag: `"etag-${key.length}-${bytes.byteLength}"` };
  }

  async head(key: string): Promise<BucketObject | null> {
    this.calls.push({ op: 'head', key });
    const b = this.objects.get(key);
    return b ? this.meta(key, b) : null;
  }

  async get(key: string, options?: { range?: BucketRange }): Promise<BucketObjectBody | null> {
    this.calls.push({ op: 'get', key, range: options?.range });
    const all = this.objects.get(key);
    if (!all) return null;
    const r = options?.range;
    const bytes = r ? all.slice(r.offset, r.offset + r.length) : all.slice();
    const copy = () =>
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    return {
      ...this.meta(key, all),
      body: new Response(copy()).body as ReadableStream<Uint8Array>,
      arrayBuffer: async () => copy(),
      text: async () => new TextDecoder().decode(bytes),
    };
  }
}

export class FakeCache implements EdgeCache {
  readonly store = new Map<string, Response>();
  async match(req: Request): Promise<Response | undefined> {
    return this.store.get(req.url)?.clone();
  }
  async put(req: Request, res: Response): Promise<void> {
    this.store.set(req.url, res);
  }
}

export function makeCtx(): Ctx & { pending: Promise<unknown>[] } {
  const pending: Promise<unknown>[] = [];
  return { pending, waitUntil: (p) => void pending.push(p) };
}

export function makeEnv(
  bucket = new FakeBucket(),
  extra: Omit<Partial<Env>, 'DATA'> = {},
): Env & { DATA: FakeBucket } {
  return { ...extra, DATA: bucket };
}

export const gz = (s: string) => new Uint8Array(gzipSync(Buffer.from(s)));

// ---------------------------------------------------------------------------
// Minimal PMTiles v3 writer (uncompressed directory, single root directory).
// ---------------------------------------------------------------------------
function varint(n: number, out: number[]): void {
  while (n >= 0x80) {
    out.push((n % 0x80) | 0x80);
    n = Math.floor(n / 0x80);
  }
  out.push(n);
}

function u64(view: DataView, off: number, v: number): void {
  view.setUint32(off, v % 2 ** 32, true);
  view.setUint32(off + 4, Math.floor(v / 2 ** 32), true);
}

export interface FixtureTile {
  z: number;
  x: number;
  y: number;
  data: Uint8Array;
}

/** Build a tiny MVT-typed PMTiles archive (tile + internal compression: none). */
export function buildPmtiles(tiles: FixtureTile[], gzipTiles = false): Uint8Array {
  const entries = tiles
    .map((t) => ({ id: zxyToTileId(t.z, t.x, t.y), data: gzipTiles ? gzipSync(t.data) : t.data }))
    .sort((a, b) => a.id - b.id);
  const dir: number[] = [];
  varint(entries.length, dir);
  let last = 0;
  for (const e of entries) {
    varint(e.id - last, dir);
    last = e.id;
  }
  for (let i = 0; i < entries.length; i++) varint(1, dir); // run lengths
  for (const e of entries) varint(e.data.byteLength, dir); // lengths
  for (let i = 0; i < entries.length; i++) varint(i === 0 ? 1 : 0, dir); // offsets: 0 = contiguous
  const metadata = new TextEncoder().encode(JSON.stringify({ name: 'fixture', vector_layers: [] }));
  const tileBytes = entries.reduce((n, e) => n + e.data.byteLength, 0);

  const headerLen = 127;
  const rootOff = headerLen;
  const metaOff = rootOff + dir.length;
  const tileOff = metaOff + metadata.byteLength;
  const out = new Uint8Array(tileOff + tileBytes);
  const v = new DataView(out.buffer);
  out.set(new TextEncoder().encode('PMTiles'), 0);
  v.setUint8(7, 3);
  u64(v, 8, rootOff);
  u64(v, 16, dir.length);
  u64(v, 24, metaOff);
  u64(v, 32, metadata.byteLength);
  u64(v, 40, tileOff); // leaf dirs (none)
  u64(v, 48, 0);
  u64(v, 56, tileOff);
  u64(v, 64, tileBytes);
  u64(v, 72, entries.length);
  u64(v, 80, entries.length);
  u64(v, 88, entries.length);
  v.setUint8(96, 1); // clustered
  v.setUint8(97, 1); // internal compression: none
  v.setUint8(98, gzipTiles ? 2 : 1); // tile compression
  v.setUint8(99, 1); // tile type: MVT
  v.setUint8(100, Math.min(...tiles.map((t) => t.z)));
  v.setUint8(101, Math.max(...tiles.map((t) => t.z)));
  v.setInt32(102, -180 * 1e7, true);
  v.setInt32(106, -85 * 1e7, true);
  v.setInt32(110, 180 * 1e7, true);
  v.setInt32(114, 85 * 1e7, true);
  out.set(dir, rootOff);
  out.set(metadata, metaOff);
  let off = tileOff;
  for (const e of entries) {
    out.set(e.data, off);
    off += e.data.byteLength;
  }
  return out;
}
