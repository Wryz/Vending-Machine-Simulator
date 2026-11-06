import { LIFE_CAR_MODELS, LIFE_PEOPLE_MODELS } from '@/config/mapLife';
import { MACHINE_SPRITES } from '@/config/map';

/**
 * Street-life sprite naming and selection (pure). Same conventions as the
 * machine sprites (src/map/machineSprites.ts): heading bucket h is relative to
 * the viewer, 0 = the front faces the camera, 2 = the front faces the
 * viewer's left; p = the camera pitch the sprite was rendered at.
 *
 *   car-{model}-h{0..7}-p{30|60}-{day|night}
 *   ped-{model}-f{frame}-h{0..7}-p{30|60}-{day|night}
 *
 * Unlike machines (static, so the bearing offset is injected into the layer
 * expression), agents move every frame, so the full image name is computed
 * here per agent and the layer just reads `['get', 'i']`.
 */

export type LifeLight = 'day' | 'night';
export type LifePitch = (typeof MACHINE_SPRITES.pitches)[number];

export const LIFE_HEADINGS = MACHINE_SPRITES.headings;
export const LIFE_PITCHES = MACHINE_SPRITES.pitches;
export const LIFE_LIGHTS: readonly LifeLight[] = ['day', 'night'];

const STEP = 360 / LIFE_HEADINGS;
const mod = (n: number, m: number) => ((n % m) + m) % m;
const DEG = Math.PI / 180;

export function carSpriteName(model: string, h: number, pitch: LifePitch, light: LifeLight) {
  return `car-${model}-h${h}-p${pitch}-${light}`;
}

export function personSpriteName(
  model: string,
  frame: number,
  h: number,
  pitch: LifePitch,
  light: LifeLight,
) {
  return `ped-${model}-f${frame}-h${h}-p${pitch}-${light}`;
}

/** Every sprite name the life layer can ask for (for completeness checks). */
export function allLifeSpriteNames(frames: number): string[] {
  const names: string[] = [];
  for (const light of LIFE_LIGHTS)
    for (const pitch of LIFE_PITCHES)
      for (let h = 0; h < LIFE_HEADINGS; h++) {
        for (const m of LIFE_CAR_MODELS) names.push(carSpriteName(m, h, pitch, light));
        for (const m of LIFE_PEOPLE_MODELS)
          for (let f = 0; f < frames; f++) names.push(personSpriteName(m, f, h, pitch, light));
      }
  return names;
}

/**
 * Exact viewer-relative heading bucket for a compass heading under a map
 * bearing (bucket h shows the front facing world heading bearing + 180 + h·45).
 */
export function lifeHeadingBucket(headingDeg: number, bearingDeg: number): number {
  return mod(Math.round((headingDeg - bearingDeg - 180) / STEP), LIFE_HEADINGS);
}

/** Pitch bucket (closest rendered pitch). */
export function lifePitchBucket(pitchDeg: number): LifePitch {
  let best: LifePitch = LIFE_PITCHES[0];
  for (const p of LIFE_PITCHES) if (Math.abs(p - pitchDeg) < Math.abs(best - pitchDeg)) best = p;
  return best;
}

/**
 * Screen angle (clockwise from "up") of a ground direction `relDeg` degrees
 * clockwise from the camera's forward axis, seen at `pitchDeg` from vertical.
 */
export function screenAngle(relDeg: number, pitchDeg: number): number {
  const r = relDeg * DEG;
  return Math.atan2(Math.sin(r), Math.cos(r) * Math.cos(pitchDeg * DEG)) / DEG;
}

/**
 * `icon-rotate` (viewport-aligned, clockwise degrees) that turns a car sprite
 * rendered at bucket `h` / `spritePitch` so its long axis follows the real
 * heading on screen. With 8 buckets the residual is at most ±22.5° of ground
 * angle, so cars sit along their lane instead of crabbing.
 */
export function residualRotation(
  headingDeg: number,
  bearingDeg: number,
  mapPitchDeg: number,
  h: number,
  spritePitch: LifePitch,
): number {
  const rel = headingDeg - bearingDeg;
  const relBucket = 180 + h * STEP;
  const want = screenAngle(rel, mapPitchDeg);
  const have = screenAngle(relBucket, spritePitch);
  let d = mod(want - have + 180, 360) - 180;
  if (d > 35) d = 35;
  if (d < -35) d = -35;
  return d;
}

/**
 * Day or night street-life sprites for a time-of-day blend: headlights come
 * on halfway through dusk (and stay on until halfway through dawn).
 */
export function lifeLightFor(weights: {
  night: number;
  dawn: number;
  day: number;
  dusk: number;
}): LifeLight {
  return weights.night + 0.5 * (weights.dusk + weights.dawn) >= 0.5 ? 'night' : 'day';
}
