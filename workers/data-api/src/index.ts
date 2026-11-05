/**
 * Coinline data API (SPEC §6.6). Stateless, read-only, GET-only, CORS *.
 *
 *   GET /health
 *   GET /area/check?lat&lng                 → AreaCheckResponse
 *   GET /cells/{res5}.bin                   → gzip RegionPack bytes
 *   GET /city/{cityId}/pack                 → gzip RegionPack bytes
 *   GET /weather?cell={res5} | ?city={id}   → WeatherResponse (48 h, edge-cached 1 h)
 *   GET /tiles/{name}.json                  → TileJSON
 *   GET /tiles/{name}/{z}/{x}/{y}.mvt       → one tile out of tiles/{name}.pmtiles
 *   GET /pmtiles/{name}.pmtiles             → raw archive with Range/206 (native pmtiles://)
 *
 * Privacy: request URLs (which carry coarse lat/lng for /area/check) are never
 * logged by this code; wrangler.toml also redacts query strings in Workers Logs.
 */
import { areaCheck } from './area';
import type { Ctx, Env } from './env';
import { CORS_HEADERS, json, notFound, withCors } from './http';
import { cityPack, regionPack } from './packs';
import { rawArchive, tile, tileJson } from './tiles';
import { weather } from './weather';

export type { Env } from './env';

async function route(request: Request, env: Env, ctx: Ctx): Promise<Response> {
  const url = new URL(request.url);
  const p = url.pathname;
  let m: RegExpExecArray | null;

  if (p === '/health') {
    return json({ ok: true, service: 'coinline-data-api', time: new Date().toISOString() }, 200, {
      'Cache-Control': 'no-store',
    });
  }
  if (p === '/area/check') return areaCheck(url, env);
  if (p === '/weather') return weather(url, env, ctx);
  if ((m = /^\/cells\/([0-9a-f]{15})\.bin$/i.exec(p)))
    return regionPack(request, env, m[1].toLowerCase());
  if ((m = /^\/city\/([a-z-]+)\/pack$/.exec(p))) return cityPack(request, env, m[1]);
  if ((m = /^\/tiles\/([^/]+)\/(\d+)\/(\d+)\/(\d+)\.(?:mvt|pbf)$/.exec(p)))
    return tile(env, m[1], m[2], m[3], m[4]);
  if ((m = /^\/tiles\/([^/]+)\.json$/.exec(p))) return tileJson(env, m[1], url.origin);
  if ((m = /^\/pmtiles\/([^/]+)\.pmtiles$/.exec(p))) return rawArchive(request, env, m[1]);
  return notFound();
}

export default {
  async fetch(request: Request, env: Env, ctx: Ctx): Promise<Response> {
    if (request.method === 'OPTIONS')
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return withCors(json({ error: 'method_not_allowed' }, 405, { Allow: 'GET, HEAD, OPTIONS' }));
    }
    try {
      const res = await route(request, env, ctx);
      return withCors(request.method === 'HEAD' && res.body ? new Response(null, res) : res);
    } catch (e) {
      // Log the error class only — never the URL (it may carry coordinates).
      console.error(`unhandled_error ${e instanceof Error ? e.name : 'unknown'}`);
      return withCors(json({ error: 'internal_error' }, 500, { 'Cache-Control': 'no-store' }));
    }
  },
};
