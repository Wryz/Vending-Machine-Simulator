import { metersPerPoint } from '../cameraMatch';

const ZOOMS = [15, 16, 17, 18, 19, 20, 21, 22] as const;

/**
 * `icon-size` stops for the life sprites: always true scale (cars must sit
 * in their lanes), unlike machines which keep a readable minimum size.
 */
export function lifeIconSizeStops(latitude: number, spritePtsPerMeter: number): number[] {
  return ZOOMS.flatMap((z) => [z, 1 / metersPerPoint(z, latitude) / spritePtsPerMeter]);
}

/** `circle-radius` stops (points) for a ground radius in meters. */
export function lifeBeamRadiusStops(latitude: number, radiusM: number): number[] {
  return ZOOMS.flatMap((z) => [z, radiusM / metersPerPoint(z, latitude)]);
}

/**
 * Radius around the camera center where agents live: about one screen height
 * of ground, so the far field at high pitch stays empty (cheap) while the
 * foreground is full.
 */
export function lifeViewRadiusM(zoom: number, latitude: number, screenHeightPt: number): number {
  return Math.min(900, Math.max(140, metersPerPoint(zoom, latitude) * screenHeightPt * 0.85));
}
