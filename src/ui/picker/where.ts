import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

import { FALLBACK_CITIES, LOCATION_TIMEOUT_MS } from '@/config/cities';
import { kmBetween, type PickerCity } from '@/data/cityIndex';
import type { CityIndexEntry } from '@/data/types';
import type { CityInfo } from '@/store/profile';

/** Round to ~1 km before the point is used anywhere (SPEC §6.6, §11). */
const coarse = (n: number) => Math.round(n * 100) / 100;

function timeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

/**
 * Your approximate location for the picker. Asked only when you tap "Use my
 * location"; if you allowed it before, it's read quietly on open. Rounded to
 * ~1 km on the device, never stored or sent anywhere by the picker.
 */
export function useYou(): {
  you: { lat: number; lng: number } | null;
  locate: () => Promise<'ok' | 'denied' | 'failed'>;
} {
  const [you, setYou] = useState<{ lat: number; lng: number } | null>(null);
  const read = useCallback(async () => {
    const pos =
      (await Location.getLastKnownPositionAsync({ maxAge: 30 * 60_000 })) ??
      (await timeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest }),
        LOCATION_TIMEOUT_MS,
      ));
    setYou({ lat: coarse(pos.coords.latitude), lng: coarse(pos.coords.longitude) });
  }, []);
  useEffect(() => {
    void Location.getForegroundPermissionsAsync()
      .then((p) => (p.granted ? read() : undefined))
      .catch(() => undefined);
  }, [read]);
  const locate = useCallback(async () => {
    try {
      let perm = await Location.getForegroundPermissionsAsync();
      if (!perm.granted && perm.canAskAgain) perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) return 'denied' as const;
      await read();
      return 'ok' as const;
    } catch {
      return 'failed' as const;
    }
  }, [read]);
  return { you, locate };
}

/**
 * Where the globe starts before you share a location: the biggest city in
 * your phone's time zone, else a point on your time zone's meridian.
 */
export function guessOrigin(index: readonly CityIndexEntry[]): { lat: number; lng: number } {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  let best: CityIndexEntry | null = null;
  for (const e of index) if (e.z === tz && !e.d && (!best || e.p > best.p)) best = e;
  if (best) return { lat: best.a, lng: best.o };
  const known = FALLBACK_CITIES.find((c) => c.timeZone === tz);
  if (known) return { lat: known.lat, lng: known.lng };
  return { lat: 25, lng: -new Date().getTimezoneOffset() / 4 };
}

/** The phone's country (for money) when a city doesn't know its own. */
export function deviceCountry(): string {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale;
  const m = /-([A-Z]{2})\b/.exec(locale);
  return m ? m[1] : 'US';
}

/** The game's city record for a picked city or outer district. */
export function cityInfoFromPick(c: PickerCity | CityIndexEntry, name: string): CityInfo {
  return {
    id: `area-${c.r}`,
    name,
    lat: c.a,
    lng: c.o,
    timeZone: c.z || Intl.DateTimeFormat().resolvedOptions().timeZone,
    countryCode: c.c || deviceCountry(),
    kind: 'area',
    res5: c.r,
  };
}

/**
 * Saves from before regions (the former built-in nine) shown on the region
 * that covers the same city: picking that card reopens the old save.
 */
export function legacySavesByRegion(
  index: readonly CityIndexEntry[],
  saved: readonly CityInfo[],
): Record<string, CityInfo> {
  const out: Record<string, CityInfo> = {};
  for (const s of saved) {
    if (s.kind !== 'fallback') continue;
    let best: CityIndexEntry | null = null;
    let bestKm = 30;
    for (const e of index) {
      if (e.d) continue;
      const km = kmBetween(s, { lat: e.a, lng: e.o });
      if (km < bestKm) {
        best = e;
        bestKm = km;
      }
    }
    if (best) out[best.r] = s;
  }
  return out;
}
