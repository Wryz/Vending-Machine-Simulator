import { PRESETS, SUN_ALTITUDE_KEYPOINTS, type Palette, type PresetName } from '@/config/timeOfDay';

import { getSunState, type SunState } from './sun';

export type PresetWeights = Record<PresetName, number>;

export interface TimeOfDay {
  sun: SunState;
  weights: PresetWeights;
  /** The preset with the highest weight (handy for sprite lighting and labels). */
  dominant: PresetName;
  palette: Palette;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/**
 * Blend weights over the four presets from the sun's altitude. At most two
 * presets are non-zero at once and the weights always sum to 1.
 */
export function presetWeights(sun: SunState): PresetWeights {
  const { nightBelow, twilightPeak, dayAbove } = SUN_ALTITUDE_KEYPOINTS;
  const twilight: PresetName = sun.rising ? 'dawn' : 'dusk';
  const w: PresetWeights = { night: 0, dawn: 0, day: 0, dusk: 0 };
  const a = sun.altitudeDeg;

  if (a <= nightBelow) {
    w.night = 1;
  } else if (a < twilightPeak) {
    const t = clamp01((a - nightBelow) / (twilightPeak - nightBelow));
    w.night = 1 - t;
    w[twilight] = t;
  } else if (a < dayAbove) {
    const t = clamp01((a - twilightPeak) / (dayAbove - twilightPeak));
    w[twilight] = 1 - t;
    w.day = t;
  } else {
    w.day = 1;
  }
  return w;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const to = (v: number) =>
    Math.round(Math.min(255, Math.max(0, v)))
      .toString(16)
      .padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

/** Weighted blend of any hex colors. */
export function mixColors(entries: readonly (readonly [string, number])[]): string {
  const acc: [number, number, number] = [0, 0, 0];
  let total = 0;
  for (const [hex, w] of entries) {
    if (w <= 0) continue;
    const [r, g, b] = hexToRgb(hex);
    acc[0] += r * w;
    acc[1] += g * w;
    acc[2] += b * w;
    total += w;
  }
  if (total === 0) throw new Error('mixColors: all weights are zero');
  return rgbToHex([acc[0] / total, acc[1] / total, acc[2] / total]);
}

const PRESET_NAMES: readonly PresetName[] = ['night', 'dawn', 'day', 'dusk'];

export function blendPalettes(weights: PresetWeights): Palette {
  const keys = Object.keys(PRESETS.day) as (keyof Palette)[];
  const out = {} as Record<keyof Palette, string | number>;
  for (const key of keys) {
    const sample = PRESETS.day[key];
    if (typeof sample === 'number') {
      out[key] = PRESET_NAMES.reduce((sum, p) => sum + (PRESETS[p][key] as number) * weights[p], 0);
    } else {
      out[key] = mixColors(
        PRESET_NAMES.map((p) => [PRESETS[p][key] as string, weights[p]] as const),
      );
    }
  }
  return out as unknown as Palette;
}

export function getTimeOfDay(date: Date, lat: number, lng: number): TimeOfDay {
  const sun = getSunState(date, lat, lng);
  const weights = presetWeights(sun);
  const dominant = PRESET_NAMES.reduce(
    (best, p) => (weights[p] > weights[best] ? p : best),
    'night' as PresetName,
  );
  return { sun, weights, dominant, palette: blendPalettes(weights) };
}

/**
 * Local wall-clock string for a city, e.g. "21:04". Uses Intl (available on
 * Hermes with the Intl build that Expo ships).
 */
export function formatCityTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}
