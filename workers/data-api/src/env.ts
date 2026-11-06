/**
 * Worker bindings. The bucket type is the narrow subset of R2Bucket the API
 * uses, so tests can pass an in-memory fake (real R2Bucket satisfies it).
 */
export interface BucketRange {
  offset: number;
  length: number;
}

export interface BucketObject {
  key: string;
  /** Total object size in bytes (not the size of the returned range). */
  size: number;
  httpEtag: string;
}

export interface BucketObjectBody extends BucketObject {
  body: ReadableStream<Uint8Array>;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
}

export interface DataBucket {
  head(key: string): Promise<BucketObject | null>;
  get(key: string, options?: { range?: BucketRange }): Promise<BucketObjectBody | null>;
}

export interface Env {
  DATA: DataBucket;
  /** Optional commercial Open-Meteo key (customer-api.open-meteo.com). Without it, MET Norway is used. */
  OPEN_METEO_API_KEY?: string;
  /** Optional User-Agent override for MET Norway (must identify you: app + website/email). */
  WEATHER_USER_AGENT?: string;
}

/** Minimal Cache API surface (Cloudflare `caches.default`). */
export interface EdgeCache {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

export interface Ctx {
  waitUntil(promise: Promise<unknown>): void;
}

/** `caches.default` on Cloudflare; undefined in plain Node (tests may stub it). */
export function edgeCache(): EdgeCache | undefined {
  const c = (globalThis as { caches?: { default?: EdgeCache } }).caches;
  return c?.default;
}
