import { GLOBE_LAND } from '@/data/globeLand';

/**
 * Pure globe math (no three.js): land lookup from the baked 2° mask,
 * lat/lng ↔ unit sphere, and the subsolar point for real-time lighting.
 */

let landBits: Uint8Array | null = null;

function decodeBase64(b64: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = b64.replace(/=+$/, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let buf = 0;
  let bits = 0;
  let o = 0;
  for (const ch of clean) {
    buf = (buf << 6) | alphabet.indexOf(ch);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (buf >> bits) & 0xff;
    }
  }
  return out;
}

/** True when the 2° cell containing (lat, lng) is land. */
export function isLand(lat: number, lng: number): boolean {
  landBits ??= decodeBase64(GLOBE_LAND.bits);
  const { stepDeg, rows, cols } = GLOBE_LAND;
  const r = Math.min(rows - 1, Math.max(0, Math.floor((90 - lat) / stepDeg)));
  const wrapped = ((((lng + 180) % 360) + 360) % 360) - 180;
  const c = Math.min(cols - 1, Math.max(0, Math.floor((wrapped + 180) / stepDeg)));
  const i = r * cols + c;
  return ((landBits[i >> 3] >> (i & 7)) & 1) === 1;
}

/**
 * Unit-sphere position of (lat, lng) in three.js axes: +Y is north, lng 0 faces
 * +Z, east is +X.
 */
export function latLngToXYZ(lat: number, lng: number): [number, number, number] {
  const phi = (lat * Math.PI) / 180;
  const lam = (lng * Math.PI) / 180;
  return [Math.cos(phi) * Math.sin(lam), Math.sin(phi), Math.cos(phi) * Math.cos(lam)];
}

export function xyzToLatLng(x: number, y: number, z: number): { lat: number; lng: number } {
  const r = Math.hypot(x, y, z) || 1;
  return {
    lat: (Math.asin(Math.max(-1, Math.min(1, y / r))) * 180) / Math.PI,
    lng: (Math.atan2(x, z) * 180) / Math.PI,
  };
}

/**
 * The point on Earth where the sun is overhead at `date` (±1° is plenty for
 * lighting): declination from the day of year, longitude from UTC time.
 */
export function subsolarPoint(date: Date): { lat: number; lng: number } {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = (date.getTime() - start) / 86_400_000;
  const lat = 23.44 * Math.sin(((2 * Math.PI) / 365.24) * (dayOfYear - 81));
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  let lng = -15 * (utcHours - 12);
  if (lng < -180) lng += 360;
  if (lng > 180) lng -= 360;
  return { lat, lng };
}

/** Globe yaw (degrees about +Y) that turns `lng` to face the camera on +Z. */
export function yawToFace(lng: number): number {
  return -lng;
}
