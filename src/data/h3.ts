import './textDecoderShim';
// The shim must run before h3-js initializes.
import { cellToBoundary, cellToLatLng, gridDisk, latLngToCell } from 'h3-js';

export const GAME_RES = 9;

export function cellOf(lat: number, lng: number): string {
  return latLngToCell(lat, lng, GAME_RES);
}

export function neighbors(cellId: string, k: number): string[] {
  try {
    return gridDisk(cellId, k);
  } catch {
    return [cellId];
  }
}

export function cellCenter(cellId: string): { lat: number; lng: number } {
  const [lat, lng] = cellToLatLng(cellId);
  return { lat, lng };
}

/** Polygon ring in GeoJSON order ([lng, lat]), closed. */
export function cellPolygon(cellId: string): [number, number][] {
  const ring = cellToBoundary(cellId, true) as [number, number][];
  return ring;
}
