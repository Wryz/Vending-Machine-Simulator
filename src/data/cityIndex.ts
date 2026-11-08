import { PICKER } from '@/config/picker';

import type { CityIndexEntry } from './types';

/**
 * The picker's city list (pipeline/build-index.ts): every playable city and
 * outer district. Pure helpers here; loading lives in cityIndexStore.ts.
 */

export interface PickerCity extends CityIndexEntry {
  /** Kilometres from the origin (you, or the city you're in). */
  km: number;
}

const R_KM = 6371;
export function kmBetween(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

const at = (e: CityIndexEntry) => ({ lat: e.a, lng: e.o });

/**
 * The bottom strip: everything near you first (cities and outer districts,
 * any size), then only the big cities further away; nearest first throughout.
 */
export function stripCities(
  index: readonly CityIndexEntry[],
  origin: { lat: number; lng: number },
): PickerCity[] {
  const withKm = index.map((e) => ({ ...e, km: kmBetween(origin, at(e)) }));
  const local = withKm.filter((e) => e.km <= PICKER.localKm);
  const far = withKm.filter((e) => e.km > PICKER.localKm && !e.d && e.p >= PICKER.majorPopulation);
  const byKm = (a: PickerCity, b: PickerCity) => a.km - b.km || a.r.localeCompare(b.r);
  return [...local.sort(byKm), ...far.sort(byKm)].slice(0, PICKER.maxCards);
}

/** The city or district the crosshair would start, if one is close enough. */
export function cityAt(
  index: readonly CityIndexEntry[],
  point: { lat: number; lng: number },
): PickerCity | null {
  let best: PickerCity | null = null;
  for (const e of index) {
    const km = kmBetween(point, at(e));
    if (km <= PICKER.snapKm && (!best || km < best.km)) best = { ...e, km };
  }
  return best;
}

/** The closest city of all to a point (for "nothing here yet: nearest is …"). */
export function nearestCity(
  index: readonly CityIndexEntry[],
  point: { lat: number; lng: number },
): PickerCity | null {
  let best: PickerCity | null = null;
  for (const e of index) {
    if (e.d) continue;
    const km = kmBetween(point, at(e));
    if (!best || km < best.km) best = { ...e, km };
  }
  return best;
}

/** Regional-indicator flag emoji for a country code ('' → none). */
export function flagOf(cc: string): string {
  if (!/^[A-Z]{2}$/.test(cc)) return '';
  return String.fromCodePoint(...[...cc].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}
