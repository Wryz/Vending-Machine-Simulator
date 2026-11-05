import * as SunCalc from 'suncalc';

export interface SunState {
  /** Degrees above the horizon (negative below). */
  altitudeDeg: number;
  /** Compass bearing of the sun in degrees, 0 = north, 90 = east. */
  bearingDeg: number;
  /** True when the sun is climbing (morning side of the day). */
  rising: boolean;
}

const RISING_PROBE_MS = 10 * 60_000;

/**
 * Sun position for a place and instant. Pure: same inputs, same output.
 * suncalc 2.x returns degrees, with azimuth measured clockwise from north
 * (already a compass bearing). 1.x used radians from south — don't mix them up.
 */
export function getSunState(date: Date, lat: number, lng: number): SunState {
  const now = SunCalc.getPosition(date, lat, lng);
  const later = SunCalc.getPosition(new Date(date.getTime() + RISING_PROBE_MS), lat, lng);
  return {
    altitudeDeg: now.altitude,
    bearingDeg: ((now.azimuth % 360) + 360) % 360,
    rising: later.altitude > now.altitude,
  };
}
