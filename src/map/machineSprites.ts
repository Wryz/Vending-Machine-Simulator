import type { PresetName } from '@/config/timeOfDay';
import { MACHINE_SPRITES } from '@/config/map';

import { metersPerPoint } from './cameraMatch';

/**
 * Sprite naming + selection for pre-rendered machine sprites (SPEC §7.3).
 *
 * Name format: `machine-{model}-h{0..7}-p{pitch}-{light}`
 *   h = heading bucket *relative to the viewer*: 0 = front faces the camera,
 *       2 = front faces the viewer's left (machine rotated 90° clockwise seen from
 *       above, i.e. facing west when the camera looks north), ...
 *   p = camera pitch the sprite was rendered at (degrees from vertical).
 *
 * MapLibre expressions can't read the camera bearing, so the layer's
 * `icon-image` expression gets the current bearing bucket injected as a
 * literal; it changes only when the camera crosses a 45° boundary.
 */

export type SpriteLight = (typeof MACHINE_SPRITES.lighting)[number];
export type SpritePitch = (typeof MACHINE_SPRITES.pitches)[number];

const H = MACHINE_SPRITES.headings;
const STEP = 360 / H;
const mod = (n: number, m: number) => ((n % m) + m) % m;

export function spriteName(
  model: string,
  heading: number,
  pitch: SpritePitch,
  light: SpriteLight,
): string {
  return `machine-${model}-h${heading}-p${pitch}-${light}`;
}

/** World heading (compass, direction the front faces) -> bucket 0..7. */
export function headingBucket(headingDeg: number): number {
  return mod(Math.round(headingDeg / STEP), H);
}

/** Offset added to a feature's heading bucket for the current map bearing. */
export function bearingOffset(mapBearingDeg: number): number {
  // Front faces the viewer when heading == bearing + 180.
  return mod(-Math.round((mapBearingDeg + 180) / STEP), H);
}

export function relativeHeadingBucket(headingDeg: number, mapBearingDeg: number): number {
  return mod(headingBucket(headingDeg) + bearingOffset(mapBearingDeg), H);
}

export function pitchBucket(mapPitchDeg: number): SpritePitch {
  const pitches = MACHINE_SPRITES.pitches;
  let best: SpritePitch = pitches[0];
  for (const p of pitches) if (Math.abs(p - mapPitchDeg) < Math.abs(best - mapPitchDeg)) best = p;
  return best;
}

export function spriteLightFor(preset: PresetName): SpriteLight {
  if (preset === 'night') return 'night';
  if (preset === 'day') return 'day';
  return 'dusk'; // dawn and dusk share the warm low-sun render
}

/**
 * `icon-image` expression. Features carry `model` (string) and `hb` (heading bucket).
 */
export function iconImageExpression(
  mapBearingDeg: number,
  mapPitchDeg: number,
  light: SpriteLight,
): unknown[] {
  return [
    'concat',
    'machine-',
    ['get', 'model'],
    '-h',
    ['to-string', ['%', ['+', ['get', 'hb'], bearingOffset(mapBearingDeg)], H]],
    `-p${pitchBucket(mapPitchDeg)}-${light}`,
  ];
}

/**
 * `icon-size` stops: true-to-scale once that is big enough to read, otherwise
 * a readable minimum. Sprites are rendered with an orthographic camera at a
 * fixed `spritePtsPerMeter`, so true scale = (1 / metersPerPoint) / spritePtsPerMeter.
 */
export function iconSizeStops(
  latitude: number,
  spritePtsPerMeter: number,
  minIconSize: number,
  zooms: readonly number[] = [12, 14, 16, 17, 18, 19, 20, 21, 22],
): [number, number][] {
  return zooms.map((z) => {
    const trueScale = 1 / metersPerPoint(z, latitude) / spritePtsPerMeter;
    return [z, Math.max(minIconSize, trueScale)];
  });
}
