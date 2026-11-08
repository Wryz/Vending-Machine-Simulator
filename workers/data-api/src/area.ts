import { cellToLatLng, cellToParent, gridDisk, latLngToCell } from 'h3-js';
import { FALLBACK_CITIES } from '../../../src/config/cities';
import { PLACE_CATEGORIES, type AreaCheckResponse } from '../../../src/data/types';
import {
  CACHE,
  CELL_RES,
  CITY_RADIUS_M,
  MIN_CATEGORIES,
  MIN_NAMED_PLACES,
  MIN_RESIDENTS,
  NEIGHBOUR_REGION_M,
  PLAYABLE_RADIUS_M,
  REGION_RES,
} from './config';
import type { Env } from './env';
import { haversineM, parseCoord, roundCoord } from './geo';
import { json } from './http';
import { isRegionMeta, type RegionMeta } from './meta';

export const regionPackKey = (res5: string) => `cells/${res5}.json.gz`;
/** The region's drivable streets for delivery vans (RoadNet, gzip). */
export const regionRoadsKey = (res5: string) => `cells/${res5}-roads.json.gz`;
export const regionHoodsKey = (res5: string) => `cells/${res5}-hoods.json.gz`;
export const regionMetaKey = (res5: string) => `cells/${res5}.meta.json`;

/** Average distance between neighbouring res-9 centers is ~300 m; k=8 covers 2 km. */
const DISK_K = Math.ceil(PLAYABLE_RADIUS_M / 300) + 1;

function respond(body: AreaCheckResponse, status = 200): Response {
  return json(body, status, { 'Cache-Control': status === 200 ? CACHE.areaCheck : 'no-store' });
}

const BAD: AreaCheckResponse = {
  playable: false,
  cityName: null,
  reason: 'bad_request',
  centroid: null,
};

export async function areaCheck(url: URL, env: Env): Promise<Response> {
  const rawLat = parseCoord(url.searchParams.get('lat'), -90, 90);
  const rawLng = parseCoord(url.searchParams.get('lng'), -180, 180);
  if (rawLat === null || rawLng === null) return respond(BAD, 400);

  // Privacy (SPEC §6.6): round to ~1 km before ANY use. Never log lat/lng.
  const lat = roundCoord(rawLat);
  const lng = roundCoord(rawLng);

  // 1) Computed region (or a built neighbour of the same city)?
  const res5 = latLngToCell(lat, lng, REGION_RES);
  const [cLat, cLng] = cellToLatLng(res5);
  const centroid = { lat: roundCoord(cLat), lng: roundCoord(cLng) };
  const pack = await env.DATA.head(regionPackKey(res5));
  if (!pack) {
    const near = await nearestBuiltNeighbour(env, res5, lat, lng);
    if (near) return near;
    // Legacy: the former built-in cities, while their regions are being built.
    let best: { id: string; name: string; lat: number; lng: number; d: number } | null = null;
    for (const c of FALLBACK_CITIES) {
      const d = haversineM(lat, lng, c.lat, c.lng);
      if (d <= CITY_RADIUS_M && (!best || d < best.d)) best = { ...c, d };
    }
    if (best) {
      return respond({
        playable: true,
        cityName: best.name,
        reason: 'ok',
        centroid: { lat: best.lat, lng: best.lng },
        cityId: best.id,
      });
    }

    // Counts only: the res-5 cell (~250 km²) is coarse enough to log.
    console.log(`area_check_miss res5=${res5}`);
    return respond({
      playable: false,
      cityName: null,
      reason: 'region_not_computed',
      centroid: null,
      res5,
    });
  }

  // 2) SPEC §6.2 thresholds over res-9 cells within 2 km.
  const origin = latLngToCell(lat, lng, CELL_RES);
  const near = gridDisk(origin, DISK_K).filter((h) => {
    const [hLat, hLng] = cellToLatLng(h);
    return haversineM(lat, lng, hLat, hLng) <= PLAYABLE_RADIUS_M;
  });
  const parents = [...new Set(near.map((h) => cellToParent(h, REGION_RES)))];
  const metas = (await Promise.all(parents.map((p) => readMeta(env, p)))).filter(
    (m): m is RegionMeta => m !== null,
  );
  const own = metas.find((m) => m.res5 === res5);
  const cityName = own?.name ?? null;
  // Open downtown (or the district's busiest spot), not the middle of the hexagon.
  const opens = own?.center
    ? { lat: roundCoord(own.center.lat), lng: roundCoord(own.center.lng) }
    : centroid;
  const about = placeOf(own);

  if (!own) {
    // Pack exists but no summary: the region was computed, so let the player in.
    return respond({ playable: true, cityName, reason: 'ok', centroid, res5 });
  }

  const byCell = new Map<string, [number, number, number]>();
  for (const m of metas) for (const [id, n, mask, pop] of m.cells) byCell.set(id, [n, mask, pop]);

  let named = 0;
  let mask = 0;
  let pop = 0;
  for (const h of near) {
    const s = byCell.get(h);
    if (!s) continue;
    named += s[0];
    mask |= s[1];
    pop += s[2];
  }
  let categories = 0;
  for (let i = 0; i < PLACE_CATEGORIES.length; i++) if (mask & (1 << i)) categories++;

  if (named < MIN_NAMED_PLACES || categories < MIN_CATEGORIES) {
    return respond({
      playable: false,
      cityName,
      reason: 'not_enough_places',
      centroid: opens,
      res5,
      ...about,
    });
  }
  if (pop < MIN_RESIDENTS) {
    return respond({
      playable: false,
      cityName,
      reason: 'not_enough_population',
      centroid: opens,
      res5,
      ...about,
    });
  }
  return respond({ playable: true, cityName, reason: 'ok', centroid: opens, res5, ...about });
}

