import { getResolution, isValidCell } from 'h3-js';
import { FALLBACK_CITIES } from '../../../src/config/cities';
import { CACHE, REGION_RES } from './config';
import type { Env } from './env';
import { regionPackKey } from './area';
import { badRequest, notFound } from './http';

export const cityPackKey = (cityId: string) => `city/${cityId}.json.gz`;

/**
 * Packs are stored gzip-compressed and served as the raw gzip bytes with
 * `Content-Type: application/octet-stream` and NO `Content-Encoding`, so no
 * HTTP layer transparently decompresses them. The app caches the bytes as-is
 * and gunzips them itself (same format as the bundled assets/cities/*.json.gz).
 */
async function servePack(request: Request, env: Env, key: string): Promise<Response> {
  const obj = await env.DATA.get(key);
  if (!obj) return notFound('pack_not_found');
  const headers: Record<string, string> = {
    'Content-Type': 'application/octet-stream',
    'Cache-Control': CACHE.pack,
    ETag: obj.httpEtag,
    'Content-Length': String(obj.size),
    'X-Coinline-Format': 'regionpack+json;gzip',
  };
  if (request.headers.get('If-None-Match') === obj.httpEtag) {
    await obj.body.cancel();
    return new Response(null, {
      status: 304,
      headers: { ETag: obj.httpEtag, 'Cache-Control': CACHE.pack },
    });
  }
  return new Response(request.method === 'HEAD' ? null : obj.body, { status: 200, headers });
}

/** GET /cells/{res5}.bin */
export function regionPack(request: Request, env: Env, res5: string): Promise<Response> | Response {
  if (!isValidCell(res5) || getResolution(res5) !== REGION_RES) return badRequest('bad_res5');
  return servePack(request, env, regionPackKey(res5));
}

/** GET /city/{cityId}/pack */
export function cityPack(request: Request, env: Env, cityId: string): Promise<Response> | Response {
  if (!FALLBACK_CITIES.some((c) => c.id === cityId)) return notFound('unknown_city');
  return servePack(request, env, cityPackKey(cityId));
}
