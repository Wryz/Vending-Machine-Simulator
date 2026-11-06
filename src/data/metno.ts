import type { WeatherCondition, WeatherHour } from './types';

/**
 * MET Norway Locationforecast 2.0 (api.met.no) — free, global, hourly, no API
 * key, data under CC BY 4.0 / NLOD 2.0 (commercial use allowed with credit).
 * Terms: identify yourself in the User-Agent (app name + website/email),
 * cache responses and respect `Expires`/`If-Modified-Since`, ≤ 4 decimals in
 * coordinates, < 20 requests/second in total. Pure module: shared by the
 * Worker and the app's direct fallback.
 */

export const METNO = {
  endpoint: 'https://api.met.no/weatherapi/locationforecast/2.0/compact',
  /** Identifies the app per MET's terms (website as contact). */
  userAgent: 'Coinline/1.0 (+https://github.com/wryz/vending-machine-simulator)',
  credit: 'Weather: MET Norway (api.met.no), CC BY 4.0',
  /** Precipitation (mm/h) treated as "full" intensity 1.0. */
  precipFullMm: 6,
  hours: 48,
} as const;

/** ≤ 4 decimals as MET requires; we use 2 (≈1 km) because we only send city/region centers. */
export function metnoUrl(lat: number, lng: number): string {
  const r = (n: number) => Math.round(n * 100) / 100;
  return `${METNO.endpoint}?lat=${r(lat)}&lon=${r(lng)}`;
}

/** MET symbol_code (e.g. "lightrainshowers_day", "heavysnowandthunder") → game condition. */
export function symbolToCondition(symbol: string | undefined): WeatherCondition {
  const s = (symbol ?? '').toLowerCase();
  if (s.includes('thunder')) return 'storm';
  if (s.includes('snow') || s.includes('sleet')) return 'snow';
  if (s.includes('rain') || s.includes('drizzle')) return 'rain';
  if (s.startsWith('fog')) return 'fog';
  if (s.startsWith('cloudy') || s.startsWith('partlycloudy')) return 'cloudy';
  return 'clear'; // clearsky, fair, unknown
}

interface MetnoStep {
  time: string;
  data?: {
    instant?: { details?: { air_temperature?: number } };
    next_1_hours?: {
      summary?: { symbol_code?: string };
      details?: { precipitation_amount?: number };
    };
    next_6_hours?: {
      summary?: { symbol_code?: string };
      details?: { precipitation_amount?: number };
    };
  };
}

export interface MetnoCompact {
  properties?: { timeseries?: MetnoStep[] };
}

/**
 * Map a Locationforecast "compact" payload to hourly WeatherHours from the
 * current hour. Later forecast steps are 6-hourly: each is expanded to its
 * 6 hours so the game always has a value per hour.
 */
export function parseMetno(
  payload: MetnoCompact,
  now: Date,
  hours: number = METNO.hours,
): WeatherHour[] {
  const series = payload.properties?.timeseries;
  if (!Array.isArray(series) || series.length === 0) throw new Error('metno: no timeseries');
  const startMs = Math.floor(now.getTime() / 3_600_000) * 3_600_000;
  const out: WeatherHour[] = [];
  for (let i = 0; i < series.length && out.length < hours; i++) {
    const step = series[i];
    const t = Date.parse(step.time);
    if (!Number.isFinite(t)) continue;
    const temp = step.data?.instant?.details?.air_temperature;
    if (typeof temp !== 'number') continue;
    const one = step.data?.next_1_hours;
    const six = step.data?.next_6_hours;
    const span = one ? 1 : six ? 6 : 1;
    const symbol = one?.summary?.symbol_code ?? six?.summary?.symbol_code;
    const mm =
      (one?.details?.precipitation_amount ?? (six?.details?.precipitation_amount ?? 0) / 6) || 0;
    const nextT = i + 1 < series.length ? Date.parse(series[i + 1].time) : t + span * 3_600_000;
    for (let h = t; h < nextT && h < t + span * 3_600_000 && out.length < hours; h += 3_600_000) {
      if (h < startMs) continue;
      out.push({
        time: new Date(h).toISOString().replace('.000Z', 'Z'),
        tempC: Math.round(temp * 10) / 10,
        condition: symbolToCondition(symbol),
        precipitation: Math.round(Math.min(1, Math.max(0, mm / METNO.precipFullMm)) * 100) / 100,
      });
    }
  }
  return out;
}