/**
 * The player's own region isn't built, but the city they're in may be: the
 * closest built neighbouring region (center within NEIGHBOUR_REGION_M) plays
 * instead, if it has enough places and people as a whole (SPEC §6.2 totals).
 */
async function nearestBuiltNeighbour(
  env: Env,
  res5: string,
  lat: number,
  lng: number,
): Promise<Response | null> {
  const candidates = gridDisk(res5, 1)
    .filter((h) => h !== res5)
    .map((h) => {
      const [hLat, hLng] = cellToLatLng(h);
      return { h, hLat, hLng, d: haversineM(lat, lng, hLat, hLng) };
    })
    .filter((c) => c.d <= NEIGHBOUR_REGION_M)
    .sort((a, b) => a.d - b.d);
  for (const c of candidates) {
    if (!(await env.DATA.head(regionPackKey(c.h)))) continue;
    const meta = await readMeta(env, c.h);
    const at = meta?.center ?? { lat: c.hLat, lng: c.hLng };
    const centroid = { lat: roundCoord(at.lat), lng: roundCoord(at.lng) };
    if (meta) {
      const t = meta.totals;
      if (
        t.namedPlaces < MIN_NAMED_PLACES ||
        t.categories < MIN_CATEGORIES ||
        t.pop < MIN_RESIDENTS
      )
        continue;
    }
    return respond({
      playable: true,
      cityName: meta?.name ?? null,
      reason: 'ok',
      centroid,
      res5: c.h,
      ...placeOf(meta),
    });
  }
  return null;
}

/** Country, time zone and outer-district side from a region summary, when it has them. */
function placeOf(meta: RegionMeta | null | undefined): Partial<AreaCheckResponse> {
  if (!meta) return {};
  return {
    ...(meta.cc ? { cc: meta.cc } : {}),
    ...(meta.tz ? { tz: meta.tz } : {}),
    ...(meta.dir ? { dir: meta.dir } : {}),
  };
}

async function readMeta(env: Env, res5: string): Promise<RegionMeta | null> {
  const obj = await env.DATA.get(regionMetaKey(res5));
  if (!obj) return null;
  try {
    const parsed: unknown = JSON.parse(await obj.text());
    if (!isRegionMeta(parsed)) return null;
    return { ...parsed, res5: parsed.res5 ?? res5 };
  } catch {
    return null;
  }
}
