import { ENV } from './env';
import type { AreaCheckResponse, WeatherResponse } from './types';

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

export function fetchWeather(cityId: string): Promise<WeatherResponse> {
  return getJson<WeatherResponse>(`/weather?city=${encodeURIComponent(cityId)}`);
}

export async function fetchRegionPack(res5: string): Promise<Uint8Array> {
  if (!ENV.dataApiUrl) throw new Error('Data API is not configured.');
  const res = await fetch(`${ENV.dataApiUrl}/cells/${res5}.bin`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}
