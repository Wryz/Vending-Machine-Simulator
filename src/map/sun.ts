import * as SunCalc from 'suncalc';

export interface SunState {
  /** Degrees above the horizon (negative below). */
  altitudeDeg: number;
  /** Compass bearing of the sun in degrees, 0 = north, 90 = east. */
  bearingDeg: number;
  /** True when the sun is climbing (morning side of the day). */
  rising: boolean;
}

const RAD = 180 / Math.PI;
const RISING_PROBE_MS = 10 * 60_000;

/**
 * Sun position for a place and instant. Pure: same inputs, same output.
 * suncalc's azimuth is measured from south, clockwise towards west; we convert
 * to a compass bearing because both MapLibre's light and our 3D rig use it.
 */
export function getSunState(date: Date, lat: number, lng: number): SunState {
  const now = SunCalc.getPosition(date, lat, lng);
  const later = SunCalc.getPosition(new Date(date.getTime() + RISING_PROBE_MS), lat, lng);
  const bearingDeg = (((now.azimuth * RAD + 180) % 360) + 360) % 360;
  return {
    altitudeDeg: now.altitude * RAD,
    bearingDeg,
    rising: later.altitude > now.altitude,
  };
}
