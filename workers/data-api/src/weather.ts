import { cellToLatLng, getResolution, isValidCell } from 'h3-js';
import { FALLBACK_CITIES } from '../../../src/config/cities';
import type { WeatherCondition, WeatherHour, WeatherResponse } from '../../../src/data/types';
import {
  CACHE,
  REGION_RES,
  WEATHER_FORECAST_DAYS,
  WEATHER_HOURS,
  WEATHER_PRECIP_FULL_MM,
} from './config';
import { edgeCache, type Ctx, type Env } from './env';
import { roundCoord } from './geo';
import { METNO, metnoUrl, parseMetno, type MetnoCompact } from '../../../src/data/metno';
import { badRequest, json, notFound } from './http';

/** WMO weather interpretation code → game condition. */
export function wmoToCondition(code: number): WeatherCondition {
  if (code >= 95) return 'storm'; // thunderstorm (95, 96, 99)
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if (code === 45 || code === 48) return 'fog';
  if (code === 2 || code === 3) return 'cloudy';
  return 'clear'; // 0, 1 and anything unknown
}

interface OpenMeteoHourly {
  hourly?: {
    time?: string[];
    temperature_2m?: (number | null)[];
    precipitation?: (number | null)[];
    weather_code?: (number | null)[];
  };
}

export function openMeteoUrl(lat: number, lng: number, apiKey?: string): string {
  const host = apiKey ? 'https://customer-api.open-meteo.com' : 'https://api.open-meteo.com';
  const qs = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    hourly: 'temperature_2m,precipitation,weather_code',
    forecast_days: String(WEATHER_FORECAST_DAYS),
    timezone: 'UTC',
  });
  if (apiKey) qs.set('apikey', apiKey);
  return `${host}/v1/forecast?${qs.toString()}`;
}

/** Map an Open-Meteo hourly payload to the next WEATHER_HOURS hours from `now`. */
export function mapHours(payload: OpenMeteoHourly, now: Date): WeatherHour[] {
  const h = payload.hourly;
  if (!h?.time || !h.temperature_2m || !h.precipitation || !h.weather_code) {
    throw new Error('open-meteo: missing hourly fields');
  }
  const startMs = Math.floor(now.getTime() / 3_600_000) * 3_600_000;
  const out: WeatherHour[] = [];
  for (let i = 0; i < h.time.length && out.length < WEATHER_HOURS; i++) {
    // timezone=UTC returns "YYYY-MM-DDTHH:MM" without an offset.
    const t = Date.parse(`${h.time[i]}:00Z`);
    if (!Number.isFinite(t) || t < startMs) continue;
    const mm = h.precipitation[i] ?? 0;
    out.push({
      time: new Date(t).toISOString().replace('.000Z', 'Z'),
      tempC: Math.round((h.temperature_2m[i] ?? 0) * 10) / 10,
      condition: wmoToCondition(h.weather_code[i] ?? 0),
      precipitation: Math.round(Math.min(1, Math.max(0, mm / WEATHER_PRECIP_FULL_MM)) * 100) / 100,
    });
  }
  return out;
}

function resolveRegion(
  url: URL,
): { region: string; lat: number; lng: number; cell?: string } | null {
  const cell = url.searchParams.get('cell');
  const city = url.searchParams.get('city');
  if (cell) {
    if (!isValidCell(cell) || getResolution(cell) !== REGION_RES) return null;
    const [lat, lng] = cellToLatLng(cell);
    return { region: `cell:${cell}`, lat: roundCoord(lat), lng: roundCoord(lng), cell };
  }
  if (city) {
    const c = FALLBACK_CITIES.find((x) => x.id === city);
    if (!c) return null;
    return { region: `city:${c.id}`, lat: roundCoord(c.lat), lng: roundCoord(c.lng) };
  }
  return null;
}

export async function weather(url: URL, env: Env, ctx: Ctx): Promise<Response> {
  const r = resolveRegion(url);
  if (!r) return badRequest('expected ?cell={res5} or ?city={cityId}');

  const cache = edgeCache();
  // Keyed by region only (not the incoming URL) so all clients share one entry.
  const cacheKey = new Request(`https://coinline-data-api.internal/weather/${r.region}`);
  const hit = await cache?.match(cacheKey);
  if (hit) return hit;

  // Only regions we serve: any of ~2M res-5 cells would let one script walk
  // MET Norway through our shared User-Agent and get it throttled for everyone.
  if (r.cell && !(await env.DATA.head(`cells/${r.cell}.meta.json`))) {
    return notFound('unknown region');
  }

  // Default: MET Norway (free, no key, commercial use allowed under CC BY 4.0).
  // Open-Meteo is used only with a paid commercial key (its free tier is non-commercial).
  const useOpenMeteo = !!env.OPEN_METEO_API_KEY;
  let upstream: Response;
  try {
    upstream = useOpenMeteo
      ? await fetch(openMeteoUrl(r.lat, r.lng, env.OPEN_METEO_API_KEY), {
          headers: { Accept: 'application/json' },
        })
      : await fetch(metnoUrl(r.lat, r.lng), {
          // MET's terms require an identifying User-Agent with a contact.
          headers: {
            'User-Agent': env.WEATHER_USER_AGENT || METNO.userAgent,
            Accept: 'application/json',
          },
        });
  } catch {
    return json({ error: 'weather_upstream_unavailable' }, 502, { 'Cache-Control': 'no-store' });
  }
  if (!upstream.ok) {
    return json({ error: 'weather_upstream_error', status: upstream.status }, 502, {
      'Cache-Control': 'no-store',
    });
  }

  let hours: WeatherHour[];
  try {
    const payload = await upstream.json();
    hours = useOpenMeteo
      ? mapHours(payload as OpenMeteoHourly, new Date())
      : parseMetno(payload as MetnoCompact, new Date(), WEATHER_HOURS);
  } catch {
    return json({ error: 'weather_upstream_bad_payload' }, 502, { 'Cache-Control': 'no-store' });
  }

  const body: WeatherResponse = {
    region: r.region,
    fetchedAt: new Date().toISOString(),
    source: useOpenMeteo ? 'Open-Meteo (open-meteo.com), CC BY 4.0' : METNO.credit,
    hours,
  };
  const res = json(body, 200, { 'Cache-Control': CACHE.weather });
  if (cache) ctx.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}
