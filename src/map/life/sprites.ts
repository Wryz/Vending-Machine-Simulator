import { LIFE_BUBBLES, LIFE_PEOPLE_MODELS } from '@/config/mapLife';
import { MACHINE_SPRITES } from '@/config/map';

/**
 * Street-life sprite naming and selection (pure). Same conventions as the
 * machine sprites (src/map/machineSprites.ts): heading bucket h is relative to
 * the viewer, 0 = the front faces the camera, 2 = the front faces the
 * viewer's left; p = the camera pitch the sprite was rendered at.
 *
 *   ped-{model}-f{frame}-h{0..7}-p{30|60}-{day|night}
 *   bub-{dots|can|coin}-p{30|60}-{day|night}   (thought bubbles, drawn at
 *     the customer's ground point, the bubble floating above their head)
 *
 * Unlike machines (static, so the bearing offset is injected into the layer
 * expression), people move every frame, so the full image name is computed
 * here per person and the layer just reads `['get', 'i']`.
 */

export type LifeLight = 'day' | 'night';
export type LifePitch = (typeof MACHINE_SPRITES.pitches)[number];

export const LIFE_HEADINGS = MACHINE_SPRITES.headings;
export const LIFE_PITCHES = MACHINE_SPRITES.pitches;
export const LIFE_LIGHTS: readonly LifeLight[] = ['day', 'night'];

const STEP = 360 / LIFE_HEADINGS;
const mod = (n: number, m: number) => ((n % m) + m) % m;

export function personSpriteName(
  model: string,
  frame: number,
  h: number,
  pitch: LifePitch,
  light: LifeLight,
) {
  return `ped-${model}-f${frame}-h${h}-p${pitch}-${light}`;
}

/** Thought-bubble sprite (no heading: it always faces the viewer). */
export function bubbleSpriteName(
  kind: (typeof LIFE_BUBBLES)[number],
  pitch: LifePitch,
  light: LifeLight,
) {
  return `bub-${kind}-p${pitch}-${light}`;
}

/** Every sprite name the life layer can ask for (for completeness checks). */
export function allLifeSpriteNames(frames: number): string[] {
  const names: string[] = [];
  for (const light of LIFE_LIGHTS)
    for (const pitch of LIFE_PITCHES) {
      for (let h = 0; h < LIFE_HEADINGS; h++)
        for (const m of LIFE_PEOPLE_MODELS)
          for (let f = 0; f < frames; f++) names.push(personSpriteName(m, f, h, pitch, light));
      for (const b of LIFE_BUBBLES) names.push(bubbleSpriteName(b, pitch, light));
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
 * Day or night street-life sprites for a time-of-day blend: night sprites
 * from halfway through dusk until halfway through dawn.
 */
export function lifeLightFor(weights: {
  night: number;
  dawn: number;
  day: number;
  dusk: number;
}): LifeLight {
  return weights.night + 0.5 * (weights.dusk + weights.dawn) >= 0.5 ? 'night' : 'day';
}
