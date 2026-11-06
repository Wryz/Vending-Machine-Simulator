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

/** Opacity ramp in as the camera crosses the life zoom band, times the agent's own fade. */
function zoomFade(minZoom: number, endZoom: number, value: unknown): unknown[] {
  return ['interpolate', ['linear'], ['zoom'], minZoom, 0, endZoom, value];
}

/** Layout + paint of the life symbol layer (shared by the app and the preview). */
export function lifeSymbolLayer(
  latitude: number,
  spritePtsPerMeter: number,
  zoomBand: { minZoom: number; fadeInEndZoom: number },
) {
  return {
    filter: ['!=', ['get', 'k'], 2] as unknown[],
    layout: {
      'icon-image': ['get', 'i'],
      'icon-size': [
        'interpolate',
        ['exponential', 2],
        ['zoom'],
        ...lifeIconSizeStops(latitude, spritePtsPerMeter),
      ],
      'icon-rotate': ['get', 'r'],
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

/** Headlight pools (night): soft warm discs on the road, drawn under the cars. */
export function lifeBeamLayer(
  latitude: number,
  beam: { radiusM: number; color: string; opacity: number },
  zoomBand: { minZoom: number; fadeInEndZoom: number },
) {
  return {
    filter: ['==', ['get', 'k'], 2] as unknown[],
    paint: {
      'circle-radius': [
        'interpolate',
        ['exponential', 2],
        ['zoom'],
        ...lifeBeamRadiusStops(latitude, beam.radiusM),
      ],
      'circle-color': beam.color,
      'circle-blur': 1,
      'circle-opacity': zoomFade(zoomBand.minZoom, zoomBand.fadeInEndZoom, [
        '*',
        beam.opacity,
        ['get', 'o'],
      ]),
      'circle-pitch-alignment': 'map',
      'circle-pitch-scale': 'map',
    } as Record<string, unknown>,
  };
}
