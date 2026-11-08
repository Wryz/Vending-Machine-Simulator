import { ENV } from './env';
import { readJson, writeJson } from '@/services/storage';

import { METNO, metnoUrl, parseMetno, type MetnoCompact } from './metno';
import type { AreaCheckResponse, CityIndexEntry, WeatherResponse } from './types';

/** Round to ~1 km before anything leaves the device (SPEC §6.6, §11). */
export function coarse(n: number): number {
  return Math.round(n * 100) / 100;
}

async function getJson<T>(path: string, timeoutMs = 8000): Promise<T> {
  if (!ENV.dataApiUrl) throw new Error('Data API is not configured.');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${ENV.dataApiUrl}${path}`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export function areaCheck(lat: number, lng: number): Promise<AreaCheckResponse> {
  return getJson<AreaCheckResponse>(`/area/check?lat=${coarse(lat)}&lng=${coarse(lng)}`);
}

/**
 * Hourly weather for a city. Through the data API Worker when configured
 * (shared edge cache); otherwise straight from MET Norway (free, no key),
 * cached on device and never re-requested before MET's `Expires`. Only the
 * city/region center is sent, never the player's position.
 */
export async function fetchWeather(city: {
  id: string;
  lat: number;
  lng: number;
  /** "Your area" cities: the res-5 region cell (the Worker only knows fallback city ids). */
  res5?: string;
}): Promise<WeatherResponse> {
  if (ENV.dataApiUrl)
    return getJson<WeatherResponse>(
      city.res5
        ? `/weather?cell=${encodeURIComponent(city.res5)}`
        : `/weather?city=${encodeURIComponent(city.id)}`,
    );
  const key = `weather-${city.id.replace(/[^a-z0-9-]/gi, '_')}`;
  const cached = readJson<{ expires: number; response: WeatherResponse }>(key);
  if (cached && cached.expires > Date.now()) return cached.response;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(metnoUrl(city.lat, city.lng), {
      headers: { 'User-Agent': METNO.userAgent, Accept: 'application/json' },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const response: WeatherResponse = {
      region: `city:${city.id}`,
      fetchedAt: new Date().toISOString(),
      source: METNO.credit,
      hours: parseMetno((await res.json()) as MetnoCompact, new Date()),
    };
    const expiresHeader = Date.parse(res.headers.get('expires') ?? '');
    // Honor MET's Expires, but never refetch more than every 30 minutes.
    const expires = Math.max(
      Number.isFinite(expiresHeader) ? expiresHeader : 0,
      Date.now() + 30 * 60_000,
    );
    writeJson(key, { expires, response });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

/** Raw bytes from the data API (packs and streets are served as gzip bytes). */
async function fetchBytes(path: string, timeoutMs = 30_000): Promise<Uint8Array> {
  if (!ENV.dataApiUrl) throw new Error('Data API is not configured.');
  // A stalled download must fail (and show retry), not leave the city loading forever.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${ENV.dataApiUrl}${path}`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

/** A region's pack (gzip RegionPack bytes). */
export const fetchRegionPack = (res5: string) => fetchBytes(`/cells/${res5}.bin`);
/** A region's streets for the delivery vans (gzip RoadNet bytes). */
export const fetchRegionRoads = (res5: string) => fetchBytes(`/cells/${res5}/roads.bin`);
/** A region's named neighbourhoods (pipeline/build-hoods.ts), gzip JSON. */
export const fetchRegionHoods = (res5: string) => fetchBytes(`/cells/${res5}/hoods.bin`);
/** A former built-in city's pack and streets (saves from before regions). */
export const fetchCityPack = (cityId: string) =>
  fetchBytes(`/city/${encodeURIComponent(cityId)}/pack`);
export const fetchCityRoads = (cityId: string) =>
  fetchBytes(`/city/${encodeURIComponent(cityId)}/roads.bin`);

/** The picker's city list (newest from the server; the app also bundles one). */
export function fetchCityIndex(): Promise<CityIndexEntry[]> {
  return getJson<CityIndexEntry[]>('/regions/index.json', 15_000);
}
