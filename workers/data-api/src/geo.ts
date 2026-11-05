import { COORD_DECIMALS } from './config';

const EARTH_RADIUS_M = 6_371_008.8;

/** Round to COORD_DECIMALS (~1 km). Normalises -0 to 0. */
export function roundCoord(v: number): number {
  const f = 10 ** COORD_DECIMALS;
  const r = Math.round(v * f) / f;
  return r === 0 ? 0 : r;
}

export function haversineM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = Math.PI / 180;
  const dLat = (bLat - aLat) * toRad;
  const dLng = (bLng - aLng) * toRad;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * toRad) * Math.cos(bLat * toRad) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Parse a query-string number; returns null unless finite and within [min, max]. */
export function parseCoord(raw: string | null, min: number, max: number): number | null {
  if (raw === null || raw.trim() === '') return null;
  const v = Number(raw);
  if (!Number.isFinite(v) || v < min || v > max) return null;
  return v;
}
