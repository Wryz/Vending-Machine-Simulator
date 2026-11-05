import { CLIMATE } from '@/config/climate';
import type { CityId } from '@/config/cities';

import type { WeatherCondition, WeatherHour } from './types';

/** Deterministic hash -> [0,1). */
function noise(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 4294967296;
}

/**
 * Plausible weather from climate normals when live weather is unavailable.
 * Weather "spells" last 6 hours so conditions don't flicker. Pure.
 */
export function syntheticWeather(
  cityId: string,
  t: number,
  localHour: number,
  month: number,
): WeatherHour {
  const c = CLIMATE[cityId as CityId] ?? CLIMATE['new-york'];
  const m = month - 1;
  const spell = Math.floor(t / (6 * 3_600_000));
  const day = Math.floor(t / 86_400_000);
  // Diurnal curve: low at ~05:00, high at ~15:00.
  const phase = Math.cos(((localHour - 15) / 24) * 2 * Math.PI);
  const swing = (noise(`${cityId}|d${day}`) - 0.5) * 6;
  const tempC =
    Math.round(
      ((c.lowC[m] + c.highC[m]) / 2 + ((c.highC[m] - c.lowC[m]) / 2) * phase + swing) * 10,
    ) / 10;
  const r = noise(`${cityId}|s${spell}`);
  let condition: WeatherCondition = 'clear';
  let precipitation = 0;
  if (r < c.rain[m]) {
    condition = tempC <= 0 ? 'snow' : r < c.rain[m] * 0.15 ? 'storm' : 'rain';
    precipitation = 0.3 + noise(`${cityId}|p${spell}`) * 0.7;
  } else if (r < c.rain[m] + 0.3) condition = 'cloudy';
  else if (r > 0.97) condition = 'fog';
  return {
    time: new Date(Math.floor(t / 3_600_000) * 3_600_000).toISOString(),
    tempC,
    condition,
    precipitation,
  };
}

/** Live hourly weather with synthetic fallback. */
export class WeatherBook {
  private hours = new Map<number, WeatherHour>();
  live = false;

  load(hours: readonly WeatherHour[]): void {
    for (const h of hours) this.hours.set(Math.floor(Date.parse(h.time) / 3_600_000), h);
    this.live = hours.length > 0;
  }

  at(t: number): WeatherHour | null {
    return this.hours.get(Math.floor(t / 3_600_000)) ?? null;
  }

  coverageUntil(): number {
    let max = 0;
    for (const k of this.hours.keys()) max = Math.max(max, (k + 1) * 3_600_000);
    return max;
  }
}
