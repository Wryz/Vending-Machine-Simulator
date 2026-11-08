import { MACHINE_SPRITE } from '@/config/map';

import { metersPerPoint } from '../cameraMatch';
import { SPRITE_PTS_PER_METER } from '../spriteImages';

const ZOOMS = [15, 16, 17, 18, 19, 20, 21, 22] as const;

/**
 * `icon-size` stops for the life sprites: always true scale (people must sit
 * on their sidewalks), unlike machines which keep a readable minimum size.
 */
export function lifeIconSizeStops(latitude: number, spritePtsPerMeter: number): number[] {
  return ZOOMS.flatMap((z) => [z, 1 / metersPerPoint(z, latitude) / spritePtsPerMeter]);
}

/**
 * How much bigger than true scale machines are drawn at `zoom` (their sprite
 * keeps a readable minimum size, MACHINE_SPRITE.minIconSize). People visiting a
 * machine are drawn at the same enlargement so they stay in proportion to it.
 */
export function visitorScale(zoom: number, latitude: number): number {
  const machineTrue = 1 / metersPerPoint(zoom, latitude) / SPRITE_PTS_PER_METER;
  return Math.max(1, MACHINE_SPRITE.minIconSize / machineTrue);
}

/** `icon-size` stops for machine visitors: true scale times the machine's enlargement. */
export function visitorIconSizeStops(latitude: number, spritePtsPerMeter: number): number[] {
  return ZOOMS.flatMap((z) => [
    z,
    (1 / metersPerPoint(z, latitude) / spritePtsPerMeter) * visitorScale(z, latitude),
  ]);
}

/**
 * Radius around the camera center where agents live: about one screen height
 * of ground, so the far field at high pitch stays empty (cheap) while the
 * foreground is full.
 */
export function lifeViewRadiusM(zoom: number, latitude: number, screenHeightPt: number): number {
  return Math.min(900, Math.max(140, metersPerPoint(zoom, latitude) * screenHeightPt * 0.85));
}

/** Opacity ramp in as the camera crosses the life zoom band, times the agent's own fade. */
function zoomFade(minZoom: number, endZoom: number, value: unknown): unknown[] {
  return ['interpolate', ['linear'], ['zoom'], minZoom, 0, endZoom, value];
}

/** Layout + paint of the life symbol layer (shared by the app and the preview). */
export function lifeSymbolLayer(
  latitude: number,
  spritePtsPerMeter: number,
  zoomBand: { minZoom: number; fadeInEndZoom: number },
  /** Machine visitors: drawn at the machine's enlargement (their own layer, over buildings). */
  visitors = false,
) {
  return {
    layout: {
      'icon-image': ['get', 'i'],
      'icon-size': [
        'interpolate',
        ['exponential', 2],
        ['zoom'],
        ...(visitors
          ? visitorIconSizeStops(latitude, spritePtsPerMeter)
          : lifeIconSizeStops(latitude, spritePtsPerMeter)),
      ],
      'icon-anchor': 'center',
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'icon-pitch-alignment': 'viewport',
      'icon-rotation-alignment': 'viewport',
      'symbol-z-order': 'viewport-y',
    } as Record<string, unknown>,
    paint: {
      'icon-opacity': zoomFade(zoomBand.minZoom, zoomBand.fadeInEndZoom, ['get', 'o']),
    } as Record<string, unknown>,
  };
}
